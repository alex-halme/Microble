import fs from "fs";
import path from "path";
import OpenAI from "openai";
import {
  buildCaseExplanation,
  isEducationalCaseExplanation,
} from "../lib/caseExplanation.js";
import {
  generateEducationalExplanations,
  type ExplanationGenerationInput,
} from "../lib/caseExplanationGeneration.js";
import type { Hint } from "../lib/types.js";

type CaseLike = {
  id: string;
  organismId?: string;
  pathogenId?: string;
  hints?: Hint[];
  explanation?: string;
};

const FILES = [
  path.join(process.cwd(), "data", "legacy-daily-cases.json"),
  path.join(process.cwd(), "data", "daily-cases.json"),
  path.join(process.cwd(), "data", "generated-daily-pathogen-cases.json"),
  path.join(process.cwd(), "data", "generated-freeplay-pathogen-cases.json"),
];
const CHUNK_SIZE = 20;

const targetArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--file="))
  ?.slice("--file=".length);

function loadJsonFile(filePath: string): CaseLike[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as CaseLike[];
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });
  let totalUpdated = 0;

  for (const filePath of FILES) {
    if (targetArg && path.basename(filePath) !== targetArg) {
      continue;
    }
    if (!fs.existsSync(filePath)) continue;

    const records = loadJsonFile(filePath);
    console.log(`Refreshing ${path.basename(filePath)} (${records.length} records)...`);
    const inputs: ExplanationGenerationInput[] = records
      .map((record) => {
        const organismId = record.organismId ?? record.pathogenId;
        if (!organismId || !Array.isArray(record.hints) || record.hints.length !== 5) {
          return null;
        }
        if (
          record.explanation &&
          isEducationalCaseExplanation(record.explanation, organismId)
        ) {
          return null;
        }

        return {
          id: record.id,
          organismId,
          hints: record.hints,
        };
      })
      .filter((record): record is ExplanationGenerationInput => !!record);
    let changed = 0;

    let updated = [...records];

    for (let start = 0; start < inputs.length; start += CHUNK_SIZE) {
      const chunk = inputs.slice(start, start + CHUNK_SIZE);
      console.log(
        `  ${path.basename(filePath)}: chunk ${Math.floor(start / CHUNK_SIZE) + 1}/${Math.ceil(
          inputs.length / CHUNK_SIZE
        )} (${start + 1}-${Math.min(start + chunk.length, inputs.length)} of ${inputs.length})`
      );

      const generated = await generateEducationalExplanations(client, chunk);

      updated = updated.map((record) => {
        const organismId = record.organismId ?? record.pathogenId;
        if (!organismId || !Array.isArray(record.hints) || record.hints.length !== 5) {
          return record;
        }

        if (!generated.has(record.id)) {
          return record;
        }

        const explanation =
          generated.get(record.id) ?? buildCaseExplanation(organismId, record.hints);
        if (record.explanation !== explanation) {
          changed += 1;
        }

        return {
          ...record,
          explanation,
        };
      });

      fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }

    totalUpdated += changed;
    console.log(`${path.basename(filePath)}: ${changed} explanations refreshed`);
  }

  console.log(`Done. Refreshed ${totalUpdated} explanations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
