import { ORGANISM_MAP } from "./organisms";
import type { Hint, MicrobleCase } from "./types";

type GeneratedPathogenCase = {
  id: string;
  pathogenId: string;
  acceptedOrganismIds?: string[];
  hints: Hint[];
  difficulty: MicrobleCase["difficulty"];
  explanation: string;
  source: MicrobleCase["source"];
  validated: boolean;
  createdAt: string;
};

export function normalizeGeneratedPathogenCases(
  rawCases: GeneratedPathogenCase[]
): MicrobleCase[] {
  return rawCases
    .filter((caseData) => ORGANISM_MAP.has(caseData.pathogenId))
    .filter((caseData) => caseData.hints.length === 5)
    .map(
      (caseData) =>
        ({
          ...caseData,
          hints: caseData.hints as MicrobleCase["hints"],
          organismId: caseData.pathogenId,
          acceptedOrganismIds: caseData.acceptedOrganismIds,
        }) as MicrobleCase
    );
}

export function dedupeCasesById(cases: MicrobleCase[]): MicrobleCase[] {
  const seen = new Set<string>();
  return cases.filter((caseData) => {
    if (seen.has(caseData.id)) return false;
    seen.add(caseData.id);
    return true;
  });
}
