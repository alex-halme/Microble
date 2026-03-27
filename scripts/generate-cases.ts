/**
 * scripts/generate-cases.ts
 *
 * Offline case generation pipeline. Run with:
 *   npx tsx scripts/generate-cases.ts [options]
 *
 * Cost strategy:
 *   1. BATCH per organism: ask for N cases in a single API call (amortises system prompt)
 *   2. OpenAI Batch API: --batch flag submits an async job (50% cost, 24h turnaround)
 *   3. No critique pass: validation is local-only (fast + free)
 *   4. Structured outputs: JSON schema enforced by the API, no parsing retries
 *   5. gpt-4o-mini: cheapest capable model (~$0.15/1M input, $0.60/1M output)
 *
 * Approximate cost: 60 organisms × 3 cases each ≈ 180 cases ≈ $0.10 total
 * With --batch flag: ≈ $0.05 total
 */

import OpenAI from "openai";
import { z } from "zod";
import fs from "fs";
import { ORGANISMS } from "../lib/organisms.js";
import {
  getCaseStorePath,
  listStoredCasesByPool,
  upsertCases,
} from "../lib/caseStore.js";
import {
  detectSubtypeMismatchForTarget,
  getAcceptedOrganismIdsForCase,
} from "../lib/caseAnswers.js";
import type { MicrobleCase, Hint, HintCategory, Organism } from "../lib/types.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL = "gpt-5-mini";
const CASES_PER_ORGANISM = 3; // cases generated per API call per organism
const MAX_RETRIES = 2;
const MIN_TOTAL_HINT_CHARS = 520;
const MIN_EXPLANATION_CHARS = 140;

// ─── Zod schema ───────────────────────────────────────────────────────────────

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

const CaseOutputSchema = z.object({
  hints: z.array(HintSchema).length(5),
  difficulty: z.enum(["easy", "medium", "hard"]),
  explanation: z.string().min(50).max(1000),
});

const BatchOutputSchema = z.object({
  cases: z.array(CaseOutputSchema).min(1).max(CASES_PER_ORGANISM + 2),
});

type CaseOutput = z.infer<typeof CaseOutputSchema>;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a medical educator creating clinical cases for a microbiology guessing game.
Players must identify the causative organism from 5 sequential clinical hints.

RULES (strictly enforced):
1. Hints must move from initial patient presentation toward the most specific later clue
2. Hint 1 must be a patient presentation vignette, not a generic background statement
2a. Hint 1 should usually begin with a direct patient-first construction such as "A 43-year-old..." or "A previously well 6-year-old..."
3. Hint 1 must use the "presentation" category
4. Hint 5 should allow a medical student to identify the organism
5. No hint may contain the organism's genus name, species name, any abbreviation, or common name
6. Each hint must use a DIFFERENT category from: presentation, history, lab, imaging, exposure, treatment_response
7. Any lab values must use European / SI-style units when units are given
8. All clinical details must be medically accurate
9. Every hint must stay anchored to the patient's case rather than stating generic pathogen facts
10. Cases should be richer and more specific than a flashcard vignette, with concrete patient detail and a realistic clinical arc.
11. Avoid US-centered assumptions unless location is essential; prefer globally legible terminology and settings.
12. Medium and hard cases must not be too guessable from hint 1 alone. The presentation should support a differential diagnosis rather than immediately revealing the organism through a classic textbook syndrome.
13. Avoid LLM-style punctuation mannerisms. Do not use semicolons, em dashes, or en dashes in hints or explanations. Prefer short, direct sentences with commas or full stops.
14. Explanations should read like short diagnostic reasoning, not a textbook mini-essay. Prefer 2-4 direct sentences explaining why this patient's clues support the diagnosis.

