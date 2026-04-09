/**
 * scripts/generate-pathogen-cases.ts
 *
 * Offline expansion pipeline for broader bacteria / virus / parasite coverage.
 * This script is intentionally separate from scripts/generate-cases.ts so the
 * live bacteria-only gameplay path stays stable while the broader catalog and
 * case pool are being built out.
 *
 * Run with:
 *   OPENAI_API_KEY=sk-... npm run generate:pathogens
 *   OPENAI_API_KEY=sk-... npm run generate:pathogens -- --pool=daily
 *   OPENAI_API_KEY=sk-... npm run generate:pathogens -- --count=100
 *   OPENAI_API_KEY=sk-... npm run generate:pathogens -- --pathogen-id=influenza-a-virus
 */

import OpenAI from "openai";
import { z } from "zod";
import {
  PATHOGEN_GENERATION_PLAN,
  PATHOGEN_GENERATION_PLAN_TOTALS,
  PATHOGEN_PLAN_BY_ID,
  type DifficultyLevel,
  type GenerationPool,
  type PathogenGenerationPlanEntry,
} from "../data/pathogen-generation-plan.js";
import {
  getCaseStorePath,
  listStoredCasesByPool,
  upsertCases,
} from "../lib/caseStore.js";
import {
  detectSubtypeMismatchForTarget,
  getAcceptedOrganismIdsForCase,
} from "../lib/caseAnswers.js";
import { buildCaseExplanation } from "../lib/caseExplanation.js";
import { generateEducationalExplanations } from "../lib/caseExplanationGeneration.js";
import type { Hint } from "../lib/types.js";

const MODEL = "gpt-5-mini";
const CASES_PER_REQUEST = 4;
const MAX_RETRIES = 2;
const MIN_TOTAL_HINT_CHARS = 520;
const MAX_CONCURRENT_REQUESTS = 8;
const EARLY_COVERAGE_TARGETS: Record<GenerationPool, number> = {
  daily: 1,
  freeplay: 2,
};
const EARLY_COVERAGE_BATCH_CAP = 2;

type PathogenKind = PathogenGenerationPlanEntry["kind"];

interface PathogenCaseCandidate {
  id: string;
  pathogenId: string;
  acceptedOrganismIds?: string[];
  pathogenKind: PathogenKind;
  model: string;
  pool: GenerationPool;
  hints: [Hint, Hint, Hint, Hint, Hint];
  difficulty: DifficultyLevel;
  explanation: string;
  source: "ai_generated" | "handcrafted";
  validated: boolean;
  createdAt: string;
  style: "mgh_case_report";
}

