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
  createdAt: "2025-12-31T00:00:00.000Z",
});

const CASES = [baseCase("a"), baseCase("b"), baseCase("c"), baseCase("d")];
const FALLBACK_CASES = [baseCase("x"), baseCase("y"), baseCase("z")];

describe("daily case helpers", () => {
  it("returns the same daily case for the same day", () => {
    const first = getDailyCasePosition(CASES, 3);
    const second = getDailyCasePosition(CASES, 3);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(CASES.length);
  });

  it("chooses from the full daily pool even after many days", () => {
    const chosen = getDailyCase(CASES, FALLBACK_CASES, 2).id;

    expect(CASES.map((caseData) => caseData.id)).toContain(chosen);
  });

  it("prefers dedicated daily cases over fallback cases whenever daily cases exist", () => {
    expect(CASES.map((caseData) => caseData.id)).toContain(
      getDailyCase(CASES, FALLBACK_CASES, 0).id
    );
    expect(CASES.map((caseData) => caseData.id)).toContain(getDailyCase(CASES, FALLBACK_CASES, 2).id);
  });

  it("uses each dedicated daily case at most once before falling back", () => {
    const chosen = [0, 1, 2, 3].map((day) => getDailyCase(CASES, FALLBACK_CASES, day).id);

    expect(new Set(chosen).size).toBe(CASES.length);
  });

  it("falls back deterministically to the free-play pool when dedicated daily cases are exhausted", () => {
    const first = getDailyCase(CASES, FALLBACK_CASES, 8).id;
    const second = getDailyCase(CASES, FALLBACK_CASES, 8).id;

    expect(first).toBe(second);
    expect(FALLBACK_CASES.map((caseData) => caseData.id)).toContain(first);
  });

  it("returns no expired daily cases on the first day", () => {
    expect(getExpiredDailyCases(CASES, 0)).toEqual([]);
  });

  it("releases previously featured daily cases while keeping today's case out", () => {
    const currentDaily = getDailyCase(CASES, FALLBACK_CASES, 3);
    const expired = getExpiredDailyCases(CASES, 3).map((caseData) => caseData.id);

    expect(expired.length).toBeGreaterThan(0);
    expect(expired).not.toContain(currentDaily.id);
  });

  it("never returns ids outside the dedicated daily pool as expired", () => {
    const expired = getExpiredDailyCases(CASES, 25).map((caseData) => caseData.id);

    expect(expired.every((id) => CASES.some((caseData) => caseData.id === id))).toBe(true);
  });

  it("releases every dedicated daily case after the daily pool is exhausted", () => {
    const expired = getExpiredDailyCases(CASES, 8).map((caseData) => caseData.id);

    expect(new Set(expired)).toEqual(new Set(CASES.map((caseData) => caseData.id)));
  });

  it("makes yesterday's daily case eligible for free play while keeping today's daily case out", () => {
    const dayThreeDaily = getDailyCase(CASES, FALLBACK_CASES, 3);
    const expiredOnDayThree = getExpiredDailyCases(CASES, 3).map((caseData) => caseData.id);

    expect(expiredOnDayThree.length).toBeGreaterThan(0);
    expect(expiredOnDayThree).not.toContain(dayThreeDaily.id);
  });
});
