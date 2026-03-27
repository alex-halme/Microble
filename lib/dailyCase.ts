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

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCycleOrder(casesLength: number, cycle: number): number[] {
  const order = Array.from({ length: casesLength }, (_, index) => index);
  const random = mulberry32((cycle + 1) * 2654435761 + casesLength);

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return order;
}

function getDeterministicFallbackPosition(
  casesLength: number,
  dayIndex = getDailyIndex()
): number {
  if (casesLength <= 0) {
    throw new Error("No fallback cases available");
  }

  const safeDayIndex = getSafeDailyIndex(dayIndex);
  let seed = (safeDayIndex + 1) >>> 0;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x7feb352d) >>> 0;
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x846ca68b) >>> 0;
  seed ^= seed >>> 16;
  return seed % casesLength;
}

export function getDailyCasePosition(
  casesLength: number,
  dayIndex = getDailyIndex()
): number {
  if (casesLength <= 0) {
    throw new Error("No cases available");
  }

  const safeDayIndex = getSafeDailyIndex(dayIndex);
  const cycle = Math.floor(safeDayIndex / casesLength);
  const positionInCycle = safeDayIndex % casesLength;
  return buildCycleOrder(casesLength, cycle)[positionInCycle];
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

  const safeDayIndex = getSafeDailyIndex(dayIndex);
  if (dailyCases.length > 0 && safeDayIndex < dailyCases.length) {
    return dailyCases[getDailyCasePosition(dailyCases.length, safeDayIndex)];
  }

  if (fallbackCases.length > 0) {
    return fallbackCases[getDeterministicFallbackPosition(fallbackCases.length, safeDayIndex)];
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

  const currentPosition = getDailyCasePosition(cases.length, safeDayIndex);
  const positionInCycle = safeDayIndex % cases.length;
  const cycle = Math.floor(safeDayIndex / cases.length);
  const cycleOrder = buildCycleOrder(cases.length, cycle);

  if (safeDayIndex < cases.length) {
    return cycleOrder.slice(0, positionInCycle).map((index) => cases[index]);
  }

  return cases;
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