interface GenerationJob {
  pathogen: PathogenGenerationPlanEntry;
  pool: GenerationPool;
  difficulty: DifficultyLevel;
  count: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const HintSchema = z.object({
  order: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  text: z.string().min(20).max(500),
  category: z.enum([
    "presentation",
    "history",
    "lab",
    "imaging",
    "exposure",
    "treatment_response",
  ]),
});

const RawHintSchema = z.object({
  order: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .optional(),
  text: z.string().min(20).max(500).optional(),
  hint: z.string().min(20).max(500).optional(),
  category: z.enum([
    "presentation",
    "history",
    "lab",
    "imaging",
    "exposure",
    "treatment_response",
  ]),
});

const RawCaseOutputSchema = z.object({
  hints: z.array(RawHintSchema).length(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().min(50).max(1000).optional(),
});

function buildBatchOutputSchema(expectedCount: number) {
  return z.object({
    cases: z.array(RawCaseOutputSchema).length(expectedCount),
  });
}

const SYSTEM_PROMPT = `You are a medical educator writing tightly edited microbiology mystery cases for a medical-student diagnosis game.

Style target:
- Clinical prose inspired by Massachusetts General Hospital case records
- Calm, concise, medically realistic, and information-dense
- Professional and readable, never melodramatic or game-show styled
- Richer and more specific than a flashcard vignette: each case should feel like a compact but authentic patient story
- International in tone: default to globally legible medicine, not US-specific institutional framing

Rules:
1. Write exactly 5 sequential hints per case, ordered from initial patient presentation to the most discriminating later clue.
2. Hint 1 must be a patient presentation, not a generic background statement. It should open like a real vignette with age, setting, symptoms, and enough specificity that a learner can start forming a differential immediately.
2a. Hint 1 should usually begin with a direct patient-first construction such as "A 43-year-old..." or "A previously well 6-year-old...".
3. Hint 5 should allow an informed medical student to identify the pathogen.
4. Every hint must use a different category from: presentation, history, lab, imaging, exposure, treatment_response.
5. Hint 1 must use the "presentation" category.
6. Any laboratory values must use European / SI-style units when units are given.
7. Do not reveal the pathogen name, genus, species, abbreviation, nickname, or obvious lexical fragments in any hint.
8. The case must feel medically coherent from beginning to end.
9. Difficulty must match the requested level exactly.
10. Do not copy real published case reports; produce original educational cases only.
11. Every hint must remain anchored to this patient's story. Do not include generic pathogen facts or broad background information detached from the case.
12. Cases should be richer and more specific than a flashcard vignette, with concrete patient detail and a realistic clinical arc.
13. Avoid US-centered assumptions unless location is essential; prefer globally legible terminology and settings.
14. Never write lab counts in /uL, /μL, /µL, or K/µL. Use SI-style notation such as × 10^9/L, × 10^6/L, mmol/L, mg/L, or g/L.
15. Do not use generic filler phrases such as "classically", "typically", "this organism is", "this infection is", or "is associated with".
15a. Do not include extra narrative fields beyond the requested JSON shape.
15b. Keep each hint focused on the patient rather than on generic management or public-health advice.
16. US references are allowed when clinically natural, but the case should remain globally legible and should not depend on specifically US-only insurance, agency, or holiday framing.
17. Medium and hard cases must not be too guessable from hint 1 alone. The opening presentation should support a reasonable differential diagnosis rather than essentially naming the pathogen through a classic board-style syndrome.
18. Hard cases should require integration of later hints to solve. Hint 1 may be concerning or distinctive, but it should not by itself make the pathogen obvious to a well-prepared student.
19. Avoid LLM-style punctuation mannerisms. Do not use semicolons, em dashes, or en dashes in hints or explanations. Prefer short, direct sentences with commas or full stops.
20. For hepatitis viruses, disease-level wording such as acute hepatitis, chronic hepatitis, jaundice, or transaminitis is allowed, but never mention a lettered subtype such as hepatitis A, hepatitis B, hepatitis C, hepatitis D, hepatitis E, or their abbreviations.

Return JSON only as { "cases": [...] }.`;

const OUTPUT_SHAPE_EXAMPLE = `{
  "cases": [
    {
      "hints": [
        { "order": 1, "category": "presentation", "text": "A 24-year-old ..." },
        { "order": 2, "category": "history", "text": "..." },
        { "order": 3, "category": "lab", "text": "..." },
        { "order": 4, "category": "imaging", "text": "..." },
        { "order": 5, "category": "exposure", "text": "..." }
      ],
      "difficulty": "easy"
    }
  ]
}`;

function loadExistingCases(pool: GenerationPool): PathogenCaseCandidate[] {
  return listStoredCasesByPool(pool).map((record) => ({
    id: record.id,
    pathogenId: record.pathogenId,
    acceptedOrganismIds: record.acceptedOrganismIds,
    pathogenKind:
      PATHOGEN_PLAN_BY_ID.get(record.pathogenId)?.kind ??
      record.pathogenKind ??
      "bacterium",
    model: record.model ?? MODEL,
    pool,
    hints: record.hints,
    difficulty: record.difficulty,
    explanation: record.explanation,
    source: record.source,
    validated: record.validated,
    createdAt: record.createdAt,
    style: (record.style as "mgh_case_report" | undefined) ?? "mgh_case_report",
  }));
}

function saveCases(pool: GenerationPool, cases: PathogenCaseCandidate[]): void {
  upsertCases(
    pool,
    cases.map((caseData) => ({
      id: caseData.id,
      pathogenId: caseData.pathogenId,
      acceptedOrganismIds: caseData.acceptedOrganismIds,
      hints: caseData.hints,
      difficulty: caseData.difficulty,
      explanation: caseData.explanation,
      source: caseData.source,
      validated: caseData.validated,
      createdAt: caseData.createdAt,
      pathogenKind: caseData.pathogenKind,
      model: caseData.model,
      style: caseData.style,
    }))
  );
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildForbiddenTokens(pathogen: PathogenGenerationPlanEntry): string[] {
  const normalizedCanonical = normalizeToken(pathogen.canonical);
  const canonicalWords = normalizedCanonical.split(/\s+/).filter(Boolean);
  const isLetteredHepatitisVirus =
    canonicalWords[0] === "hepatitis" && canonicalWords[1]?.length === 1;
  const stopwords = new Set([
    "virus",
    "species",
    "human",
    "complex",
    "group",
    "type",
    "non",
    "and",
    "the",
    "a",
    "b",
    "c",
    "d",
  ]);
  const genericClinicalWords = new Set([
    "respiratory",
    "fever",
    "hemorrhagic",
    "haemorrhagic",
    "disease",
    "syndrome",
    "coli",
  ]);

  const canonicalPieces = canonicalWords
    .filter(
      (piece) =>
        piece.length >= 4 &&
        !stopwords.has(piece) &&
        !genericClinicalWords.has(piece)
    );
  const idPieces = pathogen.id
    .split("-")
    .map((piece) => normalizeToken(piece))
    .filter(
      (piece) =>
        piece.length >= 4 &&
        !stopwords.has(piece) &&
        !genericClinicalWords.has(piece)
    );

  const tokens = new Set<string>([
    normalizedCanonical,
    ...canonicalPieces,
    ...idPieces,
  ]);

  if (isLetteredHepatitisVirus) {
    tokens.delete("hepatitis");
    tokens.add(`hepatitis ${canonicalWords[1]}`);
  }

  return [...tokens];
}

interface PatternCheck {
  label: string;
  pattern: RegExp;
}

const EARLY_CLINICAL_GIVEAWAY_PATTERNS: PatternCheck[] = [
  { label: "strawberry tongue", pattern: /\bstrawberry(?:-appearing)? tongue\b/i },
  { label: "sandpaper rash", pattern: /\bsandpaper rash\b/i },
  { label: "Koplik spots", pattern: /\bkoplik\b/i },
  { label: "pseudomembrane", pattern: /\bpseudomembrane\b/i },
  { label: "erythema migrans", pattern: /\berythema migrans\b/i },
  { label: "chancre", pattern: /\bchancre\b/i },
  { label: "nocturnal pruritus", pattern: /\bnocturnal pruritus\b|\bitch is markedly worse at night\b|\bnew nocturnal itch\b/i },
  { label: "interdigital involvement", pattern: /\binterdigital\b/i },
  { label: "burrows", pattern: /\bburrow\w*\b/i },
  { label: "rice-water stool", pattern: /\brice[- ]water\b/i },
  { label: "currant-jelly stool", pattern: /\bcurrant[- ]jelly\b/i },
  { label: "inspiratory whoop", pattern: /\bwhoop(?:ing)?\b/i },
];

const EARLY_TECHNICAL_GIVEAWAY_PATTERNS: PatternCheck[] = [
  { label: "dark-field microscopy", pattern: /\bdark[- ]field\b/i },
  { label: "koilocytosis", pattern: /\bkoilocyt\w*\b/i },
  { label: "Shiga toxin naming", pattern: /\bshiga\b/i },
  { label: "NS1 naming", pattern: /\bns1\b/i },
  { label: "surface/core antigen wording", pattern: /\b(?:surface|core) antigen\b/i },
  { label: "viral DNA or RNA wording", pattern: /\bviral (?:dna|rna)\b/i },
  { label: "p16 marker", pattern: /\bp16\b/i },
  { label: "clue cells", pattern: /\bclue cells?\b/i },
  { label: "whiff test", pattern: /\bwhiff test\b/i },
  { label: "fishy odor", pattern: /\bfishy odou?r\b/i },
  { label: "immunofluorescence", pattern: /\bimmunofluores\w*\b/i },
  { label: "syncytia", pattern: /\bsyncyti\w*\b/i },
  {
    label: "heat-labile or heat-stable toxin wording",
    pattern: /\bheat-(?:labile|stable)\b/i,
  },
  { label: "cigar-shaped yeast wording", pattern: /\bcigar-shaped\b/i },
  { label: "corkscrew motility wording", pattern: /\bcorkscrew motility\b/i },
];

function findPatternLabels(text: string, patterns: PatternCheck[]): string[] {
  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}

function looksLikePatientPresentation(text: string): boolean {
  const hasAge =
    /\b\d{1,3}-year-old\b/i.test(text) ||
    /\b\d{1,2}-month-old\b/i.test(text) ||
    /\b\d{1,2}-day-old\b/i.test(text) ||
    /\bnewborn\b/i.test(text) ||
    /\bneonate\b/i.test(text) ||
    /\binfant\b/i.test(text);
  const hasPatientAnchor =
    /\b(man|woman|male|female|boy|girl|patient|student|traveler|traveller|child|adult|retiree|worker|volunteer|teacher)\b/i.test(
      text
    );
  const hasPresentationVerb =
    /\b(presents?|presented|reports?|developed|arrives?|came|comes?|admitted|brought|referred|seen)\b/i.test(
      text
    );
  const hasSymptoms =
    /\b(fever|cough|headache|diarrh(?:ea|e?a)|pain|rash|dyspn(?:ea|oea)|vomiting|dysuria|confusion|meningismus|seizure|ulcer|lesion|discharge|weakness|fatigue|spotting|bleeding|jaundice|pruritus|swelling|rigors|myalgia|arthralgia|dyspnoea)\b/i.test(
      text
    );
  const hasTimeCourse =
    /\b\d+\s?(?:hours?|days?|weeks?|months?|years?)\b/i.test(text) ||
    /\b(acute|subacute|progressive|gradual|abrupt|sudden|intermittent)\b/i.test(text);
  const hasSetting =
    /\b(emergency department|emergency clinic|clinic|outpatient|ward|triage|hospital|sexual health clinic|gynecology|gynaecology)\b/i.test(
      text
    );
  const hasObjectiveDetail =
    /\b(temperature|temp(?:erature)?|blood pressure|bp\b|pulse|heart rate|oxygen saturation|spo2|febrile|afebrile|tachycard|hypoxi|hypotens|jaundiced|scleral icterus|tender|fluctuant|murmur|crackles|wheeze|wheez|lymphadenopathy|hepatomegaly|visual acuity|speculum examination|on examination|exam(?:ination)? shows)\b/i.test(
      text
    );

  return (
    (hasAge || hasPatientAnchor) &&
    hasPresentationVerb &&
    hasSymptoms &&
    (hasTimeCourse || hasSetting) &&
    hasObjectiveDetail
  );
}

function containsForbiddenLabUnits(text: string): string[] {
  const forbiddenUnits = [
    /mg\/dL/i,
    /g\/dL/i,
    /K\/uL/i,
    /K\/μL/i,
    /K\/µL/i,
    /\/uL\b/i,
    /\/μL\b/i,
    /\/µL\b/i,
    /\/mcL\b/i,
    /\bcells?\/uL\b/i,
    /\bcells?\/μL\b/i,
    /\bcells?\/µL\b/i,
    /\bper microliter\b/i,
    /\bper microL\b/i,
  ];

  return forbiddenUnits
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.toString());
}

function hasConcreteClinicalDetail(text: string): boolean {
  return (
    /\b\d{1,3}-year-old\b/i.test(text) ||
    /\b\d{1,2}-month-old\b/i.test(text) ||
    /\b\d+(?:\.\d+)?\s?(?:°C|mmol\/L|mg\/L|g\/L|x ?10\^9\/L|× ?10\^9\/L|days?|weeks?|months?|hours?)\b/i.test(
      text
    ) ||
    /\b(chest x-ray|ct|mri|ultrasound|lumbar puncture|blood culture|stool culture|pcr|serology|antigen|biopsy|bronchoscopy)\b/i.test(
      text
    ) ||
    /\b(diabetes|cirrhosis|hiv|transplant|chemotherapy|pregnan|dialysis|prosthetic|catheter|icu|travel|vaccin)\b/i.test(
      text
    )
  );
}

function containsGenericCasePhrasing(text: string): string[] {
  const patterns = [
    /\bthis organism is\b/i,
    /\bthis infection is\b/i,
    /\bit is the most common cause\b/i,
    /\bclassically\b/i,
    /\btypically\b/i,
    /\bis associated with\b/i,
    /\bknown for\b/i,
    /\bworldwide\b/i,
  ];

  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.toString());
}

function containsUsCentricFraming(text: string): string[] {
  const patterns = [
    /\bcdc\b/i,
    /\bmedicare\b/i,
    /\bmedicaid\b/i,
    /\bthanksgiving\b/i,
    /\b4th of july\b/i,
  ];

  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.toString());
}

