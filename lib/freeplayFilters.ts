import { ORGANISM_MAP } from "./organisms";
import type { MicrobleCase, Organism } from "./types";

export type FreeplayPathogenFilter =
  | "bacteria"
  | "fungi"
  | "virus"
  | "protozoa";

export type FreeplayDifficultyFilter = "all" | "easy" | "medium" | "hard";

export interface FreeplayFilters {
  pathogenTypes: FreeplayPathogenFilter[];
  difficulty: FreeplayDifficultyFilter;
}

export const ALL_FREEPLAY_PATHOGEN_TYPES: FreeplayPathogenFilter[] = [
  "bacteria",
  "fungi",
  "virus",
  "protozoa",
];

export const DEFAULT_FREEPLAY_FILTERS: FreeplayFilters = {
  pathogenTypes: ALL_FREEPLAY_PATHOGEN_TYPES,
  difficulty: "all",
};

function isProtozoan(organism: Organism | undefined): boolean {
  if (!organism) return false;

  return (
    (organism.kind ?? "bacterium") === "parasite" &&
    (organism.classificationTags ?? []).some(
      (tag) => tag.toLowerCase() === "protozoan"
    )
  );
}

export function matchesPathogenTypeFilter(
  organism: Organism | undefined,
  pathogenType: FreeplayPathogenFilter
): boolean {
  const kind = organism?.kind ?? "bacterium";
  if (pathogenType === "bacteria") return kind === "bacterium";
  if (pathogenType === "fungi") return kind === "fungus";
  if (pathogenType === "virus") return kind === "virus";
  return isProtozoan(organism);
}

export function matchesFreeplayFilters(
  caseData: MicrobleCase,
  filters: FreeplayFilters
): boolean {
  const organism = ORGANISM_MAP.get(caseData.organismId);

  if (
    filters.pathogenTypes.length === 0 ||
    !filters.pathogenTypes.some((pathogenType) =>
      matchesPathogenTypeFilter(organism, pathogenType)
    )
  ) {
    return false;
  }

  if (filters.difficulty !== "all" && caseData.difficulty !== filters.difficulty) {
    return false;
  }

  return true;
}

export function filterFreeplayCases(
  cases: MicrobleCase[],
  filters: FreeplayFilters
): MicrobleCase[] {
  return cases.filter((caseData) => matchesFreeplayFilters(caseData, filters));
}
