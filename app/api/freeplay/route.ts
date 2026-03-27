import { NextRequest, NextResponse } from "next/server";
import { getFreeplayRuntimeCases, toPublicCase } from "@/lib/caseStore";
import {
  ALL_FREEPLAY_PATHOGEN_TYPES,
  DEFAULT_FREEPLAY_FILTERS,
  filterFreeplayCases,
  type FreeplayDifficultyFilter,
  type FreeplayPathogenFilter,
} from "@/lib/freeplayFilters";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as {
    completedIds?: string[];
    excludeId?: string;
    pathogenTypes?: FreeplayPathogenFilter[];
    difficulty?: FreeplayDifficultyFilter;
  };

  const completedIds = Array.isArray(payload.completedIds) ? payload.completedIds : [];
  const excludeId =
    typeof payload.excludeId === "string" ? payload.excludeId : undefined;
  const filters = {
    pathogenTypes: Array.isArray(payload.pathogenTypes)
      ? payload.pathogenTypes.filter((value): value is FreeplayPathogenFilter =>
          ALL_FREEPLAY_PATHOGEN_TYPES.includes(value as FreeplayPathogenFilter)
        )
      : DEFAULT_FREEPLAY_FILTERS.pathogenTypes,
    difficulty: payload.difficulty ?? DEFAULT_FREEPLAY_FILTERS.difficulty,
  };

  const allCases = filterFreeplayCases(getFreeplayRuntimeCases(), filters);
  const completedSet = new Set(completedIds);
  const completedMatchingCount = allCases.filter((caseData) =>
    completedSet.has(caseData.id)
  ).length;
  const remaining = allCases.filter(
    (caseData) => !completedSet.has(caseData.id) && caseData.id !== excludeId
  );

  return NextResponse.json({
    caseData: remaining.length > 0 ? toPublicCase(pickRandom(remaining)) : null,
    totalCases: allCases.length,
    completedMatchingCount,
  });
}
