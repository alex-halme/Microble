import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { PATHOGEN_PLAN_BY_ID, applyTierDifficultyFloor } from "../data/pathogen-generation-plan";
import { normalizeCaseAnswers } from "./caseAnswers";
import { getDailyCase, getExpiredDailyCases } from "./dailyCase";
import { dedupeCasesById, normalizeGeneratedPathogenCases } from "./generatedCases";
import type { MicrobleCase, PathogenKind } from "./types";

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

interface StoredCaseRow {
  id: string;
  pathogen_id: string;
  pool: CasePool;
  accepted_organism_ids_json: string | null;
  hints_json: string;
  difficulty: MicrobleCase["difficulty"];
  explanation: string;
  source: MicrobleCase["source"];
  validated: number;
  created_at: string;
  pathogen_kind: PathogenKind | null;
  model: string | null;
  style: string | null;
  sort_order: number;
}

const DB_PATH = path.join(process.cwd(), "data", "microble.db");
const JSON_SEED_FILES = {
  legacyDaily: path.join(process.cwd(), "data", "legacy-daily-cases.json"),
  daily: path.join(process.cwd(), "data", "daily-cases.json"),
  generatedDaily: path.join(process.cwd(), "data", "generated-daily-pathogen-cases.json"),
  generatedFreeplay: path.join(
    process.cwd(),
    "data",
    "generated-freeplay-pathogen-cases.json"
  ),
} as const;

let cachedDb: Database.Database | null = null;

function loadJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
}

