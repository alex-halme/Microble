import OpenAI from "openai";
import { z } from "zod";
import { buildCaseExplanation, isEducationalCaseExplanation } from "./caseExplanation";
import { ORGANISM_MAP } from "./organisms";
import type { Hint } from "./types";

const EXPLANATION_BATCH_SIZE = 4;
const MAX_PARALLEL_BATCHES = 4;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 45_000;

export interface ExplanationGenerationInput {
  id: string;
  organismId: string;
  hints: readonly Hint[];
}

const ExplanationItemSchema = z.object({
  id: z.string().min(1),
  diagnosisSummary: z.string().min(40).max(500),
  reasoning: z.string().min(60).max(900),
  teachingPoint: z.string().min(40).max(500),
});

function buildBatchSchema(expectedCount: number) {
  return z.object({
    explanations: z.array(ExplanationItemSchema).length(expectedCount),
  });
}

function ensureSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function composeExplanation(
  organismId: string,
  item: z.infer<typeof ExplanationItemSchema>
): string {
  const organism =
    ORGANISM_MAP.get(organismId)?.canonical ??
    organismId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const summary = ensureSentence(item.diagnosisSummary);
  const reasoning = ensureSentence(item.reasoning);
  const teachingPoint = ensureSentence(item.teachingPoint);
  const combined = [summary, reasoning, teachingPoint].join(" ");

  return combined.includes(organism)
    ? combined
    : `The diagnosis is ${organism}. ${reasoning} ${teachingPoint}`;
}

function buildCasePrompt(input: ExplanationGenerationInput): string {
  const organism = ORGANISM_MAP.get(input.organismId);
  const canonical = organism?.canonical ?? input.organismId;
  const notes = organism?.notes ?? "No reference notes available.";
  const tags =
    organism?.classificationTags && organism.classificationTags.length > 0
      ? organism.classificationTags.join(", ")
      : "None";

  const hints = [...input.hints]
    .sort((left, right) => left.order - right.order)
    .map((hint) => `${hint.order}. [${hint.category}] ${hint.text}`)
    .join("\n");

  return `Case ID: ${input.id}
Organism: ${canonical}
Reference notes: ${notes}
Classification tags: ${tags}
Hints:
${hints}`;
}

function buildSystemPrompt(): string {
  return `You are writing reveal explanations for a microbiology diagnosis game.

The player may be unfamiliar with the pathogen or its classic presentation.
Each explanation must therefore do three things:
1. State the diagnostic interpretation of the overall case, not just the answer.
2. Explain why the discriminating clues point to this organism rather than a broad generic differential.
3. Add one compact teaching point that helps the player learn something new about the organism, syndrome, transmission, morphology, toxin, or distinguishing pattern.

Strict requirements:
- Return JSON only.
- For each case, produce exactly three fields:
  - diagnosisSummary: 1-2 sentences naming the diagnosis or syndrome-level interpretation.
  - reasoning: 1-2 sentences explaining why the key clues matter diagnostically.
  - teachingPoint: 1 sentence that teaches something useful beyond merely restating the clues.
- Do not give routine treatment or management advice unless it is essential to understanding the diagnosis.
- Write fluent English prose, not bullet points.
- Avoid semicolons and em dashes.
- Be concise but genuinely educational.
- Copy every Case ID exactly into the output.
- Return exactly one explanation object per case.`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Explanation generation timed out after ${ms} ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function generateBatch(
  client: OpenAI,
  inputs: ExplanationGenerationInput[],
  model: string
): Promise<Map<string, string>> {
  const BatchSchema = buildBatchSchema(inputs.length);
  let feedback = "";
  const debug = process.env.DEBUG_CASE_EXPLANATIONS === "1";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            {
              role: "user",
              content: `Write explanations for these cases.${feedback ? `\n\nRevision feedback:\n${feedback}` : ""}

Return JSON in exactly this shape:
{
  "explanations": [
    {
      "id": "case-id",
      "diagnosisSummary": "...",
      "reasoning": "...",
      "teachingPoint": "..."
    }
  ]
}

Do not omit or rename the "id" field.

${inputs.map(buildCasePrompt).join("\n\n")}`,
            },
          ],
        }),
        REQUEST_TIMEOUT_MS
      );

      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        if (debug) {
          console.warn("Case explanation batch returned empty content");
        }
        feedback = "The prior response was empty.";
        continue;
      }

      const parsed = BatchSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        if (debug) {
          console.warn("Case explanation schema failure:", raw);
        }
        feedback = parsed.error.issues.map((issue) => issue.message).join("; ");
        continue;
      }

      const explanations = new Map<string, string>();
      const qualityFailures: string[] = [];

      for (const item of parsed.data.explanations) {
        const input = inputs.find((candidate) => candidate.id === item.id);
        if (!input) {
          qualityFailures.push(`Unexpected case id ${item.id}`);
          continue;
        }

        const explanation = composeExplanation(input.organismId, item);
        if (!isEducationalCaseExplanation(explanation, input.organismId)) {
          if (debug) {
            console.warn("Educational validation failure:", explanation);
          }
          qualityFailures.push(`Explanation for ${item.id} was not educational enough`);
          continue;
        }

        explanations.set(item.id, explanation);
      }

      if (explanations.size === inputs.length) {
        return explanations;
      }

      if (debug && feedback) {
        console.warn("Case explanation retry feedback:", feedback);
      }
      feedback = qualityFailures.join("; ");
    } catch (error) {
      if (debug) {
        console.warn("Case explanation request failure:", error);
      }
      feedback =
        error instanceof Error ? error.message : "Explanation generation request failed";
    }
  }

  return new Map(
    inputs.map((input) => [input.id, buildCaseExplanation(input.organismId, input.hints)])
  );
}

export async function generateEducationalExplanations(
  client: OpenAI,
  inputs: ExplanationGenerationInput[],
  model = "gpt-4.1-mini"
): Promise<Map<string, string>> {
  const explanations = new Map<string, string>();
  const batches: ExplanationGenerationInput[][] = [];

  for (let index = 0; index < inputs.length; index += EXPLANATION_BATCH_SIZE) {
    batches.push(inputs.slice(index, index + EXPLANATION_BATCH_SIZE));
  }

  for (
    let batchIndex = 0;
    batchIndex < batches.length;
    batchIndex += MAX_PARALLEL_BATCHES
  ) {
    const group = batches.slice(batchIndex, batchIndex + MAX_PARALLEL_BATCHES);
    const generatedGroup = await Promise.all(
      group.map((batch) => generateBatch(client, batch, model))
    );

    for (const generated of generatedGroup) {
      for (const [id, explanation] of generated) {
        explanations.set(id, explanation);
      }
    }
  }

  return explanations;
}
