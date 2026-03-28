import type { MicrobleCase } from "./types";

/**
 * UTC epoch for day 0. All daily case arithmetic is relative to this date.
 * Change only at launch — altering it will shift all daily cases.
 */
const EPOCH = new Date("2026-04-01T00:00:00Z");

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
  return buildDailyRanking(cases, dayIndex, "daily")[0];
}

/**
 * Select today's daily case.
 * Fresh dedicated daily cases are served in a deterministic shuffled order once.
 * This keeps the daily case random-looking while still giving every user the same case on the
 * same UTC day and ensuring each dedicated daily case is used once before the app falls back.
 * After the dedicated daily pool is depleted, a deterministic fallback selection is made from
 * the free-play pool so there is still exactly one shared case per UTC day.
 */
export function getDailyCase(
  dailyCases: MicrobleCase[],
  fallbackCases: MicrobleCase[] = [],
  dayIndex = getDailyIndex()
): MicrobleCase {
  if (dailyCases.length === 0 && fallbackCases.length === 0) {
    throw new Error("No cases available");
  }

  if (dailyCases.length > 0) {
    return dailyCases[getDailyCasePosition(dailyCases, dayIndex)];
  }

  if (fallbackCases.length > 0) {
    return fallbackCases[getDeterministicFallbackPosition(fallbackCases, dayIndex)];
  }

  throw new Error("No cases available");
}

/**
 * Returns previously featured daily cases that should now be eligible for free play.
 * Before the dedicated daily pool has been fully used, this is the list of earlier cases.
 * Once the daily pool is depleted and the app falls back to free play for the daily case,
 * every dedicated daily case becomes eligible for free play.
 */
export function getExpiredDailyCases(
  cases: MicrobleCase[],
  dayIndex = getDailyIndex()
): MicrobleCase[] {
  if (cases.length === 0) return [];

  const safeDayIndex = getSafeDailyIndex(dayIndex);
  if (safeDayIndex === 0) return [];

  const currentDailyId = cases[getDailyCasePosition(cases, safeDayIndex)].id;
  const seen = new Map<string, MicrobleCase>();

  for (let day = 0; day < safeDayIndex; day += 1) {
    const caseData = cases[getDailyCasePosition(cases, day)];
    if (caseData.id !== currentDailyId) {
      seen.set(caseData.id, caseData);
    }
  }

  return [...seen.values()];
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