function toStoredCaseRecord(row: StoredCaseRow): StoredCaseRecord {
  return {
    id: row.id,
    pathogenId: row.pathogen_id,
    pool: row.pool,
    acceptedOrganismIds: row.accepted_organism_ids_json
      ? (JSON.parse(row.accepted_organism_ids_json) as string[])
      : undefined,
    hints: JSON.parse(row.hints_json) as MicrobleCase["hints"],
    difficulty: row.difficulty,
    explanation: row.explanation,
    source: row.source,
    validated: Boolean(row.validated),
    createdAt: row.created_at,
    pathogenKind: row.pathogen_kind ?? undefined,
    model: row.model ?? undefined,
    style: row.style ?? undefined,
    sortOrder: row.sort_order,
  };
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

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      pathogen_id TEXT NOT NULL,
      pool TEXT NOT NULL CHECK (pool IN ('daily', 'freeplay', 'legacy_daily')),
      accepted_organism_ids_json TEXT,
      hints_json TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      explanation TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('handcrafted', 'ai_generated')),
      validated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      pathogen_kind TEXT,
      model TEXT,
      style TEXT,
      sort_order INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cases_pool_sort
      ON cases(pool, sort_order);
    CREATE INDEX IF NOT EXISTS idx_cases_pathogen_pool
      ON cases(pathogen_id, pool);
  `);

  const columns = db
    .prepare("PRAGMA table_info(cases)")
    .all() as Array<{ name: string }>;
  const hasAcceptedIdsColumn = columns.some(
    (column) => column.name === "accepted_organism_ids_json"
  );

  if (!hasAcceptedIdsColumn) {
    db.exec("ALTER TABLE cases ADD COLUMN accepted_organism_ids_json TEXT");
  }
}

function normalizeStoredCaseDifficulties(db: Database.Database): void {
  const rows = db
    .prepare(
      `
        SELECT id, pathogen_id, difficulty, source
        FROM cases
        WHERE source = 'ai_generated'
      `
    )
    .all() as Array<{
    id: string;
    pathogen_id: string;
    difficulty: MicrobleCase["difficulty"];
    source: MicrobleCase["source"];
  }>;

  const updates = rows
    .map((row) => {
      const pathogen = PATHOGEN_PLAN_BY_ID.get(row.pathogen_id);
      if (!pathogen) return null;

      const normalizedDifficulty = applyTierDifficultyFloor(
        pathogen.tier,
        row.difficulty
      );

      if (normalizedDifficulty === row.difficulty) return null;
      return { id: row.id, difficulty: normalizedDifficulty };
    })
    .filter(Boolean) as Array<{ id: string; difficulty: MicrobleCase["difficulty"] }>;

  if (updates.length === 0) return;

  const update = db.prepare("UPDATE cases SET difficulty = ? WHERE id = ?");
  const transaction = db.transaction(
    (records: Array<{ id: string; difficulty: MicrobleCase["difficulty"] }>) => {
      for (const record of records) {
        update.run(record.difficulty, record.id);
      }
    }
  );

  transaction(updates);
}

function normalizeStoredCaseAnswers(db: Database.Database): void {
  const rows = db
    .prepare(
      `
        SELECT id, pathogen_id, accepted_organism_ids_json, hints_json, explanation
        FROM cases
      `
    )
    .all() as Array<{
    id: string;
    pathogen_id: string;
    accepted_organism_ids_json: string | null;
    hints_json: string;
    explanation: string;
  }>;

  const updates = rows
    .map((row) => {
      const normalized = normalizeCaseAnswers({
        organismId: row.pathogen_id,
        acceptedOrganismIds: row.accepted_organism_ids_json
          ? (JSON.parse(row.accepted_organism_ids_json) as string[])
          : undefined,
        hints: JSON.parse(row.hints_json) as MicrobleCase["hints"],
        explanation: row.explanation,
      });

      const existingAccepted = row.accepted_organism_ids_json
        ? JSON.stringify(JSON.parse(row.accepted_organism_ids_json))
        : null;
      const nextAccepted = normalized.acceptedOrganismIds
        ? JSON.stringify(normalized.acceptedOrganismIds)
        : null;

      if (
        normalized.organismId === row.pathogen_id &&
        existingAccepted === nextAccepted
      ) {
        return null;
      }

      return {
        id: row.id,
        pathogenId: normalized.organismId,
        acceptedOrganismIdsJson: nextAccepted,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    pathogenId: string;
    acceptedOrganismIdsJson: string | null;
  }>;

  if (updates.length === 0) return;

  const update = db.prepare(
    `
      UPDATE cases
      SET pathogen_id = ?, accepted_organism_ids_json = ?
      WHERE id = ?
    `
  );
  const transaction = db.transaction(
    (
      records: Array<{
        id: string;
        pathogenId: string;
        acceptedOrganismIdsJson: string | null;
      }>
    ) => {
      for (const record of records) {
        update.run(record.pathogenId, record.acceptedOrganismIdsJson, record.id);
      }
    }
  );

  transaction(updates);
}

function seedFromJsonIfEmpty(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) AS count FROM cases").get() as {
    count: number;
  };
  if (count.count > 0) return;

  const legacyDaily = loadJsonFile<MicrobleCase>(JSON_SEED_FILES.legacyDaily).map(
    (caseData, index) => ({
      id: caseData.id,
      pathogenId: caseData.organismId,
      pool: "legacy_daily" as const,
      acceptedOrganismIds: caseData.acceptedOrganismIds,
      hints: caseData.hints,
      difficulty: caseData.difficulty,
      explanation: caseData.explanation,
      source: caseData.source,
      validated: caseData.validated,
      createdAt: caseData.createdAt,
      sortOrder: index,
    })
  );

  const dailySeed = loadJsonFile<MicrobleCase>(JSON_SEED_FILES.daily).map(
    (caseData, index) => ({
      id: caseData.id,
      pathogenId: caseData.organismId,
      pool: "daily" as const,
      acceptedOrganismIds: caseData.acceptedOrganismIds,
      hints: caseData.hints,
      difficulty: caseData.difficulty,
      explanation: caseData.explanation,
      source: caseData.source,
      validated: caseData.validated,
      createdAt: caseData.createdAt,
      sortOrder: index,
    })
  );

  const generatedDaily = normalizeGeneratedPathogenCases(
    loadJsonFile<
      InsertableCaseRecord & { pathogenId: string }
    >(JSON_SEED_FILES.generatedDaily)
  ).map((caseData, index) => ({
    id: caseData.id,
    pathogenId: caseData.organismId,
    pool: "daily" as const,
    acceptedOrganismIds: caseData.acceptedOrganismIds,
    hints: caseData.hints,
    difficulty: caseData.difficulty,
    explanation: caseData.explanation,
    source: caseData.source,
    validated: caseData.validated,
    createdAt: caseData.createdAt,
    sortOrder: dailySeed.length + index,
  }));

  const generatedFreeplay = normalizeGeneratedPathogenCases(
    loadJsonFile<
      InsertableCaseRecord & { pathogenId: string }
    >(JSON_SEED_FILES.generatedFreeplay)
  ).map((caseData, index) => ({
    id: caseData.id,
    pathogenId: caseData.organismId,
    pool: "freeplay" as const,
    acceptedOrganismIds: caseData.acceptedOrganismIds,
    hints: caseData.hints,
    difficulty: caseData.difficulty,
    explanation: caseData.explanation,
    source: caseData.source,
    validated: caseData.validated,
    createdAt: caseData.createdAt,
    sortOrder: index,
  }));

  const insert = db.prepare(`
    INSERT INTO cases (
      id, pathogen_id, pool, hints_json, difficulty, explanation, source,
      validated, created_at, pathogen_kind, model, style, sort_order, accepted_organism_ids_json
    ) VALUES (
      @id, @pathogen_id, @pool, @hints_json, @difficulty, @explanation, @source,
      @validated, @created_at, @pathogen_kind, @model, @style, @sort_order, @accepted_organism_ids_json
    )
  `);

  const seedCases = [...legacyDaily, ...dailySeed, ...generatedDaily, ...generatedFreeplay];
  const transaction = db.transaction((records: typeof seedCases) => {
    for (const record of records) {
      insert.run({
        id: record.id,
        pathogen_id: record.pathogenId,
        pool: record.pool,
        accepted_organism_ids_json: record.acceptedOrganismIds
          ? JSON.stringify(record.acceptedOrganismIds)
          : null,
        hints_json: JSON.stringify(record.hints),
        difficulty: record.difficulty,
        explanation: record.explanation,
        source: record.source,
        validated: record.validated ? 1 : 0,
        created_at: record.createdAt,
        pathogen_kind: null,
        model: null,
        style: null,
        sort_order: record.sortOrder,
      });
    }
  });

  transaction(seedCases);
}

function getDb(): Database.Database {
  if (cachedDb) return cachedDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  ensureSchema(db);
  seedFromJsonIfEmpty(db);
  normalizeStoredCaseAnswers(db);
  normalizeStoredCaseDifficulties(db);
  cachedDb = db;
  return db;
}

export function getCaseStorePath(): string {
  return DB_PATH;
}

export function listStoredCasesByPool(pool: CasePool): StoredCaseRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM cases
        WHERE pool = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `
    )
    .all(pool) as StoredCaseRow[];

  return rows.map(toStoredCaseRecord);
}

