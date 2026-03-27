import fs from "fs";
import path from "path";
import { PATHOGEN_PLAN_BY_ID, applyTierDifficultyFloor } from "../data/pathogen-generation-plan";
import { ORGANISM_MAP } from "./organisms";
import { normalizeCaseAnswers } from "./caseAnswers";
import { getDailyCase, getExpiredDailyCases } from "./dailyCase";
import { dedupeCasesById } from "./generatedCases";
import type {
  CaseReveal,
  MicrobleCase,
  PathogenKind,
  PublicMicrobleCase,
} from "./types";

export type CasePool = "daily" | "freeplay" | "legacy_daily";

export interface StoredCaseRecord {
  id: string;
  pathogenId: string;
  pool: CasePool;
  acceptedOrganismIds?: string[];
  hints: MicrobleCase["hints"];
  difficulty: MicrobleCase["difficulty"];
  explanation: string;
  source: MicrobleCase["source"];
  validated: boolean;
  createdAt: string;
  pathogenKind?: PathogenKind;
  model?: string;
  style?: string;
  sortOrder: number;
}

export interface InsertableCaseRecord {
  id: string;
  pathogenId: string;
  acceptedOrganismIds?: string[];
  hints: MicrobleCase["hints"];
  difficulty: MicrobleCase["difficulty"];
  explanation: string;
  source: MicrobleCase["source"];
  validated: boolean;
  createdAt: string;
  pathogenKind?: PathogenKind;
  model?: string;
  style?: string;
}

type GeneratedJsonCase = InsertableCaseRecord & {
  pool?: CasePool;
};

const JSON_FILES = {
  legacyDaily: path.join(process.cwd(), "data", "legacy-daily-cases.json"),
  daily: path.join(process.cwd(), "data", "daily-cases.json"),
  generatedDaily: path.join(process.cwd(), "data", "generated-daily-pathogen-cases.json"),
  generatedFreeplay: path.join(
    process.cwd(),
    "data",
    "generated-freeplay-pathogen-cases.json"
  ),
} as const;

function loadJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeStoredRecord(record: StoredCaseRecord): StoredCaseRecord {
  const normalizedAnswers = normalizeCaseAnswers({
    organismId: record.pathogenId,
    acceptedOrganismIds: record.acceptedOrganismIds,
    hints: record.hints,
    explanation: record.explanation,
  });

  const pathogen = PATHOGEN_PLAN_BY_ID.get(normalizedAnswers.organismId);
  const difficulty =
    record.source === "ai_generated" && pathogen
      ? applyTierDifficultyFloor(pathogen.tier, record.difficulty)
      : record.difficulty;

  return {
    ...record,
    pathogenId: normalizedAnswers.organismId,
    acceptedOrganismIds: normalizedAnswers.acceptedOrganismIds,
    difficulty,
  };
}

function fromMicrobleCase(
  caseData: MicrobleCase,
  pool: CasePool,
  sortOrder: number
): StoredCaseRecord {
  return normalizeStoredRecord({
    id: caseData.id,
    pathogenId: caseData.organismId,
    pool,
    acceptedOrganismIds: caseData.acceptedOrganismIds,
    hints: caseData.hints,
    difficulty: caseData.difficulty,
    explanation: caseData.explanation,
    source: caseData.source,
    validated: caseData.validated,
    createdAt: caseData.createdAt,
    sortOrder,
  });
}

function fromGeneratedJsonCase(
  caseData: GeneratedJsonCase,
  pool: Extract<CasePool, "daily" | "freeplay">,
  sortOrder: number
): StoredCaseRecord | null {
  if (!ORGANISM_MAP.has(caseData.pathogenId)) {
    return null;
  }

  if (!Array.isArray(caseData.hints) || caseData.hints.length !== 5) {
    return null;
  }

  return normalizeStoredRecord({
    id: caseData.id,
    pathogenId: caseData.pathogenId,
    pool,
    acceptedOrganismIds: caseData.acceptedOrganismIds,
    hints: caseData.hints as MicrobleCase["hints"],
    difficulty: caseData.difficulty,
    explanation: caseData.explanation,
    source: caseData.source,
    validated: caseData.validated,
    createdAt: caseData.createdAt,
    pathogenKind: caseData.pathogenKind,
    model: caseData.model,
    style: caseData.style,
    sortOrder,
  });
}