function findPathogenSpecificDifficultyErrors(
  output: {
    hints: z.infer<typeof HintSchema>[];
    difficulty: DifficultyLevel;
  },
  job: GenerationJob
): string[] {
  const errors: string[] = [];
  const firstHint = output.hints.find((hint) => hint.order === 1) ?? output.hints[0];
  const secondHint = output.hints.find((hint) => hint.order === 2);
  const earlyHintText = [firstHint?.text, secondHint?.text].filter(Boolean).join(" ");
  const fullHintText = output.hints.map((hint) => hint.text).join(" ");

  if (
    job.pathogen.id === "staphylococcus-saprophyticus" &&
    output.difficulty === "hard" &&
    /\b(dysuria|urinary frequency|suprapubic|acute cystitis|hematuria)\b/i.test(
      earlyHintText
    )
  ) {
    errors.push(
      "Hard staphylococcus saprophyticus cases must not read like classic uncomplicated cystitis in hints 1-2"
    );
  }

  if (
    job.pathogen.id === "hepatitis-a-virus" &&
    output.difficulty === "hard" &&
    /\b(daycare|toddlers?|diaper(?:ing|s)?)\b/i.test(earlyHintText)
  ) {
    errors.push(
      "Hard hepatitis A cases must not reveal the classic daycare fecal-oral exposure pattern in hints 1-2"
    );
  }

  if (
    job.pathogen.id === "norovirus" &&
    output.difficulty === "hard" &&
    /\b(vomit\w*|watery diarrh\w*|non-bloody vomiting)\b/i.test(firstHint?.text ?? "") &&
    /\b(shared meal|food worker|buffet|same ward|communal|outbreak)\b/i.test(earlyHintText)
  ) {
    errors.push(
      "Hard norovirus cases must not reveal the classic outbreak and shared-exposure pattern in hints 1-2"
    );
  }

  if (
    job.pathogen.id === "trypanosoma-cruzi" &&
    output.difficulty === "hard" &&
    /\bbolivia\b/i.test(earlyHintText) &&
    /\bapical aneurysm\b/i.test(fullHintText)
  ) {
    errors.push(
      "Hard Trypanosoma cruzi cases must not pair Bolivia with the classic apical aneurysm pattern"
    );
  }

  return errors;
}