export function upsertCases(pool: CasePool, cases: InsertableCaseRecord[]): void {
  if (cases.length === 0) return;

  const db = getDb();
  const existingRows = db
    .prepare("SELECT id, sort_order FROM cases WHERE pool = ?")
    .all(pool) as Array<{ id: string; sort_order: number }>;
  const sortOrderById = new Map(existingRows.map((row) => [row.id, row.sort_order]));
  let nextSortOrder =
    existingRows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

  const statement = db.prepare(`
    INSERT INTO cases (
      id, pathogen_id, pool, hints_json, difficulty, explanation, source,
      validated, created_at, pathogen_kind, model, style, sort_order, accepted_organism_ids_json
    ) VALUES (
      @id, @pathogen_id, @pool, @hints_json, @difficulty, @explanation, @source,
      @validated, @created_at, @pathogen_kind, @model, @style, @sort_order, @accepted_organism_ids_json
    )
    ON CONFLICT(id) DO UPDATE SET
      pathogen_id = excluded.pathogen_id,
      pool = excluded.pool,
      accepted_organism_ids_json = excluded.accepted_organism_ids_json,
      hints_json = excluded.hints_json,
      difficulty = excluded.difficulty,
      explanation = excluded.explanation,
      source = excluded.source,
      validated = excluded.validated,
      created_at = excluded.created_at,
      pathogen_kind = excluded.pathogen_kind,
      model = excluded.model,
      style = excluded.style,
      sort_order = excluded.sort_order
  `);

  const transaction = db.transaction((records: InsertableCaseRecord[]) => {
    for (const record of records) {
      const existingSortOrder = sortOrderById.get(record.id);
      const sortOrder = existingSortOrder ?? nextSortOrder++;
      statement.run({
        id: record.id,
        pathogen_id: record.pathogenId,
        pool,
        accepted_organism_ids_json: record.acceptedOrganismIds
          ? JSON.stringify(record.acceptedOrganismIds)
          : null,
        hints_json: JSON.stringify(record.hints),
        difficulty: record.difficulty,
        explanation: record.explanation,
        source: record.source,
        validated: record.validated ? 1 : 0,
        created_at: record.createdAt,
        pathogen_kind: record.pathogenKind ?? null,
        model: record.model ?? null,
        style: record.style ?? null,
        sort_order: sortOrder,
      });
    }
  });

  transaction(cases);
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

function getPrimaryDailyPool(now = new Date()): MicrobleCase[] {
  const generatedDaily = listStoredCasesByPool("daily").map(toMicrobleCase);
  const visibleGeneratedDaily = filterCasesVisibleAtDayStart(generatedDaily, now);

  if (visibleGeneratedDaily.length > 0) return visibleGeneratedDaily;
  return listStoredCasesByPool("legacy_daily").map(toMicrobleCase);
}

function getPrimaryFreeplayPool(activeDailyPool: MicrobleCase[]): MicrobleCase[] {
  const generatedFreeplay = listStoredCasesByPool("freeplay").map(toMicrobleCase);
  const expiredDaily = getExpiredDailyCases(activeDailyPool);

  if (generatedFreeplay.length > 0 || expiredDaily.length > 0) {
    return dedupeCasesById([...generatedFreeplay, ...expiredDaily]);
  }

  return listStoredCasesByPool("legacy_daily").map(toMicrobleCase);
}

export function getDailyRuntimeCases(): MicrobleCase[] {
  return getPrimaryDailyPool();
}

export function getCurrentDailyCase(): MicrobleCase {
  const dailyCases = getPrimaryDailyPool();
  const fallbackCases = getPrimaryFreeplayPool(dailyCases);
  return getDailyCase(dailyCases, fallbackCases);
}

export function getFreeplayRuntimeCases(): MicrobleCase[] {
  const dailyCases = getPrimaryDailyPool();
  const freeplayCases = getPrimaryFreeplayPool(dailyCases);

  if (freeplayCases.length === 0) return [];

  const currentDailyCase = getDailyCase(dailyCases, freeplayCases);
  const filtered = freeplayCases.filter((caseData) => caseData.id !== currentDailyCase.id);
  return filtered.length > 0 ? filtered : freeplayCases;
}

export const __testing = {
  filterCasesVisibleAtDayStart,
};
