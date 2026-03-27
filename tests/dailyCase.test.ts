import { describe, expect, it } from "vitest";
import {
  getDailyCasePosition,
  getDailyCase,
  getExpiredDailyCases,
} from "../lib/dailyCase";
import type { MicrobleCase } from "../lib/types";

const baseCase = (id: string): MicrobleCase => ({
  id,
  organismId: "staphylococcus-aureus",
  hints: [
    { order: 1, category: "presentation", text: "A 25-year-old presents with fever and sore throat after 2 days of worsening symptoms." },
    { order: 2, category: "history", text: "He is otherwise healthy and reports recent close contact with classmates who were ill." },
    { order: 3, category: "lab", text: "Throat culture shows Gram-positive cocci and leukocytes 12.0 × 10^9/L." },
    { order: 4, category: "exposure", text: "Several dormitory contacts had similar symptoms over the same week." },
    { order: 5, category: "treatment_response", text: "The infection responds promptly to penicillin therapy." },
  ],
  difficulty: "easy",
  explanation: "Synthetic test case.",
  source: "ai_generated",
  validated: true,
  createdAt: "2026-03-27T00:00:00.000Z",
});

const CASES = [baseCase("a"), baseCase("b"), baseCase("c"), baseCase("d")];
const FALLBACK_CASES = [baseCase("x"), baseCase("y"), baseCase("z")];

describe("daily case helpers", () => {
  it("returns a deterministic shuffled daily order within each cycle", () => {
    const firstCycle = [0, 1, 2, 3].map((day) => getDailyCasePosition(CASES.length, day));
    const repeatedFirstCycle = [0, 1, 2, 3].map((day) =>
      getDailyCasePosition(CASES.length, day)
    );

    expect(new Set(firstCycle).size).toBe(CASES.length);
    expect(firstCycle).toEqual(repeatedFirstCycle);
  });

  it("prefers dedicated daily cases over fallback cases whenever daily cases exist", () => {
    expect(CASES.map((caseData) => caseData.id)).toContain(
      getDailyCase(CASES, FALLBACK_CASES, 0).id
    );
    expect(CASES.map((caseData) => caseData.id)).toContain(getDailyCase(CASES, FALLBACK_CASES, 2).id);
  });

  it("falls back deterministically to the free-play pool after dedicated daily cases are depleted", () => {
    const first = getDailyCase(CASES, FALLBACK_CASES, 8).id;
    const second = getDailyCase(CASES, FALLBACK_CASES, 8).id;

    expect(first).toBe(second);
    expect(FALLBACK_CASES.map((caseData) => caseData.id)).toContain(first);
  });

  it("returns no expired daily cases on the first day", () => {
    expect(getExpiredDailyCases(CASES, 0)).toEqual([]);
  });

  it("releases prior daily cases before the first full cycle", () => {
    const currentDaily = getDailyCase(CASES, FALLBACK_CASES, 3);
    const expired = getExpiredDailyCases(CASES, 3).map((caseData) => caseData.id);

    expect(expired).toHaveLength(3);
    expect(expired).not.toContain(currentDaily.id);
  });

  it("releases every dedicated daily case after the daily pool is depleted", () => {
    const expired = getExpiredDailyCases(CASES, 5).map((caseData) => caseData.id);

    expect(expired).toEqual(CASES.map((caseData) => caseData.id));
  });

  it("makes yesterday's daily case eligible for free play while keeping today's daily case out", () => {
    const dayThreeDaily = getDailyCase(CASES, FALLBACK_CASES, 3);
    const expiredOnDayThree = getExpiredDailyCases(CASES, 3).map((caseData) => caseData.id);

    expect(expiredOnDayThree).toHaveLength(3);
    expect(expiredOnDayThree).not.toContain(dayThreeDaily.id);
  });
});