function validateCaseOutput(
  output: z.infer<typeof HintSchema> extends never
    ? never
    : {
        hints: z.infer<typeof HintSchema>[];
        difficulty: DifficultyLevel;
        explanation: string;
      },
  job: GenerationJob
): ValidationResult {
  const errors: string[] = [];
  const isNonCorePathogen = job.pathogen.tier !== "usmle_core";
  const isRareBonusPathogen = job.pathogen.tier === "rare_bonus";
  const forbiddenTokens = buildForbiddenTokens(job.pathogen);
  const firstHint = output.hints.find((hint) => hint.order === 1) ?? output.hints[0];
  const secondHint = output.hints.find((hint) => hint.order === 2);
  const totalHintChars = output.hints.reduce((sum, hint) => sum + hint.text.length, 0);
  const concreteHintCount = output.hints.filter((hint) =>
    hasConcreteClinicalDetail(hint.text)
  ).length;
  const earlyHintText = [firstHint?.text, secondHint?.text].filter(Boolean).join(" ");

  if (output.difficulty !== job.difficulty) {
    errors.push(
      `Expected difficulty ${job.difficulty}, received ${output.difficulty}`
    );
  }

  if (!firstHint) {
    errors.push("Missing first hint");
  } else {
    if (firstHint.category !== "presentation") {
      errors.push(`Hint 1 must use category "presentation", received "${firstHint.category}"`);
    }
    if (!looksLikePatientPresentation(firstHint.text)) {
      errors.push("Hint 1 does not read like a patient presentation vignette");
    }
  }

  if (output.difficulty !== "easy" && firstHint) {
    const firstHintGiveaways = findPatternLabels(
      firstHint.text,
      EARLY_CLINICAL_GIVEAWAY_PATTERNS
    );
    if (firstHintGiveaways.length > 0) {
      errors.push(
        `Hint 1 is too giveaway-heavy for ${output.difficulty} (${firstHintGiveaways.join(
          ", "
        )})`
      );
    }
  }

  if (isNonCorePathogen && secondHint) {
    const secondHintGiveaways = findPatternLabels(
      secondHint.text,
      EARLY_CLINICAL_GIVEAWAY_PATTERNS
    );
    if (secondHintGiveaways.length > 0) {
      errors.push(
        `Hint 2 is too giveaway-heavy for ${job.pathogen.tier} (${secondHintGiveaways.join(
          ", "
        )})`
      );
    }
  }

  if (output.difficulty === "hard" && secondHint) {
    const secondHintGiveaways = findPatternLabels(
      secondHint.text,
      EARLY_CLINICAL_GIVEAWAY_PATTERNS
    );
    if (secondHintGiveaways.length > 0) {
      errors.push(
        `Hint 2 is too giveaway-heavy for hard (${secondHintGiveaways.join(", ")})`
      );
    }
  }

  if (output.difficulty !== "easy" && earlyHintText) {
    const technicalGiveaways = findPatternLabels(
      earlyHintText,
      EARLY_TECHNICAL_GIVEAWAY_PATTERNS
    );
    if (technicalGiveaways.length > 0) {
      errors.push(
        `Hints 1-2 reveal discriminating technical clues too early (${technicalGiveaways.join(
          ", "
        )})`
      );
    }
  }

  if (isNonCorePathogen && earlyHintText) {
    const nonCoreTechnicalGiveaways = findPatternLabels(
      earlyHintText,
      EARLY_TECHNICAL_GIVEAWAY_PATTERNS
    );
    if (nonCoreTechnicalGiveaways.length > 0) {
      errors.push(
        `Hints 1-2 are too technically revealing for ${job.pathogen.tier} (${nonCoreTechnicalGiveaways.join(
          ", "
        )})`
      );
    }
  }

  if (isRareBonusPathogen && firstHint) {
    const rareBonusOvertExposure =
      /\b(dog bite|cat bite|tick bite|thorn prick|undercooked ground beef|oysters?|freshwater swimming|contact lens|bird(?:s| cage)?|parrot|mosquito bites?)\b/i.test(
        firstHint.text
      );
    if (rareBonusOvertExposure) {
      errors.push(
        "Hint 1 is too overtly keyed to a rare-bonus pathogen exposure"
      );
    }
  }

  errors.push(...findPathogenSpecificDifficultyErrors(output, job));

  if (totalHintChars < MIN_TOTAL_HINT_CHARS) {
    errors.push(
      `Case is too shallow (${totalHintChars} total hint characters, need at least ${MIN_TOTAL_HINT_CHARS})`
    );
  }

  if (concreteHintCount < 3) {
    errors.push("Case lacks enough concrete clinical detail across hints");
  }

  const categories = output.hints.map((hint) => hint.category);
  if (new Set(categories).size !== 5) {
    errors.push(`Hints have duplicate categories: ${categories.join(", ")}`);
  }

  const sortedOrders = [...output.hints].map((hint) => hint.order).sort((a, b) => a - b);
  if (JSON.stringify(sortedOrders) !== JSON.stringify([1, 2, 3, 4, 5])) {
    errors.push(`Hints have incorrect order values: ${sortedOrders.join(", ")}`);
  }

  for (const hint of output.hints) {
    const hintText = normalizeToken(hint.text);
    for (const token of forbiddenTokens) {
      if (token && hintText.includes(token)) {
        errors.push(`Hint ${hint.order} contains forbidden token "${token}"`);
      }
    }

    if (hint.category === "lab") {
      for (const unit of containsForbiddenLabUnits(hint.text)) {
        errors.push(`Hint ${hint.order} uses non-European lab units (${unit})`);
      }
    }

    for (const genericPattern of containsGenericCasePhrasing(hint.text)) {
      errors.push(`Hint ${hint.order} uses generic case phrasing (${genericPattern})`);
    }

    for (const usPattern of containsUsCentricFraming(hint.text)) {
      errors.push(`Hint ${hint.order} uses US-centered framing (${usPattern})`);
    }
  }

  const subtypeMismatch = detectSubtypeMismatchForTarget(job.pathogen.id, output);
  if (subtypeMismatch) {
    errors.push(subtypeMismatch);
  }

  return { valid: errors.length === 0, errors };
}

