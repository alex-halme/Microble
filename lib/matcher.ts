import Fuse from "fuse.js";
import type { Organism, MatchResult } from "./types";

// ─── Normalization ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── Abbreviation expansion ───────────────────────────────────────────────────

/**
 * Detect and expand genus abbreviations like "S. aureus" → "Staphylococcus aureus".
 *
 * Supports:
 *   "S. aureus"    — standard abbreviated form
 *   "S aureus"     — without period
 *   "staph aureus" — partial genus name (min 3 chars)
 *
 * Returns matched organisms (may be multiple if ambiguous).
 */
function expandAbbreviation(input: string, organisms: Organism[]): Organism[] {
  const norm = normalize(input);

  // Pattern 1: single letter + optional period + space + species
  // e.g. "s. aureus" or "s aureus"
  const singleLetterMatch = norm.match(/^([a-z])\.?\s+([a-z]+(?:\s+[a-z]+)?)$/);
  if (singleLetterMatch) {
    const [, genusInitial, speciesInput] = singleLetterMatch;
    return organisms.filter(
      (o) =>
        !!o.genus &&
        !!o.species &&
        o.genus[0].toLowerCase() === genusInitial &&
        normalize(o.species) === normalize(speciesInput)
    );
  }

  // Pattern 2: partial genus (≥3 chars) + species
  // e.g. "staph aureus", "strep pneumo" — match genus start + species start
  const partialMatch = norm.match(/^([a-z]{3,})\s+([a-z]+)$/);
  if (partialMatch) {
    const [, genusPrefix, speciesPrefix] = partialMatch;
    return organisms.filter(
      (o) =>
        !!o.genus &&
        !!o.species &&
        o.genus.toLowerCase().startsWith(genusPrefix) &&
        o.species.toLowerCase().startsWith(speciesPrefix)
    );
  }

  return [];
}

// ─── Fuse index ───────────────────────────────────────────────────────────────

/**
 * Flattened search record — one entry per candidate string so Fuse searches
 * each name independently rather than a concatenated blob.
 */
interface SearchRecord {
  organism: Organism;
  name: string; // one specific name variant (canonical, abbreviation, or common name)
}

function buildFuseIndex(organisms: Organism[]): Fuse<SearchRecord> {
  const records: SearchRecord[] = [];
  for (const o of organisms) {
    const names = [o.canonical, ...o.abbreviations, ...o.commonNames];
    for (const name of names) {
      records.push({ organism: o, name });
    }
  }

  return new Fuse(records, {
    keys: ["name"],
    threshold: 0.45, // 0 = exact, 1 = anything; 0.45 handles 1–2 char typos in long names
    includeScore: true,
    minMatchCharLength: 3,
    shouldSort: true,
    ignoreLocation: true, // don't penalize matches that aren't near string start
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Match a free-text guess against the organism dictionary.
 *
 * Pass order (fastest/strictest first):
 *   1. Exact canonical name (normalized)
 *   2. Exact abbreviation or common name match
 *   3. Abbreviation expansion (genus initial / partial genus + species)
 *   4. Fuse.js fuzzy match
 *
 * Returns ambiguous when multiple organisms score equally; below_threshold
 * when no match clears the fuzzy threshold.
 */
export function matchGuess(input: string, organisms: Organism[]): MatchResult {
  if (!input || !input.trim()) {
    return { matched: false, reason: "no_match" };
  }

  const norm = normalize(input);

  // ── Pass 1: exact canonical match ─────────────────────────────────────────
  const exactCanonical = organisms.find(
    (o) => normalize(o.canonical) === norm
  );
  if (exactCanonical) {
    return { matched: true, organism: exactCanonical, confidence: "exact" };
  }

  // ── Pass 2: exact abbreviation / common name match ────────────────────────
  const exactAlias = organisms.find((o) =>
    [...o.abbreviations, ...o.commonNames].some(
      (alias) => normalize(alias) === norm
    )
  );
  if (exactAlias) {
    return { matched: true, organism: exactAlias, confidence: "exact" };
  }

  // ── Pass 3: abbreviation expansion ────────────────────────────────────────
  const expanded = expandAbbreviation(input, organisms);
  if (expanded.length === 1) {
    return { matched: true, organism: expanded[0], confidence: "exact" };
  }
  if (expanded.length > 1) {
    // Ambiguous: "S. sp." could match multiple organisms
    return { matched: false, reason: "ambiguous" };
  }

  // ── Pass 4: Fuse.js fuzzy ─────────────────────────────────────────────────
  const fuse = buildFuseIndex(organisms);
  const results = fuse.search(norm);

  if (results.length === 0 || results[0].score === undefined) {
    return { matched: false, reason: "no_match" };
  }

  const topScore = results[0].score; // lower = better in Fuse

  // Reject if below threshold (Fuse already filtered by 0.45, but double-check)
  if (topScore > 0.45) {
    return { matched: false, reason: "below_threshold" };
  }

  // Deduplicate results by organism id (multiple name variants may match the same organism)
  const seen = new Set<string>();
  const uniqueResults = results.filter((r) => {
    if (seen.has(r.item.organism.id)) return false;
    seen.add(r.item.organism.id);
    return true;
  });

  // Reject if top two DISTINCT organisms are too close in score (ambiguous)
  if (uniqueResults.length >= 2 && uniqueResults[1].score !== undefined) {
    const scoreDiff = uniqueResults[1].score - topScore;
    if (scoreDiff < 0.1) {
      return { matched: false, reason: "ambiguous" };
    }
  }

  return {
    matched: true,
    organism: uniqueResults[0].item.organism,
    confidence: "fuzzy",
  };
}

/**
 * Check whether a guess is correct against a specific organism.
 * Returns true/false; uses matchGuess internally.
 */
export function isCorrectGuess(
  input: string,
  target: Organism,
  organisms: Organism[]
): boolean {
  const result = matchGuess(input, organisms);
  return result.matched && result.organism.id === target.id;
}

/**
 * Return a human-readable disambiguation hint for ambiguous inputs.
 * Used in UI to prompt the user to be more specific.
 */
export function getAmbiguousCandidates(
  input: string,
  organisms: Organism[]
): Organism[] {
  const expanded = expandAbbreviation(input, organisms);
  if (expanded.length > 1) return expanded;

  const fuse = buildFuseIndex(organisms);
  const results = fuse.search(normalize(input)).slice(0, 3);
  if (
    results.length >= 2 &&
    results[0].score !== undefined &&
    results[1].score !== undefined
  ) {
    const scoreDiff = results[1].score - results[0].score;
    if (scoreDiff < 0.1) {
      return results.map((r) => r.item.organism);
    }
  }
  return [];
}
