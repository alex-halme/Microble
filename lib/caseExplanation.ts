import { ORGANISM_MAP } from "./organisms";
import type { Hint } from "./types";

const SUPPORT_CATEGORY_WEIGHT: Record<Hint["category"], number> = {
  lab: 50,
  exposure: 40,
  imaging: 30,
  history: 20,
  treatment_response: 25,
  presentation: 0,
};

function fallbackOrganismName(organismId: string): string {
  return organismId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[;]+/g, ",")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function trimSentenceEnding(text: string): string {
  return text.trim().replace(/[.?!,:;\s-]+$/g, "").trim();
}

function lowerCaseInitial(text: string): string {
  if (!text) return text;
  if (/^[A-Z]{2,}\b/.test(text)) return text;
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function sentenceToClause(text: string): string {
  let clause = normalizeWhitespace(trimSentenceEnding(text));

  clause = clause.replace(
    /^(?:public health|public-health)\s+(?:follow-up|follow up|investigators?)\s+(?:found|confirmed)\s+(?:that\s+)?/i,
    ""
  );
  clause = clause.replace(/^(?:blood|laboratory)\s+tests:\s*/i, "");
  clause = clause.replace(/^on arrival[,]?\s*/i, "");
  clause = clause.replace(/^the patient\s+/i, "the patient ");
  clause = clause.replace(/^that\s+/i, "");
  clause = clause.replace(/^(.+?)\s+pending\b/i, "$1 was pending");
  clause = clause.replace(/^(.+?)\s+sent for\b/i, "$1 was sent for");

  return lowerCaseInitial(clause);
}

function presentationToClause(text: string): string {
  const firstSentence = splitIntoSentences(text)[0] ?? normalizeWhitespace(text);
  let clause = trimSentenceEnding(firstSentence);

  clause = clause.replace(
    /^(?:A|An)\s+.+?\b(?:presents?|presented|arrives?|arrived|comes?|came|reports?|reported|developed|is brought|was brought|was admitted)\b\s*/i,
    ""
  );
  clause = clause.replace(
    /^The patient\s+(?:presents?|presented|arrives?|arrived|comes?|came|reports?|reported|developed|is brought|was brought|was admitted)\b\s*/i,
    ""
  );
  clause = clause.replace(/^to\s+[^,.;:]+?\s+with\s+/i, "");
  clause = clause.replace(/^with\s+/i, "");
  clause = clause.replace(/^Symptoms began\s+/i, "symptoms began ");
  clause = clause.replace(/^He reports\s+/i, "the patient reports ");
  clause = clause.replace(/^She reports\s+/i, "the patient reports ");

  if (/^(?:\d+\s+(?:hours?|days?|weeks?|months?)|after\b|within\b|over\b|for\b)/i.test(clause)) {
    clause = `the patient presented ${clause}`;
  }

  if (clause.length < 30) {
    clause = trimSentenceEnding(firstSentence);
  }

  return lowerCaseInitial(clause);
}

function scoreSentence(sentence: string, category: Hint["category"], index: number): number {
  let score = SUPPORT_CATEGORY_WEIGHT[category];

  if (index === 0) score += 1;
  if (index === 1) score += 2;
  if (index === 2) score += 3;

  if (
    /\b(culture|cultured|cultures|grow|grows|grew|isolat|PCR|serology|antigen|stain|detected|positive|confirmed|yielded|identified|show|shows|showed|reveal|reveals|revealed|demonstrate|demonstrates|demonstrated|aspirat|biopsy|eggs|budding|acid-fast|capsule|toxin|spore|rod|cocci|yeast|virus|parasite)\b/i.test(
      sentence
    )
  ) {
    score += 12;
  }

  if (
    /\b(similar|cluster|outbreak|contact|travel|swimming|lake|rice|animal|vector|mosquito|tick|sexual|food|shared|teammates|coworkers|classmates|daycare|ward|dormitory)\b/i.test(
      sentence
    )
  ) {
    score += 6;
  }

  if (/\bpending\b/i.test(sentence)) {
    score -= 12;
  }

  if (/\bsent for\b/i.test(sentence)) {
    score -= 6;
  }

  if (/^previously healthy\b/i.test(sentence)) {
    score -= 8;
  }

  return score;
}

function pickBestSupportingClause(hint: Hint): { clause: string; score: number } {
  const sentences = splitIntoSentences(hint.text);
  const bestMatch =
    sentences
      .map((sentence, index) => ({
        sentence,
        score: scoreSentence(sentence, hint.category, index),
      }))
      .sort((left, right) => right.score - left.score)[0] ?? {
      sentence: hint.text,
      score: scoreSentence(hint.text, hint.category, 0),
    };

  return {
    clause: sentenceToClause(bestMatch.sentence),
    score: bestMatch.score,
  };
}

function clauseHasVerb(clause: string): boolean {
  if (/^[a-z][a-z\s-]*\d/i.test(clause)) {
    return false;
  }

  return /\b(is|are|was|were|has|have|had|culture|cultures|cultured|show|shows|showed|reveal|reveals|revealed|demonstrate|demonstrates|demonstrated|grow|grows|grew|yield|yields|yielded|detect|detects|detected|confirm|confirms|confirmed|identify|identifies|identified|contain|contains|contained|argue|argues|argued|return|returns|returned|improve|improves|improved|develop|develops|developed|point|points|pointed|fit|fits)\b/i.test(
    clause
  );
}

function buildSupportSentence(
  prefix: string,
  clause: string,
  category: Hint["category"]
): string {
  if (clauseHasVerb(clause)) {
    return `${prefix} is that ${clause}.`;
  }

  if (category === "lab") {
    return `${prefix} in the laboratory workup was ${clause}.`;
  }

  if (category === "imaging") {
    return `${prefix} on imaging was ${clause}.`;
  }

  return `${prefix} was ${clause}.`;
}

function sentenceCount(text: string): number {
  return splitIntoSentences(text).length;
}

function containsEducationalReasoning(text: string): boolean {
  return /\b(because|which fits|fits because|consistent with|supports|points to|distinguish|distinguishes|explains|suggests|makes\b|rather than|unlike)\b/i.test(
    text
  );
}

function containsTeachingPoint(text: string): boolean {
  return /\b(classic|classically|typical|typically|tends to|often|common cause|transmitted|acquired|toxin|spore|capsule|reservoir|vector|morphology|dimorphic|non-enveloped|double-stranded|single-stranded|intracellular|burrowing|eosinophilia|neurotoxin|enterotoxin|syndrome)\b/i.test(
    text
  );
}

export function isEducationalCaseExplanation(
  explanation: string,
  organismId: string
): boolean {
  const normalized = normalizeWhitespace(explanation);
  const organism = ORGANISM_MAP.get(organismId);
  const canonical = organism?.canonical ?? fallbackOrganismName(organismId);

  if (normalized.length < 180) return false;
  if (sentenceCount(normalized) < 3) return false;
  if (!normalized.includes(canonical)) return false;
  if (/despite\.$/i.test(normalized)) return false;
  if (
    /\bAnother key clue\b|\bA further clue\b|\bTaken together, these case-specific findings support\b/.test(
      normalized
    )
  ) {
    return false;
  }
  if (!containsEducationalReasoning(normalized)) return false;
  if (!containsTeachingPoint(normalized)) return false;

  return true;
}

export function buildCaseExplanation(
  organismId: string,
  hints: readonly Hint[]
): string {
  const organismName =
    ORGANISM_MAP.get(organismId)?.canonical ?? fallbackOrganismName(organismId);
  const orderedHints = [...hints].sort((left, right) => left.order - right.order);
  const firstHint =
    orderedHints.find((hint) => hint.order === 1) ?? orderedHints[0];
  const laterHints = orderedHints.filter((hint) => hint !== firstHint);

  const rankedSupportClauses = laterHints
    .map((hint) => {
      const picked = pickBestSupportingClause(hint);
      return {
        hint,
        clause: picked.clause,
        score: picked.score + hint.order * 5,
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return right.hint.order - left.hint.order;
    })
    .filter(
      (entry, index, list) =>
        entry.clause.length >= 24 &&
        list.findIndex((candidate) => candidate.clause === entry.clause) === index
    );

  const supportClauses = [
    ...rankedSupportClauses.filter(
      (entry) => !/\bpending\b|\bsent for\b/i.test(entry.clause)
    ),
    ...rankedSupportClauses.filter((entry) =>
      /\bpending\b|\bsent for\b/i.test(entry.clause)
    ),
  ].slice(0, 2);

  const explanationParts = [`The diagnosis is ${organismName}.`];
  const presentationClause = firstHint ? presentationToClause(firstHint.text) : "";

  if (presentationClause) {
    explanationParts.push(`The presentation fits because ${presentationClause}.`);
  }

  if (supportClauses[0]) {
    explanationParts.push(
      buildSupportSentence(
        "Another key clue",
        supportClauses[0].clause,
        supportClauses[0].hint.category
      )
    );
  }

  if (supportClauses[1]) {
    explanationParts.push(
      buildSupportSentence(
        "A further clue",
        supportClauses[1].clause,
        supportClauses[1].hint.category
      )
    );
  }

  explanationParts.push(
    `Taken together, these case-specific findings support ${organismName}.`
  );

  return explanationParts.join(" ");
}