function normalizeCaseOutput(
  rawCase: z.infer<typeof RawCaseOutputSchema>,
  job: GenerationJob
): {
  hints: [Hint, Hint, Hint, Hint, Hint];
  difficulty: DifficultyLevel;
  explanation: string;
} {
  const normalizedHints = rawCase.hints.map((hint, index) => ({
    order: (hint.order ?? (index + 1)) as Hint["order"],
    text: (hint.text ?? hint.hint ?? "").trim(),
    category: hint.category,
  })) as [Hint, Hint, Hint, Hint, Hint];

  return {
    hints: normalizedHints,
    difficulty: rawCase.difficulty ?? job.difficulty,
    explanation: buildCaseExplanation(job.pathogen.id, normalizedHints),
  };
}

function countCasesByPathogenAndDifficulty(
  cases: PathogenCaseCandidate[],
  pool: GenerationPool
): Map<string, Record<DifficultyLevel, number>> {
  const counts = new Map<string, Record<DifficultyLevel, number>>();

  for (const entry of PATHOGEN_GENERATION_PLAN) {
    counts.set(entry.id, { easy: 0, medium: 0, hard: 0 });
  }

  for (const candidate of cases) {
    if (candidate.pool !== pool) continue;
    const record = counts.get(candidate.pathogenId);
    if (!record) continue;
    record[candidate.difficulty] += 1;
  }

  return counts;
}

