import { describe, expect, it } from "vitest";
import {
  ALL_FREEPLAY_PATHOGEN_TYPES,
  DEFAULT_FREEPLAY_FILTERS,
  filterFreeplayCases,
  matchesPathogenTypeFilter,
} from "../lib/freeplayFilters";
import { ORGANISM_MAP } from "../lib/organisms";
import type { MicrobleCase } from "../lib/types";

function makeCase(
  id: string,
  organismId: string,
  difficulty: MicrobleCase["difficulty"]
): MicrobleCase {
  return {
    id,
    organismId,
    hints: [
      { order: 1, category: "presentation", text: "A 30-year-old presents with fever and cough over 3 days." },
      { order: 2, category: "history", text: "She reports recent sick contacts and worsening fatigue." },
      { order: 3, category: "lab", text: "Leukocytes are 12.0 × 10^9/L and CRP is 58 mg/L." },
      { order: 4, category: "exposure", text: "A household contact became ill earlier in the week." },
      { order: 5, category: "treatment_response", text: "Symptoms improve after targeted therapy is started." },
    ],
    difficulty,
    explanation: "Synthetic test case.",
    source: "ai_generated",
    validated: true,
    createdAt: "2026-03-27T00:00:00.000Z",
  };
}

describe("free play filters", () => {
  it("recognizes protozoa separately from other parasites", () => {
    expect(
      matchesPathogenTypeFilter(
        ORGANISM_MAP.get("giardia-lamblia"),
        "protozoa"
      )
    ).toBe(true);
    expect(
      matchesPathogenTypeFilter(
        ORGANISM_MAP.get("taenia-solium"),
        "protozoa"
      )
    ).toBe(false);
  });

  it("filters by pathogen type and difficulty together", () => {
    const cases = [
      makeCase("a", "staphylococcus-aureus", "easy"),
      makeCase("b", "candida-albicans", "medium"),
      makeCase("c", "influenza-a-virus", "hard"),
      makeCase("d", "giardia-lamblia", "medium"),
    ];

    expect(
      filterFreeplayCases(cases, {
        pathogenTypes: ["fungi"],
        difficulty: "medium",
      }).map((caseData) => caseData.id)
    ).toEqual(["b"]);

    expect(
      filterFreeplayCases(cases, {
        pathogenTypes: ["protozoa"],
        difficulty: "medium",
      }).map((caseData) => caseData.id)
    ).toEqual(["d"]);
  });

  it("supports custom pathogen-type combinations", () => {
    const cases = [
      makeCase("a", "staphylococcus-aureus", "easy"),
      makeCase("b", "candida-albicans", "easy"),
      makeCase("c", "influenza-a-virus", "easy"),
      makeCase("d", "giardia-lamblia", "easy"),
    ];

    expect(
      filterFreeplayCases(cases, {
        pathogenTypes: ["fungi", "virus"],
        difficulty: "all",
      }).map((caseData) => caseData.id)
    ).toEqual(["b", "c"]);
  });

  it("leaves the pool unchanged for the default filters", () => {
    const cases = [
      makeCase("a", "staphylococcus-aureus", "easy"),
      makeCase("b", "candida-albicans", "medium"),
    ];

    expect(filterFreeplayCases(cases, DEFAULT_FREEPLAY_FILTERS)).toEqual(cases);
    expect(DEFAULT_FREEPLAY_FILTERS.pathogenTypes).toEqual(
      ALL_FREEPLAY_PATHOGEN_TYPES
    );
  });
});
