import type { MicrobleCase } from "./types";

/**
 * UTC epoch for day 0. All daily case arithmetic is relative to this date.
 * Keep this in the past so the selector never collapses pre-launch dates to day 0.
 * Altering it will shift all daily cases.
 */
const EPOCH = new Date("2026-01-01T00:00:00Z");
const DAY_MS = 86_400_000;

/**
 * Returns the zero-based index for today in UTC.
 * Deterministic: all users in all timezones get the same index on the same UTC day.
 */
export function getDailyIndex(): number {
  const now = new Date();
  const utcToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const daysSinceEpoch = Math.floor(
    (utcToday - EPOCH.getTime()) / 86_400_000
  );
  return daysSinceEpoch;
}

function getSafeDailyIndex(dayIndex = getDailyIndex()): number {
  return Math.max(dayIndex, 0);
}

function getUtcDayStartForIndex(dayIndex: number): number {
  return EPOCH.getTime() + getSafeDailyIndex(dayIndex) * DAY_MS;
}

function isVisibleByDayIndex(caseData: MicrobleCase, dayIndex: number): boolean {
  const createdAt = Date.parse(caseData.createdAt);
  return Number.isFinite(createdAt) && createdAt < getUtcDayStartForIndex(dayIndex);
}

function hashString(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function buildDailyRanking(
  cases: MicrobleCase[],
  dayIndex: number,
  salt: string
): number[] {
  const safeDayIndex = getSafeDailyIndex(dayIndex);

  return cases
    .map((caseData, index) => ({
      index,
      id: caseData.id,
      score: hashString(`${salt}:${safeDayIndex}:${caseData.id}`),
    }))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .map((entry) => entry.index);
}

function buildRemainingDailyPool(
  cases: MicrobleCase[],
  dayIndex: number
): MicrobleCase[] {
  const used = new Set<string>();
  const safeDayIndex = getSafeDailyIndex(dayIndex);

  for (let day = 0; day < safeDayIndex; day += 1) {
    const available = cases.filter(
      (caseData) => isVisibleByDayIndex(caseData, day) && !used.has(caseData.id)
    );

    if (available.length === 0) {
      break;
    }

    const picked = available[buildDailyRanking(available, day, "daily")[0]];
    used.add(picked.id);
  }

  return cases.filter(
    (caseData) => isVisibleByDayIndex(caseData, safeDayIndex) && !used.has(caseData.id)
  );
}

function getDeterministicFallbackPosition(
  fallbackCases: MicrobleCase[],
  dayIndex = getDailyIndex()
): number {
  if (fallbackCases.length <= 0) {
    throw new Error("No fallback cases available");
  }
  return buildDailyRanking(fallbackCases, dayIndex, "fallback")[0];
}

export function getDailyCasePosition(
  cases: MicrobleCase[],
  dayIndex = getDailyIndex()
): number {
  const casesLength = cases.length;
  if (casesLength <= 0) {
    throw new Error("No cases available");
  }
  const remaining = buildRemainingDailyPool(cases, dayIndex);
  if (remaining.length <= 0) {
    throw new Error("No daily cases remaining");
  }

  const picked = remaining[buildDailyRanking(remaining, dayIndex, "daily")[0]];
  const position = cases.findIndex((caseData) => caseData.id === picked.id);
  if (position < 0) {
    throw new Error("Selected daily case is missing from source pool");
  }

  return position;
}

/**
 * Select today's daily case.
 * Dedicated daily cases are chosen randomly-looking but without replacement from the cases that
 * were already visible by the start of that UTC day. Once a dedicated daily case has been used,
 * it drops out of future daily selection and becomes eligible for free play after that day.
 * When no dedicated daily cases remain, a deterministic fallback selection is made from the
 * free-play pool so there is still exactly one shared case per UTC day.
 */
export function getDailyCase(
  dailyCases: MicrobleCase[],
  fallbackCases: MicrobleCase[] = [],
  dayIndex = getDailyIndex()
): MicrobleCase {
  if (dailyCases.length === 0 && fallbackCases.length === 0) {
    throw new Error("No cases available");
  }

  const remainingDailyCases = buildRemainingDailyPool(dailyCases, dayIndex);
  if (remainingDailyCases.length > 0) {
    return dailyCases[getDailyCasePosition(dailyCases, dayIndex)];
  }

  if (fallbackCases.length > 0) {
    return fallbackCases[getDeterministicFallbackPosition(fallbackCases, dayIndex)];
  }

  throw new Error("No cases available");
}

/**
 * Returns previously featured daily cases that should now be eligible for free play.
 * These are the daily cases already used on earlier UTC days. The current day's daily case stays
 * out of free play until the day changes.
 */
export function getExpiredDailyCases(
  cases: MicrobleCase[],
  dayIndex = getDailyIndex()
): MicrobleCase[] {
  if (cases.length === 0) return [];

  const safeDayIndex = getSafeDailyIndex(dayIndex);
  if (safeDayIndex === 0) return [];

  const used = new Map<string, MicrobleCase>();

  for (let day = 0; day < safeDayIndex; day += 1) {
    const available = cases.filter(
      (caseData) => isVisibleByDayIndex(caseData, day) && !used.has(caseData.id)
    );

    if (available.length === 0) {
      break;
    }

    const caseData = available[buildDailyRanking(available, day, "daily")[0]];
    used.set(caseData.id, caseData);
  }

  return [...used.values()];
}

/**
 * Returns today's UTC date as a YYYY-MM-DD string.
 * Used as the localStorage key suffix for daily games.
 */
export function todayUTC(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