OUTPUT: Return a JSON object with a "cases" array containing exactly ${CASES_PER_ORGANISM} distinct case objects.
Each case must be a different clinical scenario for the same organism (different patient, setting, or presentation).`;

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
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
    /\b(man|woman|male|female|boy|girl|patient|student|traveler|child|adult|retiree|worker)\b/i.test(
      text
    );
  const hasClinicalCue =
    /\b(presents?|presented|reports?|developed|arrives?|comes?|has|with)\b/i.test(text) &&
    /\b(fever|cough|headache|diarrhea|pain|rash|dyspnea|vomiting|dysuria|confusion|meningismus|seizure|ulcer|lesion|discharge|weakness)\b/i.test(
      text
    );

  return (hasAge || hasPatientAnchor) && hasClinicalCue;
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

function validateCase(
  output: CaseOutput,
  organism: Organism
): ValidationResult {
  const errors: string[] = [];
  const firstHint = output.hints.find((hint) => hint.order === 1) ?? output.hints[0];
  const totalHintChars = output.hints.reduce((sum, hint) => sum + hint.text.length, 0);
  const concreteHintCount = output.hints.filter((hint) =>
    hasConcreteClinicalDetail(hint.text)
  ).length;

  // Build token list: all names that must not appear in hints
  const forbiddenTokens = [
    organism.canonical.toLowerCase(),
    organism.genus?.toLowerCase(),
    organism.species?.toLowerCase(),
    ...organism.abbreviations.map((a) => a.toLowerCase()),
    ...organism.commonNames.map((n) => n.toLowerCase()),
  ].filter(Boolean) as string[];

  for (const hint of output.hints) {
    const hintLower = hint.text.toLowerCase();
    for (const token of forbiddenTokens) {
      if (hintLower.includes(token)) {
        errors.push(
          `Hint ${hint.order} contains forbidden token "${token}"`
        );
      }
    }
  }

  // Hint categories must all be distinct
  const categories = output.hints.map((h) => h.category);
  const uniqueCategories = new Set(categories);
  if (uniqueCategories.size < 5) {
    errors.push(`Hints have duplicate categories: ${categories.join(", ")}`);
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

  if (totalHintChars < MIN_TOTAL_HINT_CHARS) {
    errors.push(
      `Case is too shallow (${totalHintChars} total hint characters, need at least ${MIN_TOTAL_HINT_CHARS})`
    );
  }

  if (output.explanation.length < MIN_EXPLANATION_CHARS) {
    errors.push(
      `Explanation is too brief (${output.explanation.length} chars, need at least ${MIN_EXPLANATION_CHARS})`
    );
  }

  if (concreteHintCount < 3) {
    errors.push("Case lacks enough concrete clinical detail across hints");
  }

  // Hints must be ordered 1–5
  const orders = output.hints.map((h) => h.order).sort((a, b) => a - b);
  if (JSON.stringify(orders) !== JSON.stringify([1, 2, 3, 4, 5])) {
    errors.push(`Hints have incorrect order values: ${orders.join(", ")}`);
  }

  for (const hint of output.hints) {
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

  for (const genericPattern of containsGenericCasePhrasing(output.explanation)) {
    errors.push(`Explanation uses generic phrasing (${genericPattern})`);
  }

  const subtypeMismatch = detectSubtypeMismatchForTarget(organism.id, output);
  if (subtypeMismatch) {
    errors.push(subtypeMismatch);
  }

  for (const usPattern of containsUsCentricFraming(output.explanation)) {
    errors.push(`Explanation uses US-centered framing (${usPattern})`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Generation ───────────────────────────────────────────────────────────────

async function generateCasesForOrganism(
  client: OpenAI,
  organism: Organism
): Promise<MicrobleCase[]> {
  const userPrompt = `Generate ${CASES_PER_ORGANISM} distinct clinical cases where the causative organism is: ${organism.canonical}

