/**
 * scripts/fix-difficulties.ts
 *
 * Retroactively normalize generated-case metadata and difficulty labels.
 *
 * This applies:
 * - the editorial tier floor from the pathogen generation plan
 * - conservative downgrades for cases that reveal classic giveaway clues
 *   too early in hints 1-2
 * - metadata repair for pathogen kind and stale difficulty-coded ids
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

const EXPLANATION_SENTENCE_DROP_PATTERNS = [
  /\bmanagement\b/i,
  /\btreated with\b/i,
  /\bfirst-line\b/i,
  /\bantibiotic(?:s)?\b/i,
  /\bantiviral(?:s)?\b/i,
  /\bantifungal(?:s)?\b/i,
  /\btherapy\b/i,
  /\bresponds? to\b/i,
  /\bsusceptibility pattern\b/i,
  /\bstandard oral\b/i,
  /\bconsult(?:ation)?\b/i,
  /\bpublic health\b/i,
  /\bcontact precautions?\b/i,
  /\bchemoprophylaxis\b/i,
  /\bsupportive care\b/i,
  /\bwound care\b/i,
];

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

function findWholeCaseDifficultyCap(
  record: StoredCaseRecord
): { maxDifficulty: DifficultyLevel; reasons: string[] } | null {
  const firstHint = record.hints[0]?.text ?? "";
  const secondHint = record.hints[1]?.text ?? "";
  const earlyText = `${firstHint} ${secondHint}`;
  const fullText = `${record.hints.map((hint) => hint.text).join(" ")} ${record.explanation}`;
  const reasons: string[] = [];
  let maxDifficulty: DifficultyLevel | null = null;

  if (
    record.pathogenId === "staphylococcus-saprophyticus" &&
    /\b(dysuria|urinary frequency|suprapubic|acute cystitis|hematuria)\b/i.test(earlyText)
  ) {
    maxDifficulty = "medium";
    reasons.push("classic staphylococcus saprophyticus cystitis syndrome");
  }

  if (
    record.pathogenId === "hepatitis-a-virus" &&
    /\b(daycare|toddlers?|diaper(?:ing|s)?)\b/i.test(earlyText)
  ) {
    maxDifficulty = maxDifficulty ? minDifficulty(maxDifficulty, "medium") : "medium";
    reasons.push("classic daycare fecal-oral hepatitis A exposure");
  }

  if (
    record.pathogenId === "norovirus" &&
    /\b(vomit\w*|watery diarrh\w*)\b/i.test(firstHint) &&
    /\b(shared meal|food worker|buffet|same ward|communal|outbreak)\b/i.test(earlyText)
  ) {
    maxDifficulty = maxDifficulty ? minDifficulty(maxDifficulty, "medium") : "medium";
    reasons.push("classic norovirus outbreak pattern");
  }

  if (
    record.pathogenId === "trypanosoma-cruzi" &&
    /\bbolivia\b/i.test(earlyText) &&
    /\bapical aneurysm\b/i.test(fullText)
  ) {
    maxDifficulty = maxDifficulty ? minDifficulty(maxDifficulty, "medium") : "medium";
    reasons.push("Bolivia plus classic Chagas apical aneurysm pattern");
  }

  return maxDifficulty ? { maxDifficulty, reasons } : null;
}

function deriveExpectedPathogenKind(record: StoredCaseRecord): StoredCaseRecord["pathogenKind"] {
  return PATHOGEN_PLAN_BY_ID.get(record.pathogenId)?.kind ?? record.pathogenKind;
}

function alignDifficultyInCaseId(caseId: string, difficulty: DifficultyLevel): string {
  return caseId.replace(
    /-(easy|medium|hard)-(\d+)-(\d+)-(\d+)$/,
    `-${difficulty}-$2-$3-$4`
  );
}

function sanitizeExplanation(explanation: string): string {
  const normalizedExplanation = explanation.replace(/;\s+/g, ". ");
  const sentences = normalizedExplanation
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const filtered = sentences
    .map((sentence) => {
      let cutoff = -1;

      for (const pattern of EXPLANATION_SENTENCE_DROP_PATTERNS) {
        const match = pattern.exec(sentence);
        if (!match) continue;
        cutoff = cutoff === -1 ? match.index : Math.min(cutoff, match.index);
      }

      if (cutoff === -1) return sentence;
      if (cutoff < 60) return "";

      const trimmed = sentence
        .slice(0, cutoff)
        .replace(/[,:;.\s-]+$/g, "")
        .replace(/\b(?:and|or|but)\s*$/i, "")
        .trim();

      return trimmed ? `${trimmed}.` : "";
    })
    .filter(Boolean);

  const candidate = filtered.join(" ").trim();
  return candidate.length >= 80 ? candidate : explanation;
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

  const wholeCaseCap = findWholeCaseDifficultyCap(record);
  if (wholeCaseCap) {
    const clamped = clampDifficulty(corrected, minimum, wholeCaseCap.maxDifficulty);
    if (clamped !== corrected) {
      reasons.push(
        `clinical giveaway ${corrected} → ${clamped} (${wholeCaseCap.reasons.join(", ")})`
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
let totalMetadataChanged = 0;
let totalExplanationChanged = 0;

for (const pool of POOLS) {
  const records = listStoredCasesByPool(pool);
  const changed = countDifficultyChanges(records);
  const metadataChanged = records.filter((record) => {
    const { corrected } = correctDifficulty(record);
    const expectedId = alignDifficultyInCaseId(record.id, corrected);
    const expectedKind = deriveExpectedPathogenKind(record);
    return expectedId !== record.id || expectedKind !== record.pathogenKind;
  }).length;
  const explanationChanged = records.filter(
    (record) => sanitizeExplanation(record.explanation) !== record.explanation
  ).length;
  totalChanged += changed;
  totalMetadataChanged += metadataChanged;
  totalExplanationChanged += explanationChanged;
  totalCases += records.length;

  console.log(
    `${pool}: ${records.length} cases, ${changed} difficulty corrections, ${metadataChanged} metadata repairs, ${explanationChanged} explanation trims`
  );

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
        id: alignDifficultyInCaseId(record.id, corrected),
        difficulty: corrected,
        explanation: sanitizeExplanation(record.explanation),
        pathogenKind: deriveExpectedPathogenKind(record),
      });
    })
  );
}

console.log(
  `\nDone. Fixed ${totalChanged} difficulty labels, ${totalMetadataChanged} metadata issues, and ${totalExplanationChanged} explanations across ${totalCases} cases.`
);