function loadLegacyDailyRecords(): StoredCaseRecord[] {
  return loadJsonFile<MicrobleCase>(JSON_FILES.legacyDaily).map((caseData, index) =>
    fromMicrobleCase(caseData, "legacy_daily", index)
  );
}

function loadCuratedDailyRecords(): StoredCaseRecord[] {
  return loadJsonFile<MicrobleCase>(JSON_FILES.daily).map((caseData, index) =>
    fromMicrobleCase(caseData, "daily", index)
  );
}

function loadGeneratedPoolRecords(
  pool: Extract<CasePool, "daily" | "freeplay">
): StoredCaseRecord[] {
  const filePath = pool === "daily" ? JSON_FILES.generatedDaily : JSON_FILES.generatedFreeplay;
  return loadJsonFile<GeneratedJsonCase>(filePath)
    .map((caseData, index) => fromGeneratedJsonCase(caseData, pool, index))
    .filter((record): record is StoredCaseRecord => !!record);
}

function toMicrobleCase(record: StoredCaseRecord): MicrobleCase {
  return {
    id: record.id,
    organismId: record.pathogenId,
    acceptedOrganismIds: record.acceptedOrganismIds,
    hints: record.hints,
    difficulty: record.difficulty,
    explanation: record.explanation,
    source: record.source,
    validated: record.validated,
    createdAt: record.createdAt,
  };
}

function toPublicMicrobleCase(caseData: MicrobleCase): PublicMicrobleCase {
  return {
    id: caseData.id,
    hints: caseData.hints,
    difficulty: caseData.difficulty,
    source: caseData.source,
    validated: caseData.validated,
    createdAt: caseData.createdAt,
  };
}

function getGeneratedFilePath(pool: Extract<CasePool, "daily" | "freeplay">): string {
  return pool === "daily" ? JSON_FILES.generatedDaily : JSON_FILES.generatedFreeplay;
}

