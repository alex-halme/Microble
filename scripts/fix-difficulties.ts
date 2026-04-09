/**
 * scripts/fix-difficulties.ts
 *
 * One-shot script to retroactively apply the tier-based difficulty floor to all
 * cases stored in the generated JSON files.
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

function countDifficultyChanges(records: StoredCaseRecord[]): number {
  let changed = 0;
  for (const record of records) {
    const pathogen = PATHOGEN_PLAN_BY_ID.get(record.pathogenId);
    if (!pathogen) continue;
    const corrected = applyTierDifficultyFloor(pathogen.tier, record.difficulty);
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
    // Print which pathogens/cases are affected for review
    for (const record of records) {
      const pathogen = PATHOGEN_PLAN_BY_ID.get(record.pathogenId);
      if (!pathogen) continue;
      const corrected = applyTierDifficultyFloor(pathogen.tier, record.difficulty);
      if (corrected !== record.difficulty) {
        console.log(
          `  ${record.id}  ${pathogen.canonical}  ${record.difficulty} → ${corrected}`
        );
      }
    }
  }

  // Re-upsert — normalizeStoredRecord inside upsertCases applies the floor
  upsertCases(pool, records.map(toInsertable));
}

console.log(`\nDone. Fixed ${totalChanged} of ${totalCases} cases.`);
