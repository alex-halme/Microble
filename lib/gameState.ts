import type { GameState, GameStatus } from "./types";

// 5 turns total: 4 wrong to reveal all 5 hints, then 1 final attempt.
const MAX_GUESSES = 5;
const FREEPLAY_STREAK_KEY = "microble-freeplay-streak";
const FREEPLAY_CURRENT_CASE_KEY = "microble-freeplay-current-case";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export function dailyKey(date: string): string {
  return `microble-daily-${date}`;
}

export function freeplaylKey(caseId: string): string {
  return `microble-fp-${caseId}`;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadGameState(storageKey: string): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      typeof parsed.caseId === "string" &&
      Array.isArray(parsed.guesses) &&
      typeof parsed.hintsRevealed === "number" &&
      ["playing", "won", "lost"].includes(parsed.status)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveGameState(storageKey: string, state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage quota exceeded or private mode — fail silently
  }
}

export function clearGameState(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures
  }
}

export function getCurrentFreeplayCaseId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(FREEPLAY_CURRENT_CASE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setCurrentFreeplayCaseId(caseId: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(FREEPLAY_CURRENT_CASE_KEY, caseId);
  } catch {
    // Ignore storage failures
  }
}

export function clearCurrentFreeplayCaseId(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(FREEPLAY_CURRENT_CASE_KEY);
  } catch {
    // Ignore storage failures
  }
}

export function getCompletedFreeplayCaseIds(caseIds?: string[]): string[] {
  if (typeof window === "undefined") return [];

  const candidateIds =
    caseIds ??
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => !!key && key.startsWith("microble-fp-"))
      .map((key) => key.replace("microble-fp-", ""));

  return candidateIds.filter((caseId) => {
    const state = loadGameState(freeplaylKey(caseId));
    return state?.mode === "freeplay" && isGameOver(state);
  });
}

export function resetFreeplayProgress(caseIds?: string[]): void {
  if (typeof window === "undefined") return;

  const idsToReset =
    caseIds ??
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => !!key && key.startsWith("microble-fp-"))
      .map((key) => key.replace("microble-fp-", ""));

  for (const caseId of idsToReset) {
    try {
      localStorage.removeItem(freeplaylKey(caseId));
    } catch {
      // Ignore storage failures
    }
  }

  resetFreeplayStreak();
  clearCurrentFreeplayCaseId();
}

export function getFreeplayStreak(): number {
  if (typeof window === "undefined") return 0;

  try {
    const raw = localStorage.getItem(FREEPLAY_STREAK_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setFreeplayStreak(streak: number): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(FREEPLAY_STREAK_KEY, String(Math.max(0, streak)));
  } catch {
    // Ignore storage failures
  }
}

export function resetFreeplayStreak(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(FREEPLAY_STREAK_KEY);
  } catch {
    // Ignore storage failures
  }
}

// ─── State factory ────────────────────────────────────────────────────────────

export function createInitialState(
  caseId: string,
  mode: "daily" | "freeplay",
  date?: string
): GameState {
  return {
    caseId,
    mode,
    date,
    guesses: [],
    hintsRevealed: 1, // hint 1 is always visible from the start
    status: "playing",
  };
}

// ─── Hint reveal formula ──────────────────────────────────────────────────────
//
// Hint 1 is shown immediately (hintsRevealed = 1 before any guesses).
// Each wrong guess or skip reveals one more hint, up to 5.
//
//   guesses.length  hintsRevealed
//   0               1  (starting state)
//   1               2
//   2               3
//   3               4
//   4               5
//   5               5  (all hints out, 1 guess left)
//   6               — (game over / lost)

function nextHintsRevealed(guessCount: number): number {
  return Math.min(guessCount + 1, 5);
}

// ─── State transitions ────────────────────────────────────────────────────────

/**
 * Apply an incorrect guess. Reveals one more hint (up to 5).
 * If this was the 6th wrong entry, marks the game as lost.
 */
export function applyWrongGuess(state: GameState, guess: string): GameState {
  const guesses = [...state.guesses, guess];
  const status: GameStatus = guesses.length >= MAX_GUESSES ? "lost" : "playing";
  return {
    ...state,
    guesses,
    hintsRevealed: nextHintsRevealed(guesses.length),
    status,
    completedAt: status === "lost" ? new Date().toISOString() : undefined,
  };
}

/**
 * Skip — counts as a wrong turn (reveals next hint) without submitting a guess.
 * Stored as null in the guesses array so the history can render it distinctly.
 */
export function applySkip(state: GameState): GameState {
  const guesses = [...state.guesses, null];
  const status: GameStatus = guesses.length >= MAX_GUESSES ? "lost" : "playing";
  return {
    ...state,
    guesses,
    hintsRevealed: nextHintsRevealed(guesses.length),
    status,
    completedAt: status === "lost" ? new Date().toISOString() : undefined,
  };
}

/**
 * Apply a correct guess. Marks the game as won.
 */
export function applyCorrectGuess(state: GameState, guess: string): GameState {
  return {
    ...state,
    guesses: [...state.guesses, guess],
    hintsRevealed: 5,
    status: "won",
    completedAt: new Date().toISOString(),
  };
}

export function markResultSeen(state: GameState): GameState {
  if (state.resultSeenAt) return state;

  return {
    ...state,
    resultSeenAt: new Date().toISOString(),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function isGameOver(state: GameState): boolean {
  return state.status === "won" || state.status === "lost";
}

export function guessesRemaining(state: GameState): number {
  return MAX_GUESSES - state.guesses.length;
}

/**
 * Build a Wordle-style share string.
 *   ✅ = correct guess
 *   ❌ = wrong guess
 *   ⬜ = skipped
 */
export function buildShareText(state: GameState, caseTitle: string): string {
  const lines: string[] = [];
  lines.push(`Microble — ${caseTitle}`);

  if (state.mode === "daily" && state.date) {
    lines.push(state.date);
  }

  const result =
    state.status === "won"
      ? `${state.guesses.length}/${MAX_GUESSES}`
      : `X/${MAX_GUESSES}`;
  lines.push(result);
  lines.push("");

  for (let i = 0; i < state.guesses.length; i++) {
    const g = state.guesses[i];
    const isWinningGuess = state.status === "won" && i === state.guesses.length - 1;
    if (g === null) {
      lines.push("⬜"); // skipped
    } else if (isWinningGuess) {
      lines.push("✅");
    } else {
      lines.push("❌");
    }
  }

  return lines.join("\n");
}