Each case must represent a different patient scenario, presentation, or clinical setting.
Each case should feel in-depth like a compact teaching case rather than a generic summary.
Use concrete patient details and globally legible medical framing rather than US-specific assumptions.
Make hint 1 literally read like a vignette opening, ideally beginning with "A [age]-year-old..." or an equivalent patient-first construction.
Make the first two sentences of hint 1 describe the patient, setting, time course, and at least one concrete examination, severity, or exposure detail.
US references are acceptable when natural to the case, but the vignette should not depend on specifically US-only agencies, insurance, or holiday framing.
If you label a case "medium", keep hint 1 clinically suggestive but not strongly diagnostic on its own; do not stack several classic hallmark findings at once, and hold back at least one important discriminator for later hints.
If you label a case "hard", make hint 1 genuinely non-obvious from a pathogen-identification standpoint: start with a plausible but broader clinical presentation, avoid the signature giveaway syndrome, and reserve the most pathogen-specific clue for hint 4 or hint 5.
Write the explanation as short diagnostic reasoning for this case, not as a generic pathogen mini-essay.
Remember: do NOT include "${organism.genus ?? ""}", "${organism.species ?? ""}", or any of these in the hints: ${[...organism.abbreviations, ...organism.commonNames].join(", ") || "none"}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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
        console.warn(
          `  Schema error (attempt ${attempt + 1}):`,
          parsed.error.issues.map((i) => i.message).join("; ")
        );
        if (attempt < MAX_RETRIES) continue;
        return [];
      }

      const results: MicrobleCase[] = [];
      let caseIndex = 0;

      for (const caseOutput of parsed.data.cases) {
        const validation = validateCase(caseOutput, organism);
        if (!validation.valid) {
          console.warn(
            `  Case ${caseIndex + 1} failed validation:`,
            validation.errors.join("; ")
          );
          caseIndex++;
          continue;
        }

        const microbleCase: MicrobleCase = {
          id: `gen-${organism.id}-${Date.now()}-${caseIndex}`,
          organismId: organism.id,
          acceptedOrganismIds: getAcceptedOrganismIdsForCase({
            organismId: organism.id,
            hints: caseOutput.hints,
            explanation: caseOutput.explanation,
          }),
          hints: caseOutput.hints.sort((a, b) => a.order - b.order) as [
            Hint,
            Hint,
            Hint,
            Hint,
            Hint
          ],
          difficulty: caseOutput.difficulty,
          explanation: caseOutput.explanation,
          source: "ai_generated",
          validated: true,
          createdAt: new Date().toISOString(),
        };

        results.push(microbleCase);
        caseIndex++;
      }

      return results;
    } catch (err) {
      console.warn(`  API error (attempt ${attempt + 1}):`, err);
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * (attempt + 1)); // exponential backoff
        continue;
      }
    }
  }

  return [];
}

// ─── Batch API mode ───────────────────────────────────────────────────────────
//
// The OpenAI Batch API costs 50% less and processes within 24 hours.
// Use --batch when you don't need cases immediately (pool top-up, daily prep).
// Use default (immediate) mode for small top-ups or testing.

