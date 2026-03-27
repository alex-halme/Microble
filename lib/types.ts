// ─── Pathogen / Organism ────────────────────────────────────────────────────

export type PathogenKind = "bacterium" | "virus" | "parasite" | "fungus";
export type GramStain = "positive" | "negative" | "variable" | "none";
export type Morphology = "cocci" | "bacilli" | "spirochete" | "other";
export type OxygenRequirement =
  | "aerobe"
  | "anaerobe"
  | "facultative"
  | "microaerophilic";

export interface Organism {
  id: string; // "staphylococcus-aureus"
  canonical: string; // "Staphylococcus aureus"
  kind?: PathogenKind; // defaults to bacterium for legacy entries
  genus?: string; // "Staphylococcus"
  species?: string; // "aureus"
  abbreviations: string[]; // ["S. aureus", "Staph aureus"]
  commonNames: string[]; // ["MRSA"] — only unambiguous ones
  gramStain?: GramStain;
  morphology?: Morphology;
  oxygen?: OxygenRequirement;
  classificationTags?: string[]; // compact summary shown in the result modal
  notes?: string; // shown post-game
}

// ─── Case ─────────────────────────────────────────────────────────────────────

export type HintCategory =
  | "presentation"
  | "history"
  | "lab"
  | "imaging"
  | "exposure"
  | "treatment_response";

export interface Hint {
  order: 1 | 2 | 3 | 4 | 5;
  text: string;
  category: HintCategory;
}

export interface MicrobleCase {
  id: string;
  organismId: string; // must match Organism.id
  acceptedOrganismIds?: string[]; // optional case-specific equivalent correct answers
  hints: [Hint, Hint, Hint, Hint, Hint];
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  source: "handcrafted" | "ai_generated";
  validated: boolean;
  createdAt: string; // ISO date string
}

export interface PublicMicrobleCase {
  id: string;
  hints: [Hint, Hint, Hint, Hint, Hint];
  difficulty: "easy" | "medium" | "hard";
  source: "handcrafted" | "ai_generated";
  validated: boolean;
  createdAt: string; // ISO date string
}

export interface CaseReveal {
  organism: Organism;
  explanation: string;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  caseId: string;
  mode: "daily" | "freeplay";
  date?: string; // YYYY-MM-DD, daily mode only
  guesses: (string | null)[]; // string = guess text, null = skipped
  hintsRevealed: number; // 1–5 (hint 1 always shown from the start)
  status: GameStatus;
  completedAt?: string; // ISO date string
  resultSeenAt?: string; // ISO date string
  streakAppliedAt?: string; // ISO date string
}

// ─── Match Result ─────────────────────────────────────────────────────────────

export type MatchResult =
  | { matched: true; organism: Organism; confidence: "exact" | "fuzzy" }
  | { matched: false; reason: "no_match" | "ambiguous" | "below_threshold" };