function totalCasesForRecord(record: Record<DifficultyLevel, number>): number {
  return record.easy + record.medium + record.hard;
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getSeedDifficultyOrder(
  pathogen: PathogenGenerationPlanEntry,
  pool: GenerationPool
): DifficultyLevel[] {
  if (pathogen.tier === "rare_bonus") {
    return ["hard", "medium", "easy"];
  }

  if (pathogen.tier === "usmle_extended") {
    return ["medium", "hard", "easy"];
  }

  if (pathogen.kind !== "bacterium") {
    // Non-bacterial core pathogens were getting stuck with only easy cases
    // during breadth-first seeding. Rotate the first seeded difficulty so
    // virus / parasite / fungal pools develop medium and hard coverage earlier
    // in both free-play and daily generation.
    return hashString(pathogen.id) % 2 === 0
      ? ["medium", "hard", "easy"]
      : ["hard", "medium", "easy"];
  }

  return ["easy", "medium", "hard"];
}

function chooseSeedDifficulty(
  pathogen: PathogenGenerationPlanEntry,
  pool: GenerationPool,
  existing: Record<DifficultyLevel, number>
): DifficultyLevel | null {
  for (const difficulty of getSeedDifficultyOrder(pathogen, pool)) {
    if (pathogen.quotas[pool].byDifficulty[difficulty] > existing[difficulty]) {
      return difficulty;
    }
  }

  return null;
}

function chooseNextDifficulty(
  pathogen: PathogenGenerationPlanEntry,
  pool: GenerationPool,
  existing: Record<DifficultyLevel, number>
): DifficultyLevel | null {
  const levels = (["easy", "medium", "hard"] as DifficultyLevel[]).filter(
    (difficulty) => pathogen.quotas[pool].byDifficulty[difficulty] > existing[difficulty]
  );

  if (levels.length === 0) {
    return null;
  }

  return levels.sort((a, b) => {
    const aQuota = pathogen.quotas[pool].byDifficulty[a];
    const bQuota = pathogen.quotas[pool].byDifficulty[b];
    const aRatio = aQuota === 0 ? Number.POSITIVE_INFINITY : existing[a] / aQuota;
    const bRatio = bQuota === 0 ? Number.POSITIVE_INFINITY : existing[b] / bQuota;

    if (aRatio !== bRatio) return aRatio - bRatio;

    const aDeficit = aQuota - existing[a];
    const bDeficit = bQuota - existing[b];
    if (aDeficit !== bDeficit) return bDeficit - aDeficit;

    const preferenceOrder: DifficultyLevel[] = ["easy", "medium", "hard"];
    return preferenceOrder.indexOf(a) - preferenceOrder.indexOf(b);
  })[0];
}

function sortPathogensForPlanning(
  pool: GenerationPool,
  counts: Map<string, Record<DifficultyLevel, number>>,
  pathogens: PathogenGenerationPlanEntry[]
): PathogenGenerationPlanEntry[] {
  return [...pathogens].sort((a, b) => {
    const aExisting = counts.get(a.id) ?? { easy: 0, medium: 0, hard: 0 };
    const bExisting = counts.get(b.id) ?? { easy: 0, medium: 0, hard: 0 };
    const aTotal = totalCasesForRecord(aExisting);
    const bTotal = totalCasesForRecord(bExisting);

    if (aTotal !== bTotal) return aTotal - bTotal;

    const aFillRatio =
      a.quotas[pool].total === 0 ? 1 : aTotal / a.quotas[pool].total;
    const bFillRatio =
      b.quotas[pool].total === 0 ? 1 : bTotal / b.quotas[pool].total;
    if (aFillRatio !== bFillRatio) return aFillRatio - bFillRatio;

    const aRemaining = a.quotas[pool].total - aTotal;
    const bRemaining = b.quotas[pool].total - bTotal;
    if (aRemaining !== bRemaining) return bRemaining - aRemaining;

    return a.canonical.localeCompare(b.canonical);
  });
}

function buildGenerationJobs(
  pool: GenerationPool,
  existingCases: PathogenCaseCandidate[],
  targetCount?: number,
  pathogenId?: string
): GenerationJob[] {
  const counts = countCasesByPathogenAndDifficulty(existingCases, pool);
  const jobs: GenerationJob[] = [];
  let remainingBudget = targetCount ?? Number.POSITIVE_INFINITY;

  const candidates = PATHOGEN_GENERATION_PLAN.filter(
    (entry) => !pathogenId || entry.id === pathogenId
  );

  if (!pathogenId) {
    const earlyCoverageTarget = EARLY_COVERAGE_TARGETS[pool];
    for (const pathogen of sortPathogensForPlanning(pool, counts, candidates)) {
      if (remainingBudget <= 0) break;

      const existing = counts.get(pathogen.id) ?? { easy: 0, medium: 0, hard: 0 };
      const existingTotal = totalCasesForRecord(existing);
      const remainingForPathogen = pathogen.quotas[pool].total - existingTotal;

      if (remainingForPathogen <= 0 || existingTotal >= earlyCoverageTarget) {
        continue;
      }

      const difficulty = chooseSeedDifficulty(pathogen, pool, existing);
      if (!difficulty) continue;

      const difficultyDeficit =
        pathogen.quotas[pool].byDifficulty[difficulty] - existing[difficulty];
      const count = Math.min(
        1,
        earlyCoverageTarget - existingTotal,
        difficultyDeficit,
        remainingBudget
      );

      if (count <= 0) continue;

      jobs.push({ pathogen, pool, difficulty, count });
      existing[difficulty] += count;
      remainingBudget -= count;
    }
  }

  for (const pathogen of sortPathogensForPlanning(pool, counts, candidates)) {
    if (remainingBudget <= 0) break;

    const existing = counts.get(pathogen.id) ?? { easy: 0, medium: 0, hard: 0 };

    while (remainingBudget > 0) {
      const difficulty = chooseNextDifficulty(pathogen, pool, existing);
      if (!difficulty) break;

      const deficit = pathogen.quotas[pool].byDifficulty[difficulty] - existing[difficulty];
      const count = Math.min(CASES_PER_REQUEST, deficit, remainingBudget);
      if (count <= 0) break;

      jobs.push({ pathogen, pool, difficulty, count });
      existing[difficulty] += count;
      remainingBudget -= count;
    }
  }

  return jobs;
}

function buildTierDifficultyGuidance(pathogen: PathogenGenerationPlanEntry): string {
  switch (pathogen.tier) {
    case "usmle_extended":
      return "This is an extended-coverage pathogen. Even when the requested label is medium, keep the first two hints restrained and differential-preserving. Do not spend the opening clues on classic buzzwords, signature microscopy, or a dead-obvious exposure-pattern combination.";
    case "rare_bonus":
      return "This is a rare-bonus pathogen. Difficulty should reflect that rarity. The first two hints must stay broad enough that a well-prepared learner still needs later clues. Do not front-load signature exposures, hallmark named findings, or highly specific diagnostic language.";
    default:
      return "This is a core pathogen. The requested difficulty may still range from classic/easier to subtle/harder depending on the prompt.";
  }
}

function buildGenerationUserPrompt(
  job: GenerationJob,
  retryFeedback: string[]
): string {
  const retrySection =
    retryFeedback.length > 0
      ? `\nPrevious attempt feedback. Fix every issue below in the next output:\n- ${retryFeedback.join(
          "\n- "
        )}\n`
      : "";

  return `Generate exactly ${job.count} distinct ${job.difficulty} clinical mystery cases for the pathogen "${job.pathogen.canonical}".

Pathogen class: ${job.pathogen.kind}
Pool target: ${job.pool}
Editorial tier: ${job.pathogen.tier}
Narrative style: original cases inspired by formal MGH case-report pacing, but not copied from any real report.
Tier guidance: ${buildTierDifficultyGuidance(job.pathogen)}

Each case must:
- be a different patient scenario or setting
- preserve internal realism from history through confirmatory clue
- avoid naming or directly telegraphing "${job.pathogen.canonical}"
- make the requested difficulty believable
- feel comparably detailed to a strong teaching case, not a short board-review flashcard
- include concrete patient details such as age, time course, comorbidity, procedure, travel, immune status, examination finding, or named investigation results
- make hint 1 a concrete patient vignette, never a generic background clue
- make hint 1 literally read like a vignette opening, ideally beginning with "A [age]-year-old..." or an equivalent patient-first construction
- make hint 1 specific enough that a learner could form a real differential diagnosis from it alone
- make hint 1 include age, time course, setting, key symptoms, and at least one nontrivial objective detail such as a vital sign, examination finding, functional limitation, or severity marker
- make the first two sentences of hint 1 describe the patient, setting, time course, and at least one concrete examination, severity, or exposure detail
- keep hint 1 clinically rich but not diagnostically overcompressed
- if difficulty is "easy", hint 1 may be fairly classic and suggestive
- if difficulty is "medium", hint 1 should be clinically plausible but not strongly diagnostic on its own; avoid stacking hallmark findings or a signature board-style presentation in the opening clue
- if difficulty is "medium", hold back at least one major discriminator for hints 3-5
- if difficulty is "medium", do not use classic buzzwords or highly specific microscopy, histology, toxin, antigen, or nucleic-acid clues in hints 1-2
- if the pathogen is extended-coverage or rare-bonus, make hints 1-2 more restrained than you would for a core pathogen at the same label
- if the pathogen is extended-coverage or rare-bonus, avoid pairing a signature exposure with a signature syndrome in hints 1-2
- if difficulty is "hard", hint 1 should be deliberately non-obvious from a pathogen-identification standpoint; the learner should need multiple later hints to narrow the answer confidently
- if difficulty is "hard", avoid the signature giveaway presentation and avoid stacking multiple classic hallmark findings into hint 1
- if difficulty is "hard", hint 2 may add context, but it must not collapse the differential to a single pathogen
- if difficulty is "hard", reserve the most pathogen-specific clue for hint 4 or hint 5
- if difficulty is "hard", do not use named classic findings such as "strawberry tongue", "sandpaper rash", "Koplik spots", "erythema migrans", "pseudomembrane", "chancre", or similarly signature board-style buzzwords in hints 1-2
- if difficulty is "hard", do not mention distinctive microscopy, named antigen tests, toxin names, or signature histopathology in hints 1-2
- if the pathogen is rare-bonus, hint 1 must not revolve around an iconic single exposure that nearly names the organism by itself
- ensure hint 1 is the "presentation" category
- use "history" for patient-specific background such as medical history, immune status, procedures, vaccination status, or illness course
- use European / SI-style lab units whenever laboratory values are given
- if you mention blood counts, prefer notation like "14.2 × 10^9/L"; never use /uL, /μL, /µL, K/uL, or K/µL
- use exactly the JSON field names "order", "category", and "text" inside hints
- include a top-level "difficulty" for every case
- include no extra keys such as "patient", "vignette", or "diagnosis"
- avoid generic pathogen facts that are not explicitly tied to this patient
- avoid making the case depend on specifically US-only agencies, insurance, or holiday framing unless clinically essential
- never use filler terms like "classically", "typically", "this organism is", "this infection is", or "is associated with"
- for hepatitis viruses, generic disease-level wording like acute hepatitis or transaminitis is acceptable, but never include subtype labels like hepatitis A/B/C/D/E or abbreviations such as HAV, HBV, HCV, HDV, or HEV
- occasional US references are acceptable, but the case should still read clearly to a global medical audience${retrySection}

Return JSON only.

Exact output shape:
${OUTPUT_SHAPE_EXAMPLE}`;
}

async function generateCasesForJob(
  client: OpenAI,
  job: GenerationJob,
  sequenceIndex: number
): Promise<PathogenCaseCandidate[]> {
  const BatchOutputSchema = buildBatchOutputSchema(job.count);
  let retryFeedback: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const userPrompt = buildGenerationUserPrompt(job, retryFeedback);
      const response = await client.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response from API");

      const parsed = BatchOutputSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        retryFeedback = parsed.error.issues.map((issue) => issue.message);
        console.warn(
          `  Schema error (attempt ${attempt + 1}):`,
          parsed.error.issues.map((issue) => issue.message).join("; ")
        );
        if (attempt < MAX_RETRIES) continue;
        return [];
      }

      const validCaseOutputs: Array<{
        caseOutput: ReturnType<typeof normalizeCaseOutput>;
        caseIndex: number;
      }> = [];
      const validationFeedback = new Set<string>();
      let caseIndex = 0;

      for (const rawCase of parsed.data.cases) {
        const caseOutput = normalizeCaseOutput(rawCase, job);
        const validation = validateCaseOutput(caseOutput, job);
        if (!validation.valid) {
          validation.errors.forEach((error) => validationFeedback.add(error));
          console.warn(
            `  Case ${caseIndex + 1} failed validation:`,
            validation.errors.join("; ")
          );
          caseIndex += 1;
          continue;
        }

        validCaseOutputs.push({ caseOutput, caseIndex });
        caseIndex += 1;
      }

      const generatedExplanations = await generateEducationalExplanations(
        client,
        validCaseOutputs.map(({ caseOutput, caseIndex }) => ({
          id: `path-${job.pool}-${job.pathogen.id}-${job.difficulty}-${sequenceIndex}-${caseIndex}`,
          organismId: job.pathogen.id,
          hints: caseOutput.hints,
        })),
        MODEL
      );

      const results: PathogenCaseCandidate[] = [];
      for (const { caseOutput, caseIndex } of validCaseOutputs) {
        const explanation =
          generatedExplanations.get(
            `path-${job.pool}-${job.pathogen.id}-${job.difficulty}-${sequenceIndex}-${caseIndex}`
          ) ?? buildCaseExplanation(job.pathogen.id, caseOutput.hints);

        results.push({
          id: `path-${job.pool}-${job.pathogen.id}-${job.difficulty}-${Date.now()}-${sequenceIndex}-${caseIndex}`,
          pathogenId: job.pathogen.id,
          acceptedOrganismIds: getAcceptedOrganismIdsForCase({
            organismId: job.pathogen.id,
            hints: caseOutput.hints,
            explanation,
          }),
          pathogenKind: job.pathogen.kind,
          model: MODEL,
          pool: job.pool,
          hints: [...caseOutput.hints].sort((a, b) => a.order - b.order) as [
            Hint,
            Hint,
            Hint,
            Hint,
            Hint
          ],
          difficulty: caseOutput.difficulty,
          explanation,
          source: "ai_generated",
          validated: true,
          createdAt: new Date().toISOString(),
          style: "mgh_case_report",
        });
      }

      if (results.length === 0 && validationFeedback.size > 0 && attempt < MAX_RETRIES) {
        retryFeedback = [...validationFeedback];
        await sleep(1500 * (attempt + 1));
        continue;
      }

      return results;
    } catch (error) {
      console.warn(`  API error (attempt ${attempt + 1}):`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * (attempt + 1));
      }
    }
  }

  return [];
}