function writeGeneratedPoolRecords(
  pool: Extract<CasePool, "daily" | "freeplay">,
  records: StoredCaseRecord[]
): void {
  const filePath = getGeneratedFilePath(pool);
  ensureParentDir(filePath);

  const payload = records
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
    .map((record) => ({
      id: record.id,
      pathogenId: record.pathogenId,
      acceptedOrganismIds: record.acceptedOrganismIds,
      pathogenKind: record.pathogenKind,
      pool,
      hints: record.hints,
      difficulty: record.difficulty,
      explanation: record.explanation,
      source: record.source,
      validated: record.validated,
      createdAt: record.createdAt,
      style: record.style,
      model: record.model,
    }));

  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function getUtcDayStart(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function filterCasesVisibleAtDayStart(
  cases: MicrobleCase[],
  now = new Date()
): MicrobleCase[] {
  const dayStart = getUtcDayStart(now);
  return cases.filter((caseData) => {
    const createdAt = Date.parse(caseData.createdAt);
    return Number.isFinite(createdAt) && createdAt < dayStart;
  });
}

function loadRuntimeGeneratedDailyCases(): MicrobleCase[] {
  return loadGeneratedPoolRecords("daily").map(toMicrobleCase);
}

function loadRuntimeCuratedDailyCases(): MicrobleCase[] {
  return loadCuratedDailyRecords().map(toMicrobleCase);
}

function loadRuntimeLegacyDailyCases(): MicrobleCase[] {
  return loadLegacyDailyRecords().map(toMicrobleCase);
}

function loadRuntimeGeneratedFreeplayCases(): MicrobleCase[] {
  return loadGeneratedPoolRecords("freeplay").map(toMicrobleCase);
}

function getPrimaryDailyPool(now = new Date()): MicrobleCase[] {
  const visibleGeneratedDaily = filterCasesVisibleAtDayStart(
    loadRuntimeGeneratedDailyCases(),
    now
  );
  if (visibleGeneratedDaily.length > 0) return visibleGeneratedDaily;

  const visibleCuratedDaily = filterCasesVisibleAtDayStart(
    loadRuntimeCuratedDailyCases(),
    now
  );
  if (visibleCuratedDaily.length > 0) return visibleCuratedDaily;

  return loadRuntimeLegacyDailyCases();
}

function getPrimaryFreeplayPool(activeDailyPool: MicrobleCase[]): MicrobleCase[] {
  const generatedFreeplay = loadRuntimeGeneratedFreeplayCases();
  const expiredDaily = getExpiredDailyCases(activeDailyPool);

  if (generatedFreeplay.length > 0 || expiredDaily.length > 0) {
    return dedupeCasesById([...generatedFreeplay, ...expiredDaily]);
  }

  return loadRuntimeLegacyDailyCases();
}

function getAllRuntimeCases(now = new Date()): MicrobleCase[] {
  return dedupeCasesById([
    ...loadRuntimeGeneratedDailyCases(),
    ...loadRuntimeCuratedDailyCases(),
    ...loadRuntimeLegacyDailyCases(),
    ...loadRuntimeGeneratedFreeplayCases(),
    ...getExpiredDailyCases(getPrimaryDailyPool(now)),
  ]);
}

export function getCaseStorePath(): string {
  return path.join(process.cwd(), "data");
}

export function listStoredCasesByPool(pool: CasePool): StoredCaseRecord[] {
  switch (pool) {
    case "daily":
      return loadGeneratedPoolRecords("daily");
    case "freeplay":
      return loadGeneratedPoolRecords("freeplay");
    case "legacy_daily":
      return loadLegacyDailyRecords();
  }
}

export function upsertCases(pool: CasePool, cases: InsertableCaseRecord[]): void {
  if (pool === "legacy_daily") {
    throw new Error("Legacy daily cases are read-only.");
  }

  const existingRows = listStoredCasesByPool(pool);
  const sortOrderById = new Map(existingRows.map((row) => [row.id, row.sortOrder]));
  let nextSortOrder =
    existingRows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  const merged = cases.map((record) => {
    const existingSortOrder = sortOrderById.get(record.id);
    return normalizeStoredRecord({
      id: record.id,
      pathogenId: record.pathogenId,
      pool,
      acceptedOrganismIds: record.acceptedOrganismIds,
      hints: record.hints,
      difficulty: record.difficulty,
      explanation: record.explanation,
      source: record.source,
      validated: record.validated,
      createdAt: record.createdAt,
      pathogenKind: record.pathogenKind,
      model: record.model,
      style: record.style,
      sortOrder: existingSortOrder ?? nextSortOrder++,
    });
  });

  writeGeneratedPoolRecords(pool, merged);
}

export function getDailyRuntimeCases(): PublicMicrobleCase[] {
  return getPrimaryDailyPool().map(toPublicMicrobleCase);
}

export function getCurrentDailyCase(): MicrobleCase {
  const dailyCases = getPrimaryDailyPool();
  const fallbackCases = getPrimaryFreeplayPool(dailyCases);
  return getDailyCase(dailyCases, fallbackCases);
}

export function getPublicCurrentDailyCase(): PublicMicrobleCase {
  return toPublicMicrobleCase(getCurrentDailyCase());
}

export function getFreeplayRuntimeCases(): MicrobleCase[] {
  const dailyCases = getPrimaryDailyPool();
  const freeplayCases = getPrimaryFreeplayPool(dailyCases);

  if (freeplayCases.length === 0) return [];

  const currentDailyCase = getDailyCase(dailyCases, freeplayCases);
  const filtered = freeplayCases.filter((caseData) => caseData.id !== currentDailyCase.id);
  return filtered.length > 0 ? filtered : freeplayCases;
}

export function getCaseById(caseId: string): MicrobleCase | null {
  return getAllRuntimeCases().find((caseData) => caseData.id === caseId) ?? null;
}

export function getCaseReveal(caseId: string): CaseReveal | null {
  const caseData = getCaseById(caseId);
  if (!caseData) return null;

  const organism = ORGANISM_MAP.get(caseData.organismId);
  if (!organism) return null;

  return {
    organism,
    explanation: caseData.explanation,
  };
}

export function toPublicCase(caseData: MicrobleCase): PublicMicrobleCase {
  return toPublicMicrobleCase(caseData);
}

export const __testing = {
  filterCasesVisibleAtDayStart,
};
