/**
 * scripts/fix-difficulties.ts
 *
 * Retroactively normalize generated-case difficulty labels.
 *
 * This applies:
 * - the editorial tier floor from the pathogen generation plan
 * - conservative downgrades for cases that reveal classic giveaway clues
 *   too early in hints 1-2
 *
 * This is safe to run multiple times — it is idempotent.
 *
 * Run with:
 *   npx tsx scripts/fix-difficulties.ts
 */

import {
  listStoredCasesByPool,
  upsertCases,
  type StoredCaseRecord,
} from "../lib/caseStore.js";
import {
  PATHOGEN_PLAN_BY_ID,
  applyTierDifficultyFloor,
  type DifficultyLevel,
} from "../data/pathogen-generation-plan.js";

const POOLS = ["daily", "freeplay"] as const;

const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

interface DifficultyCapRule {
  label: string;
  maxDifficulty: DifficultyLevel;
  pattern: RegExp;
}

const EARLY_DIFFICULTY_CAP_RULES: DifficultyCapRule[] = [
  {
    label: "scarlet fever buzzwords",
    maxDifficulty: "easy",
    pattern: /\bstrawberry(?:-appearing)? tongue\b|\bsandpaper rash\b/i,
  },
  {
    label: "Koplik spots",
    maxDifficulty: "easy",
    pattern: /\bkoplik\b/i,
  },
  {
    label: "pseudomembrane",
    maxDifficulty: "easy",
    pattern: /\bpseudomembrane\b/i,
  },
  {
    label: "erythema migrans",
    maxDifficulty: "easy",
    pattern: /\berythema migrans\b/i,
  },
  {
    label: "chancre",
    maxDifficulty: "easy",
    pattern: /\bchancre\b/i,
  },
  {
    label: "dark-field microscopy",
    maxDifficulty: "easy",
    pattern: /\bdark[- ]field\b/i,
  },
  {
    label: "koilocytosis or p16",
    maxDifficulty: "easy",
    pattern: /\bkoilocyt\w*\b|\bp16\b/i,
  },
  {
    label: "whiff test or fishy odor",
    maxDifficulty: "easy",
    pattern: /\bwhiff test\b|\bfishy odou?r\b|\bclue cells?\b/i,
  },
  {
    label: "Shiga toxin naming",
    maxDifficulty: "easy",
    pattern: /\bshiga\b/i,
  },
  {
    label: "NS1 naming",
    maxDifficulty: "easy",
    pattern: /\bns1\b/i,
  },
  {
    label: "surface or core antigen wording",
    maxDifficulty: "easy",
    pattern: /\b(?:surface|core) antigen\b/i,
  },
  {
    label: "heat-labile or heat-stable toxin wording",
    maxDifficulty: "easy",
    pattern: /\bheat-(?:labile|stable)\b/i,
  },
  {
    label: "corkscrew motility wording",
    maxDifficulty: "easy",
    pattern: /\bcorkscrew motility\b/i,
  },
  {
    label: "nocturnal pruritus or burrows",
    maxDifficulty: "medium",
    pattern:
      /\bnocturnal pruritus\b|\bitch is markedly worse at night\b|\bnew nocturnal itch\b|\bburrow\w*\b|\binterdigital\b/i,
  },
];

function minDifficulty(
  left: DifficultyLevel,
  right: DifficultyLevel
): DifficultyLevel {
  return DIFFICULTY_ORDER[left] <= DIFFICULTY_ORDER[right] ? left : right;
}

function clampDifficulty(
  value: DifficultyLevel,
  minimum: DifficultyLevel,
  maximum: DifficultyLevel
): DifficultyLevel {
  let result = value;

  if (DIFFICULTY_ORDER[result] < DIFFICULTY_ORDER[minimum]) {
    result = minimum;
  }

  if (DIFFICULTY_ORDER[result] > DIFFICULTY_ORDER[maximum]) {
    result = maximum;
  }

  return result;
}

function findEarlyDifficultyCap(
  record: StoredCaseRecord
): { maxDifficulty: DifficultyLevel; reasons: string[] } | null {
  const earlyText = `${record.hints[0]?.text ?? ""} ${record.hints[1]?.text ?? ""}`;
  let maxDifficulty: DifficultyLevel | null = null;
  const reasons: string[] = [];

  for (const rule of EARLY_DIFFICULTY_CAP_RULES) {
    if (!rule.pattern.test(earlyText)) continue;
    maxDifficulty =
      maxDifficulty === null
        ? rule.maxDifficulty
        : minDifficulty(maxDifficulty, rule.maxDifficulty);
    reasons.push(rule.label);
  }

  return maxDifficulty ? { maxDifficulty, reasons } : null;
}

function correctDifficulty(record: StoredCaseRecord): {
  corrected: DifficultyLevel;
  reasons: string[];
} {
  const pathogen = PATHOGEN_PLAN_BY_ID.get(record.pathogenId);
  const minimum = pathogen
    ? applyTierDifficultyFloor(pathogen.tier, "easy")
    : "easy";

  let corrected = applyTierDifficultyFloor(
    pathogen?.tier ?? "usmle_core",
    record.difficulty
  );
  const reasons: string[] = [];

  if (corrected !== record.difficulty) {
    reasons.push(`tier floor ${record.difficulty} → ${corrected}`);
  }

  const earlyCap = findEarlyDifficultyCap(record);
  if (earlyCap) {
    const clamped = clampDifficulty(corrected, minimum, earlyCap.maxDifficulty);
    if (clamped !== corrected) {
      reasons.push(
        `early giveaway ${corrected} → ${clamped} (${earlyCap.reasons.join(", ")})`
      );
      corrected = clamped;
    }
  }

  return { corrected, reasons };
}

function countDifficultyChanges(records: StoredCaseRecord[]): number {
  let changed = 0;
  for (const record of records) {
    const { corrected } = correctDifficulty(record);
    if (corrected !== record.difficulty) changed++;
  }
  return changed;
}

function toInsertable(record: StoredCaseRecord) {
  const { pool: _pool, sortOrder: _sort, ...insertable } = record;
  return insertable;
}

let totalChanged = 0;
let totalCases = 0;

for (const pool of POOLS) {
  const records = listStoredCasesByPool(pool);
  const changed = countDifficultyChanges(records);
  totalChanged += changed;
  totalCases += records.length;

  console.log(`${pool}: ${records.length} cases, ${changed} difficulty corrections`);

  if (changed > 0) {
    for (const record of records) {
      const { corrected, reasons } = correctDifficulty(record);
      if (corrected === record.difficulty) continue;
      const pathogen = PATHOGEN_PLAN_BY_ID.get(record.pathogenId);
      console.log(
        `  ${record.id}  ${pathogen?.canonical ?? record.pathogenId}  ${record.difficulty} → ${corrected}`
      );
      console.log(`    ${reasons.join("; ")}`);
    }
  }

  upsertCases(
    pool,
    records.map((record) => {
      const { corrected } = correctDifficulty(record);
      return toInsertable({
        ...record,
        difficulty: corrected,
      });
    })
  );
}

console.log(`\nDone. Fixed ${totalChanged} of ${totalCases} cases.`);