function parsePool(args: string[]): GenerationPool {
  const poolArg = args.find((arg) => arg.startsWith("--pool="));
  const pool = poolArg?.split("=")[1];
  return pool === "daily" ? "daily" : "freeplay";
}

function parseCount(args: string[]): number | undefined {
  const countArg = args.find((arg) => arg.startsWith("--count="));
  if (!countArg) return undefined;

  const parsed = Number.parseInt(countArg.split("=")[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePathogenId(args: string[]): string | undefined {
  const idArg = args.find((arg) => arg.startsWith("--pathogen-id="));
  return idArg?.split("=")[1];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
  }

  const pool = parsePool(args);
  const targetCount = parseCount(args);
  const pathogenId = parsePathogenId(args);
  const client = new OpenAI({ apiKey });

  const existingCases = loadExistingCases(pool);
  const jobs = buildGenerationJobs(pool, existingCases, targetCount, pathogenId);
  const poolTotals = PATHOGEN_GENERATION_PLAN_TOTALS[pool];

  if (pathogenId && !PATHOGEN_GENERATION_PLAN.some((entry) => entry.id === pathogenId)) {
    console.error(`Unknown pathogen id: ${pathogenId}`);
    process.exit(1);
  }

  if (jobs.length === 0) {
    console.log(`No generation jobs needed for pool "${pool}".`);
    console.log(`Existing cases: ${existingCases.length}`);
    console.log(`Target total:   ${poolTotals.total}`);
    return;
  }

  const requestedCases = jobs.reduce((sum, job) => sum + job.count, 0);
  const estimatedPromptCalls = jobs.length;
  const estimatedInputTokens = estimatedPromptCalls * 850;
  const estimatedOutputTokens = requestedCases * 650;
  const estimatedCostUSD =
    (estimatedInputTokens / 1_000_000) * 0.25 +
    (estimatedOutputTokens / 1_000_000) * 2.0;

  console.log(`\nPathogen Case Generation`);
  console.log(`────────────────────────`);
  console.log(`Pool:            ${pool}`);
  console.log(`Catalog target:  ${poolTotals.total}`);
  console.log(`Pool before:     ${existingCases.length}`);
  console.log(`Jobs queued:     ${jobs.length}`);
  console.log(`Cases requested: ${requestedCases}`);
  console.log(`Est. cost:       $${estimatedCostUSD.toFixed(3)}\n`);

  const allCases = [...existingCases];
  let added = 0;
  let rejected = 0;
  let nextJobIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextJobIndex++;
      if (index >= jobs.length) break;
      const job = jobs[index];
      process.stdout.write(
        `[${index + 1}/${jobs.length}] ${job.pathogen.canonical} (${job.difficulty}, ${job.count})... `
      );
      const cases = await generateCasesForJob(client, job, index);
      added += cases.length;
      rejected += job.count - cases.length;
      allCases.push(...cases);
      console.log(`${cases.length}/${job.count} accepted`);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_REQUESTS, jobs.length) }, worker)
  );

  saveCases(pool, allCases);

  console.log(`\n────────────────────────`);
  console.log(`Added:    ${added} cases`);
  console.log(`Rejected: ${rejected} cases`);
  console.log(`Pool now: ${allCases.length} cases`);
  console.log(`Output:   ${getCaseStorePath()} (${pool} pool)`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
