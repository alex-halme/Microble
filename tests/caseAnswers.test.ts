import { describe, expect, it } from "vitest";
import {
  EHEC_ID,
  ETEC_ID,
  GENERIC_E_COLI_ID,
  GENERIC_NTS_ID,
  GENERIC_SHIGELLA_ID,
  SALMONELLA_ENTERITIDIS_ID,
  SHIGELLA_DYSENTERIAE_ID,
  SHIGELLA_SONNEI_ID,
  detectSubtypeMismatchForTarget,
  getAcceptedOrganismIdsForCase,
  normalizeCaseAnswers,
} from "../lib/caseAnswers";
import type { MicrobleCase } from "../lib/types";

function buildCase(
  organismId: string,
  hints: string[],
  explanation = "Synthetic test case."
): MicrobleCase {
  return {
    id: "case-1",
    organismId,
    hints: [
      { order: 1, category: "presentation", text: hints[0] },
      { order: 2, category: "history", text: hints[1] },
      { order: 3, category: "lab", text: hints[2] },
      { order: 4, category: "imaging", text: hints[3] },
      { order: 5, category: "exposure", text: hints[4] },
    ],
    difficulty: "easy",
    explanation,
    source: "ai_generated",
    validated: true,
    createdAt: "2026-03-27T00:00:00.000Z",
  };
}

describe("case answer normalization", () => {
  it("upgrades generic E. coli cases with EHEC-specific clues", () => {
    const caseData = buildCase(GENERIC_E_COLI_ID, [
      "An 8-year-old boy presents with sudden bloody diarrhea and abdominal cramps after 1 day of symptoms.",
      "He ate a hamburger at a local fair 2 days before becoming unwell.",
      "Stool testing detects a protein toxin active in Vero cells.",
      "Ultrasound shows segmental colonic wall thickening without obstruction.",
      "There was no recent travel or antibiotic exposure.",
    ]);

    expect(normalizeCaseAnswers(caseData)).toEqual({
      organismId: EHEC_ID,
      acceptedOrganismIds: [EHEC_ID, GENERIC_E_COLI_ID],
    });
  });

  it("keeps subtype-specific E. coli cases compatible with generic E. coli answers", () => {
    const caseData = buildCase(ETEC_ID, [
      "A 24-year-old traveler presents with profuse watery diarrhea and marked thirst after 2 days of illness.",
      "She returned from a rural trip and drank untreated water.",
      "Stool PCR detects a heat-labile enterotoxin gene.",
      "Abdominal imaging is unremarkable.",
      "There is no blood in the stool and symptoms improve with oral rehydration.",
    ]);

    expect(getAcceptedOrganismIdsForCase(caseData)).toEqual([
      ETEC_ID,
      GENERIC_E_COLI_ID,
    ]);
  });

  it("flags future generic E. coli generations that contain subtype-defining clues", () => {
    const mismatch = detectSubtypeMismatchForTarget(GENERIC_E_COLI_ID, {
      hints: buildCase(GENERIC_E_COLI_ID, [
        "An 8-year-old boy presents with bloody diarrhea and abdominal pain.",
        "He is otherwise healthy.",
        "Testing detects Shiga toxin activity in Vero cells.",
        "Imaging is unremarkable.",
        "He ate undercooked beef the day before symptom onset.",
      ]).hints,
      explanation: "Synthetic test case.",
    });

    expect(mismatch).toContain("enterohemorrhagic");
  });

  it("accepts both generic and specific Shigella answers within the same family", () => {
    const genericCase = buildCase(GENERIC_SHIGELLA_ID, [
      "A 6-year-old boy presents with fever, abdominal cramps, and bloody diarrhea over 24 hours.",
      "Several classmates at day care have had diarrheal illness this week.",
      "Stool microscopy shows inflammatory cells, and stool culture yields a non-motile Gram-negative bacillus.",
      "Abdominal imaging is not required.",
      "He improves with rehydration and careful hygiene measures.",
    ]);

    const specificCase = buildCase(SHIGELLA_SONNEI_ID, [
      "A 6-year-old boy presents with fever, abdominal cramps, and bloody diarrhea over 24 hours.",
      "Several classmates at day care have had diarrheal illness this week.",
      "Stool microscopy shows inflammatory cells, and stool culture yields a non-motile Gram-negative bacillus.",
      "Abdominal imaging is not required.",
      "He improves with rehydration and careful hygiene measures.",
    ]);

    expect(getAcceptedOrganismIdsForCase(genericCase)).toEqual([
      GENERIC_SHIGELLA_ID,
      SHIGELLA_SONNEI_ID,
      SHIGELLA_DYSENTERIAE_ID,
    ]);
    expect(getAcceptedOrganismIdsForCase(specificCase)).toEqual([
      SHIGELLA_SONNEI_ID,
      GENERIC_SHIGELLA_ID,
    ]);
  });

  it("flags future generic Shigella generations that contain dysenteriae-specific clues", () => {
    const mismatch = detectSubtypeMismatchForTarget(GENERIC_SHIGELLA_ID, {
      hints: buildCase(GENERIC_SHIGELLA_ID, [
        "A 5-year-old child presents with high fever, severe abdominal pain, and bloody diarrhea.",
        "The child has had progressive lethargy over 2 days.",
        "Testing detects a Shiga toxin-producing enteric pathogen.",
        "Ultrasound is unrevealing.",
        "A classmate recently had a similar severe dysenteric illness.",
      ]).hints,
      explanation: "Synthetic test case.",
    });

    expect(mismatch).toContain("Shigella dysenteriae");
  });

  it("accepts both generic and specific non-typhoidal Salmonella answers within the same family", () => {
    const specificCase = buildCase(SALMONELLA_ENTERITIDIS_ID, [
      "A 19-year-old student presents with fever, diarrhea, and abdominal pain for 2 days.",
      "She ate undercooked eggs at a shared meal shortly before symptom onset.",
      "Stool culture yields a motile non-lactose-fermenting Gram-negative bacillus.",
      "Imaging is not required.",
      "Symptoms improve with rehydration alone over several days.",
    ]);

    expect(getAcceptedOrganismIdsForCase(specificCase)).toEqual([
      SALMONELLA_ENTERITIDIS_ID,
      GENERIC_NTS_ID,
    ]);
  });
});
