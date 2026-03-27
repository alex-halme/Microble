import {
  PATHOGEN_CATALOG,
  type PathogenCatalogEntry,
  type PathogenTier,
} from "./pathogen-catalog";

export type GenerationPool = "daily" | "freeplay";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface PoolGenerationPlan {
  total: number;
  byDifficulty: DifficultyDistribution;
}

export interface PathogenGenerationPlanEntry extends PathogenCatalogEntry {
  style: "mgh_case_report";
  quotas: Record<GenerationPool, PoolGenerationPlan>;
}

const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const MIN_DIFFICULTY_BY_TIER: Record<PathogenTier, DifficultyLevel> = {
  usmle_core: "easy",
  usmle_extended: "medium",
  rare_bonus: "hard",
};

const FREEPLAY_TARGETS_BY_TIER: Record<PathogenTier, number> = {
  usmle_core: 16,
  usmle_extended: 10,
  rare_bonus: 4,
};

const DAILY_TARGETS_BY_TIER: Record<PathogenTier, number> = {
  usmle_core: 3,
  usmle_extended: 1,
  rare_bonus: 1,
};

const DIFFICULTY_MIX_BY_TIER: Record<PathogenTier, DifficultyDistribution> = {
  usmle_core: { easy: 0.45, medium: 0.35, hard: 0.2 },
  usmle_extended: { easy: 0, medium: 0.65, hard: 0.35 },
  rare_bonus: { easy: 0, medium: 0.25, hard: 0.75 },
};

export function applyTierDifficultyFloor(
  tier: PathogenTier,
  difficulty: DifficultyLevel
): DifficultyLevel {
  const minimum = MIN_DIFFICULTY_BY_TIER[tier];
  return DIFFICULTY_ORDER[difficulty] < DIFFICULTY_ORDER[minimum]
    ? minimum
    : difficulty;
}

function allocateDifficultyCounts(
  total: number,
  mix: DifficultyDistribution
): DifficultyDistribution {
  if (total === 0) {
    return { easy: 0, medium: 0, hard: 0 };
  }

  const levels: DifficultyLevel[] = ["easy", "medium", "hard"];
  const positiveLevels = levels.filter((level) => mix[level] > 0);
  const base: DifficultyDistribution = { easy: 0, medium: 0, hard: 0 };
  let assigned = 0;

  // If the pool has enough room to represent every intended difficulty bucket,
  // seed one case into each nonzero bucket before distributing the remainder.
  if (total >= positiveLevels.length) {
    positiveLevels.forEach((level) => {
      base[level] = 1;
      assigned += 1;
    });
  }

  const remaining = total - assigned;
  const raw = levels.map((level) => ({
    level,
    exact: remaining * mix[level],
  }));
  raw.forEach(({ level, exact }) => {
    base[level] += Math.floor(exact);
  });

  assigned = base.easy + base.medium + base.hard;

  raw
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .forEach(({ level }) => {
      if (assigned >= total) return;
      base[level] += 1;
      assigned += 1;
    });

  return base;
}

function buildPoolPlan(
  entry: PathogenCatalogEntry,
  pool: GenerationPool
): PoolGenerationPlan {
  const targetByTier =
    pool === "daily" ? DAILY_TARGETS_BY_TIER : FREEPLAY_TARGETS_BY_TIER;
  const total = pool === "daily" && !entry.dailyEligible ? 0 : targetByTier[entry.tier];

  return {
    total,
    byDifficulty: allocateDifficultyCounts(total, DIFFICULTY_MIX_BY_TIER[entry.tier]),
  };
}

export const PATHOGEN_GENERATION_PLAN: PathogenGenerationPlanEntry[] =
  PATHOGEN_CATALOG.map((entry) => ({
    ...entry,
    style: "mgh_case_report",
    quotas: {
      daily: buildPoolPlan(entry, "daily"),
      freeplay: buildPoolPlan(entry, "freeplay"),
    },
  }));

export const PATHOGEN_PLAN_BY_ID = new Map(
  PATHOGEN_GENERATION_PLAN.map((entry) => [entry.id, entry])
);

function sumDifficultyCounts(
  entries: PathogenGenerationPlanEntry[],
  pool: GenerationPool
): DifficultyDistribution {
  return entries.reduce(
    (acc, entry) => ({
      easy: acc.easy + entry.quotas[pool].byDifficulty.easy,
      medium: acc.medium + entry.quotas[pool].byDifficulty.medium,
      hard: acc.hard + entry.quotas[pool].byDifficulty.hard,
    }),
    { easy: 0, medium: 0, hard: 0 }
  );
}

export const PATHOGEN_GENERATION_PLAN_TOTALS = {
  freeplay: {
    total: PATHOGEN_GENERATION_PLAN.reduce(
      (sum, entry) => sum + entry.quotas.freeplay.total,
      0
    ),
    byDifficulty: sumDifficultyCounts(PATHOGEN_GENERATION_PLAN, "freeplay"),
  },
  daily: {
    total: PATHOGEN_GENERATION_PLAN.reduce(
      (sum, entry) => sum + entry.quotas.daily.total,
      0
    ),
    byDifficulty: sumDifficultyCounts(PATHOGEN_GENERATION_PLAN, "daily"),
  },
};
