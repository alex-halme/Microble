import { describe, expect, it } from "vitest";
import { __testing } from "../lib/caseStore";
import type { MicrobleCase } from "../lib/types";

const baseCase = (id: string, createdAt: string): MicrobleCase => ({
  id,
  organismId: "staphylococcus-aureus",
  hints: [
    {
      order: 1,
      category: "presentation",
      text: "A 25-year-old presents with fever and a worsening sore throat over 2 days.",
    },
    {
      order: 2,
      category: "history",
      text: "He is otherwise healthy and reports several sick contacts in his dormitory.",
    },
    {
      order: 3,
      category: "lab",
      text: "Throat culture grows Gram-positive cocci and leukocytes are 12.0 × 10^9/L.",
    },
    {
      order: 4,
      category: "exposure",
      text: "Several classmates developed similar symptoms during the same week.",
    },
    {
      order: 5,
      category: "treatment_response",
      text: "Symptoms improve promptly after starting penicillin therapy.",
    },
  ],
  difficulty: "easy",
  explanation: "Synthetic test case.",
  source: "ai_generated",
  validated: true,
  createdAt,
});

describe("case store daily visibility", () => {
  it("includes only cases created before the current UTC day started", () => {
    const cases = [
      baseCase("old", "2026-03-26T23:59:59.000Z"),
      baseCase("new", "2026-03-27T08:15:00.000Z"),
    ];

    const visible = __testing.filterCasesVisibleAtDayStart(
      cases,
      new Date("2026-03-27T12:00:00.000Z")
    );

    expect(visible.map((caseData) => caseData.id)).toEqual(["old"]);
  });

  it("makes same-day cases visible after the next UTC midnight", () => {
    const cases = [baseCase("new", "2026-03-27T08:15:00.000Z")];

    const visible = __testing.filterCasesVisibleAtDayStart(
      cases,
      new Date("2026-03-28T00:01:00.000Z")
    );

    expect(visible.map((caseData) => caseData.id)).toEqual(["new"]);
  });
});