async function submitBatchJob(
  client: OpenAI,
  organisms: Organism[]
): Promise<void> {
  const requests = organisms.map((organism, i) => ({
    custom_id: `case-gen-${organism.id}`,
    method: "POST" as const,
    url: "/v1/chat/completions",
    body: {
      model: MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate ${CASES_PER_ORGANISM} distinct clinical cases where the causative organism is: ${organism.canonical}\n\nEach case must represent a different patient scenario. Do NOT include "${organism.genus ?? ""}", "${organism.species ?? ""}", or any abbreviations in the hints.`,
        },
      ],
    },
  }));

  // Write JSONL file for batch upload
  const batchFile = "data/batch-requests.jsonl";
  fs.writeFileSync(batchFile, requests.map((r) => JSON.stringify(r)).join("\n"));

  const uploadedFile = await client.files.create({
    file: fs.createReadStream(batchFile),
    purpose: "batch",
  });

  const batch = await client.batches.create({
    input_file_id: uploadedFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(`\nBatch job submitted!`);
  console.log(`  Batch ID: ${batch.id}`);
  console.log(`  Status: ${batch.status}`);
  console.log(`  Organisms: ${organisms.length}`);
  console.log(`  Expected cases: ${organisms.length * CASES_PER_ORGANISM}`);
  console.log(`\nTo check status: npx tsx scripts/generate-cases.ts --batch-status ${batch.id}`);
  console.log(`To retrieve results: npx tsx scripts/generate-cases.ts --batch-retrieve ${batch.id}`);
}

async function retrieveBatchResults(
  client: OpenAI,
  batchId: string
): Promise<void> {
  const batch = await client.batches.retrieve(batchId);
  console.log(`Batch ${batchId}: ${batch.status}`);

  if (batch.status !== "completed") {
    console.log(
      `Not ready yet. Completed: ${batch.request_counts?.completed ?? 0}/${batch.request_counts?.total ?? "?"}`
    );
    return;
  }

  if (!batch.output_file_id) {
    console.error("Batch completed but no output file ID found.");
    return;
  }

  const fileContent = await client.files.content(batch.output_file_id);
  const lines = (await fileContent.text()).split("\n").filter(Boolean);

  const existingCases = loadExistingCases();
  let added = 0;
  let rejected = 0;

  for (const line of lines) {
    const result = JSON.parse(line);
    const customId: string = result.custom_id;
    const organismId = customId.replace("case-gen-", "");
    const organism = ORGANISMS.find((o) => o.id === organismId);
    if (!organism) continue;

    const raw = result.response?.body?.choices?.[0]?.message?.content;
    if (!raw) continue;

    const parsed = BatchOutputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) { rejected++; continue; }

    let caseIdx = 0;
    for (const caseOutput of parsed.data.cases) {
      const validation = validateCase(caseOutput, organism);
      if (!validation.valid) { rejected++; caseIdx++; continue; }

      existingCases.push({
        id: `gen-${organism.id}-batch-${batchId.slice(-6)}-${caseIdx}`,
        organismId: organism.id,
        acceptedOrganismIds: getAcceptedOrganismIdsForCase({
          organismId: organism.id,
          hints: caseOutput.hints,
          explanation: caseOutput.explanation,
        }),
        hints: caseOutput.hints.sort((a, b) => a.order - b.order) as [Hint, Hint, Hint, Hint, Hint],
        difficulty: caseOutput.difficulty,
        explanation: caseOutput.explanation,
        source: "ai_generated",
        validated: true,
        createdAt: new Date().toISOString(),
      });
      added++;
      caseIdx++;
    }
  }

  saveGeneratedCases(existingCases);
  console.log(`\nResults saved: ${added} cases added, ${rejected} rejected`);
  console.log(`Total pool size: ${existingCases.length}`);
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

function loadExistingCases(): MicrobleCase[] {
  return listStoredCasesByPool("freeplay").map((record) => ({
    id: record.id,
    organismId: record.pathogenId,
    acceptedOrganismIds: record.acceptedOrganismIds,
    hints: record.hints,
    difficulty: record.difficulty,
    explanation: record.explanation,
    source: record.source,
    validated: record.validated,
    createdAt: record.createdAt,
  }));
}

function saveGeneratedCases(cases: MicrobleCase[]): void {
  upsertCases(
    "freeplay",
    cases.map((caseData) => ({
      id: caseData.id,
      pathogenId: caseData.organismId,
      acceptedOrganismIds: caseData.acceptedOrganismIds,
      hints: caseData.hints,
      difficulty: caseData.difficulty,
      explanation: caseData.explanation,
      source: caseData.source,
      validated: caseData.validated,
      createdAt: caseData.createdAt,
    }))
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // --batch-status <id>
  if (args[0] === "--batch-status") {
    const batchId = args[1];
    if (!batchId) { console.error("Usage: --batch-status <batch-id>"); process.exit(1); }
    const batch = await client.batches.retrieve(batchId);
    console.log(`Batch ${batchId}:`, batch.status);
    console.log(`  Completed: ${batch.request_counts?.completed ?? 0}/${batch.request_counts?.total ?? "?"}`);
    return;
  }

  // --batch-retrieve <id>
  if (args[0] === "--batch-retrieve") {
    const batchId = args[1];
    if (!batchId) { console.error("Usage: --batch-retrieve <batch-id>"); process.exit(1); }
    await retrieveBatchResults(client, batchId);
    return;
  }

  // Parse flags
  const useBatchAPI = args.includes("--batch");
  const countArg = args.find((a) => a.startsWith("--count="));
  const targetCount = countArg ? parseInt(countArg.split("=")[1]) : 180;

  // Determine which organisms to generate for
  // Distribute evenly across the organism list until we hit targetCount
  const existingCases = loadExistingCases();
  const existingCountById = new Map<string, number>();
  for (const c of existingCases) {
    existingCountById.set(c.organismId, (existingCountById.get(c.organismId) ?? 0) + 1);
  }

  // Prioritise organisms with fewest existing cases (fill gaps first)
  const organismsToGenerate = [...ORGANISMS]
    .sort(
      (a, b) =>
        (existingCountById.get(a.id) ?? 0) - (existingCountById.get(b.id) ?? 0)
    )
    .slice(0, Math.ceil(targetCount / CASES_PER_ORGANISM));

  const estimatedCases = organismsToGenerate.length * CASES_PER_ORGANISM;
  // Cost estimate: ~1000 tokens/call (system+user ≈ 600 input, response ≈ 400 output)
  const estimatedInputTokens = organismsToGenerate.length * 700;
  const estimatedOutputTokens = organismsToGenerate.length * 600;
  const estimatedCostUSD =
    (estimatedInputTokens / 1_000_000) * 0.15 +
    (estimatedOutputTokens / 1_000_000) * 0.6;
  const batchCostUSD = estimatedCostUSD * 0.5;

  console.log(`\nMicroble Case Generation`);
  console.log(`────────────────────────`);
  console.log(`Organisms:      ${organismsToGenerate.length}`);
  console.log(`Cases/organism: ${CASES_PER_ORGANISM}`);
  console.log(`Target cases:   ~${estimatedCases}`);
  console.log(`Pool before:    ${existingCases.length}`);
  console.log(
    `Est. cost:      $${estimatedCostUSD.toFixed(3)} (immediate) / $${batchCostUSD.toFixed(3)} (batch API)\n`
  );

  if (useBatchAPI) {
    console.log(`Submitting Batch API job...`);
    await submitBatchJob(client, organismsToGenerate);
    return;
  }

  // Immediate generation
  console.log(`Generating cases immediately...`);
  const allCases = [...existingCases];
  let added = 0;
  let rejected = 0;

  for (let i = 0; i < organismsToGenerate.length; i++) {
    const organism = organismsToGenerate[i];
    process.stdout.write(
      `[${i + 1}/${organismsToGenerate.length}] ${organism.canonical}... `
    );

    const cases = await generateCasesForOrganism(client, organism);
    added += cases.length;
    rejected += CASES_PER_ORGANISM - cases.length;
    allCases.push(...cases);

    console.log(`${cases.length}/${CASES_PER_ORGANISM} accepted`);

    // Rate limit: 3 requests/sec for gpt-4o-mini (adjust if needed)
    if (i < organismsToGenerate.length - 1) await sleep(400);
  }

  saveGeneratedCases(allCases);

  console.log(`\n──────────────────────────────`);
  console.log(`Added:    ${added} cases`);
  console.log(`Rejected: ${rejected} cases`);
  console.log(`Pool now: ${allCases.length} cases`);
  console.log(`Output:   ${getCaseStorePath()} (freeplay pool)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
