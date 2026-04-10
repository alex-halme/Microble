import { describe, expect, it } from "vitest";
import {
  buildCaseExplanation,
  isEducationalCaseExplanation,
} from "../lib/caseExplanation";
import { __testing, type StoredCaseRecord } from "../lib/caseStore";

const bacillusCereusHints = [
  {
    order: 1 as const,
    category: "presentation" as const,
    text: "A 24-year-old man presented to a community clinic with abrupt-onset profuse vomiting that began approximately 3 hours after a catered business lunch. He denied diarrhoea, fever or bloody stools.",
  },
  {
    order: 2 as const,
    category: "history" as const,
    text: "Previously healthy, no regular medications and no chronic illness. Three coworkers developed similar vomiting within a comparable interval.",
  },
  {
    order: 3 as const,
    category: "lab" as const,
    text: "Stool Gram stain demonstrated large Gram-positive rods, some with refractile spores. Blood cultures remained sterile after 48 hours.",
  },
  {
    order: 4 as const,
    category: "imaging" as const,
    text: "CT abdomen showed no bowel-wall thickening and no focal inflammatory changes. The overall appearance argued against invasive enteritis.",
  },
  {
    order: 5 as const,
    category: "exposure" as const,
    text: "Public-health follow-up found the buffet included a rice-based fried dish that had been left at room temperature. A sample of the leftover fried rice cultured a rapidly growing, beta-haemolytic, spore-forming Gram-positive rod matching the organism seen in the patient's stool.",
  },
];

describe("case explanation builder", () => {
  it("builds a fluent explanation from case hints", () => {
    const explanation = buildCaseExplanation(
      "bacillus-cereus",
      bacillusCereusHints
    );

    expect(explanation).toContain("The diagnosis is Bacillus cereus.");
    expect(explanation).toContain(
      "The presentation fits because abrupt-onset profuse vomiting that began approximately 3 hours after a catered business lunch."
    );
    expect(explanation).toContain(
      "Another key clue is that a sample of the leftover fried rice cultured a rapidly growing, beta-haemolytic, spore-forming Gram-positive rod matching the organism seen in the patient's stool."
    );
    expect(explanation).not.toContain("Public-health");
    expect(explanation).toMatch(/Taken together, these case-specific findings support Bacillus cereus\.$/);
  });

  it("replaces fragmentary stored explanations during normalization", () => {
    const record: StoredCaseRecord = {
      id: "path-freeplay-bacillus-cereus-easy-test",
      pathogenId: "bacillus-cereus",
      pool: "freeplay",
      hints: bacillusCereusHints,
      difficulty: "easy",
      explanation: "Fulminant post-traumatic endophthalmitis after soil contamination, rapid progression despite.",
      source: "ai_generated",
      validated: true,
      createdAt: "2026-04-09T16:08:45.066Z",
      pathogenKind: "bacterium",
      sortOrder: 0,
    };

    const normalized = __testing.normalizeStoredRecord(record);

    expect(normalized.explanation).not.toBe(record.explanation);
    expect(normalized.explanation).toContain("The diagnosis is Bacillus cereus.");
    expect(normalized.explanation).toContain(
      "Another key clue is that a sample of the leftover fried rice cultured a rapidly growing, beta-haemolytic, spore-forming Gram-positive rod matching the organism seen in the patient's stool."
    );
    expect(normalized.explanation).toContain(
      "Taken together, these case-specific findings support Bacillus cereus."
    );
  });

  it("preserves good stored explanations during normalization", () => {
    const explanation =
      "Bacillus cereus is the best fit because the abrupt vomiting-only illness after reheated rice points to the emetic toxin syndrome rather than an invasive enteric infection. The matching spore-forming Gram-positive rod in both stool and leftover food makes that interpretation much more specific than a generic food poisoning history alone. A useful teaching point is that the emetic form is driven by a preformed heat-stable toxin, which explains the very short incubation period.";

    const record: StoredCaseRecord = {
      id: "path-freeplay-bacillus-cereus-educational-test",
      pathogenId: "bacillus-cereus",
      pool: "freeplay",
      hints: bacillusCereusHints,
      difficulty: "easy",
      explanation,
      source: "ai_generated",
      validated: true,
      createdAt: "2026-04-09T16:08:45.066Z",
      pathogenKind: "bacterium",
      sortOrder: 0,
    };

    const normalized = __testing.normalizeStoredRecord(record);

    expect(normalized.explanation).toBe(explanation);
  });

  it("accepts both rich explanations and fluent fallback summaries", () => {
    const richExplanation =
      "Bacillus cereus is the best fit because this abrupt vomiting-predominant illness began only a few hours after reheated rice, which points to the emetic toxin syndrome rather than invasive gastroenteritis. The growth of a spore-forming Gram-positive rod from the implicated food supports that interpretation and helps distinguish it from common viral foodborne illness. A useful teaching point is that B. cereus causes two classic syndromes, with the reheated-rice pattern reflecting a preformed heat-stable toxin.";

    expect(
      isEducationalCaseExplanation(richExplanation, "bacillus-cereus")
    ).toBe(true);
    expect(
      isEducationalCaseExplanation(
        buildCaseExplanation("bacillus-cereus", bacillusCereusHints),
        "bacillus-cereus"
      )
    ).toBe(true);
    expect(
      isEducationalCaseExplanation(
        "Fulminant post-traumatic endophthalmitis after soil contamination, rapid progression despite.",
        "bacillus-cereus"
      )
    ).toBe(false);
  });
});
