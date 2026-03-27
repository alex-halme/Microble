"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CaseReveal, GameState, PublicMicrobleCase } from "@/lib/types";
import { ORGANISMS } from "@/lib/organisms";
import { matchGuess } from "@/lib/matcher";
import {
  clearCurrentFreeplayCaseId,
  loadGameState,
  saveGameState,
  createInitialState,
  applyWrongGuess,
  applyCorrectGuess,
  applySkip,
  isGameOver,
  guessesRemaining,
  dailyKey,
  freeplaylKey,
  getFreeplayStreak,
  markResultSeen,
  setFreeplayStreak,
} from "@/lib/gameState";
import HintList from "./HintList";
import GuessInput from "./GuessInput";
import GuessHistory from "./GuessHistory";
import ResultModal from "./ResultModal";

interface GameBoardProps {
  caseData: PublicMicrobleCase;
  mode: "daily" | "freeplay";
  date?: string;
  onNewGame?: () => void;
  newGameLabel?: string;
}

export default function GameBoard({
  caseData,
  mode,
  date,
  onNewGame,
  newGameLabel,
}: GameBoardProps) {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [freeplayStreak, setFreeplayStreakState] = useState(0);
  const [reveal, setReveal] = useState<CaseReveal | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const hintsRegionRef = useRef<HTMLDivElement | null>(null);
  const initialFocusCaseRef = useRef<string | null>(null);

  const storageKey =
    mode === "daily" && date ? dailyKey(date) : freeplaylKey(caseData.id);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsCompactMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let saved = loadGameState(storageKey);
    if (saved && saved.caseId !== caseData.id) saved = null;

    const initial = saved ?? createInitialState(caseData.id, mode, date);
    const shouldAutoShow = isGameOver(initial) && !initial.resultSeenAt;
    const hydratedState = shouldAutoShow ? markResultSeen(initial) : initial;
    setState(hydratedState);
    setShowModal(shouldAutoShow);
    setFreeplayStreakState(mode === "freeplay" ? getFreeplayStreak() : 0);

    if (shouldAutoShow) {
      saveGameState(storageKey, hydratedState);
    }

    setReveal(null);
    setSubmittingGuess(false);
    setInputFocused(false);
  }, [caseData.id, mode, date, storageKey]);

  useEffect(() => {
    if (mode !== "freeplay" || !state || !isGameOver(state) || state.streakAppliedAt) {
      return;
    }

    const nextStreak = state.status === "won" ? getFreeplayStreak() + 1 : 0;
    setFreeplayStreak(nextStreak);
    setFreeplayStreakState(nextStreak);

    const trackedState = {
      ...state,
      streakAppliedAt: new Date().toISOString(),
    };

    setState(trackedState);
    saveGameState(storageKey, trackedState);
  }, [mode, state, storageKey]);

  useEffect(() => {
    if (mode !== "freeplay" || !state || !isGameOver(state)) {
      return;
    }

    clearCurrentFreeplayCaseId();
  }, [mode, state]);

  useEffect(() => {
    if (mode !== "daily") return;

    const now = new Date();
    const nextUtcMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    );
    const msUntilReset = nextUtcMidnight - now.getTime() + 50;
    const timer = window.setTimeout(() => {
      router.refresh();
    }, msUntilReset);

    return () => window.clearTimeout(timer);
  }, [mode, router]);

  useEffect(() => {
    if (
      !state ||
      mode !== "daily" ||
      !isGameOver(state) ||
      showModal ||
      typeof window === "undefined"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      boardShellRef.current?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [mode, showModal, state]);

  useEffect(() => {
    if (
      !state ||
      isGameOver(state) ||
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 768px)").matches ||
      initialFocusCaseRef.current === caseData.id
    ) {
      return;
    }

    initialFocusCaseRef.current = caseData.id;

    const timer = window.setTimeout(() => {
      const board = boardShellRef.current;
      if (!board) return;

      if (state.hintsRevealed === 1) {
        const headerHeight =
          document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect()
            .height ?? 0;
        const boardHeaderHeight =
          board
            .querySelector<HTMLElement>(".gameboard-header")
            ?.getBoundingClientRect().height ?? 0;
        const firstHintHeight =
          board.querySelector<HTMLElement>(".hint-card")?.getBoundingClientRect().height ?? 0;
        const inputTrayHeight =
          board
            .querySelector<HTMLElement>(".gameboard-input-region")
            ?.getBoundingClientRect().height ?? 0;
        const statusHeight =
          board
            .querySelector<HTMLElement>(".gameboard-status-pills")
            ?.getBoundingClientRect().height ?? 0;
        const placeholderHeight =
          board
            .querySelector<HTMLElement>(".hint-card-placeholder")
            ?.getBoundingClientRect().height ?? 0;
        const availableHeight =
          window.innerHeight - headerHeight - inputTrayHeight - 18;

        if (boardHeaderHeight + statusHeight + firstHintHeight + placeholderHeight <= availableHeight) {
          board.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          return;
        }
      }

      hintsRegionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [caseData.id, state]);

  useEffect(() => {
    if (!state || !isGameOver(state)) return;

    let cancelled = false;
    fetch(`/api/cases/${caseData.id}/reveal`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: CaseReveal | null) => {
        if (!cancelled) {
          setReveal(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReveal(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseData.id, state]);

  const handleGuess = useCallback(
    async (input: string) => {
      if (!state || isGameOver(state) || submittingGuess) return;

      setSubmittingGuess(true);
      try {
        const response = await fetch(`/api/cases/${caseData.id}/guess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guess: input }),
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              canonicalGuess: string;
              correct: boolean;
            }
          | {
              ok: false;
            }
          | null;

        if (!payload?.ok) return;

        const nextState = payload.correct
          ? applyCorrectGuess(state, payload.canonicalGuess)
          : applyWrongGuess(state, payload.canonicalGuess);
        const next = isGameOver(nextState) ? markResultSeen(nextState) : nextState;
        setState(next);
        saveGameState(storageKey, next);
        if (isGameOver(next)) setTimeout(() => setShowModal(true), 300);
      } finally {
        setSubmittingGuess(false);
      }
    },
    [caseData.id, state, storageKey, submittingGuess]
  );

  const handleSkip = useCallback(() => {
    if (!state || isGameOver(state) || submittingGuess) return;
    const nextState = applySkip(state);
    const next = isGameOver(nextState) ? markResultSeen(nextState) : nextState;
    setState(next);
    saveGameState(storageKey, next);
    if (isGameOver(next)) setTimeout(() => setShowModal(true), 300);
  }, [state, storageKey, submittingGuess]);

  if (!state) {
    return (
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          background: "var(--surface)",
          borderRadius: "18px",
          border: "1px solid var(--border)",
          padding: "22px 26px",
          boxShadow: "var(--shadow-card)",
          opacity: 0.5,
        }}
      >
        <div style={{ height: "24px", width: "80px", borderRadius: "6px", background: "var(--surface-muted)", marginBottom: "10px" }} />
        <div style={{ height: "20px", width: "260px", borderRadius: "6px", background: "var(--surface-muted)", marginBottom: "18px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "72px", borderRadius: "12px", background: "var(--surface-muted)" }} />
          ))}
        </div>
      </div>
    );
  }

  const gameOver = isGameOver(state);
  const won = state.status === "won";
  const lost = state.status === "lost";
  const remaining = guessesRemaining(state);
  const correctIndex =
    won ? state.guesses.length - 1 : undefined;

  return (
    <>
      <div ref={boardShellRef} className="gameboard-shell" style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Main game card */}
        <div
          className="gameboard-card"
          style={{
            background: "var(--surface)",
            borderRadius: "18px",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 16px rgba(15, 23, 42, 0.06)",
            overflow: "visible",
          }}
        >
          {/* Card header */}
          <div
            className="gameboard-header"
            style={{
              padding: "18px 22px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <span
                className="label"
                style={{
                  display: "inline-block",
                  marginBottom: "4px",
                  color: "var(--fg-3)",
                }}
              >
                {mode === "daily" ? `Daily Case${date ? ` · ${date}` : ""}` : "Free Play"}
              </span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "19px",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "var(--fg)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {mode === "daily" ? "What's the diagnosis?" : "Name the responsible pathogen."}
              </h1>
            </div>

            {/* Status pills */}
            <div className="gameboard-status-pills" style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {mode === "freeplay" && freeplayStreak >= 2 && (
                <span
                  className="label"
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Streak: {freeplayStreak}
                </span>
              )}
              <span
                className="label"
                style={{
                  padding: "5px 10px",
                  borderRadius: "999px",
                  background: lost
                    ? "var(--danger-dim)"
                    : won
                    ? "var(--correct-dim)"
                    : "var(--surface-subtle)",
                  border: `1px solid ${
                    lost ? "var(--danger-border)" : won ? "rgba(31, 122, 92, 0.22)" : "var(--border)"
                  }`,
                  color: lost ? "var(--danger-fg)" : won ? "var(--correct-fg)" : "var(--fg-2)",
                  whiteSpace: "nowrap",
                }}
              >
                {gameOver
                  ? won
                    ? `Solved in ${state.guesses.length}`
                    : "Failed"
                  : `${remaining} left`}
              </span>
              <span
                className="label"
                style={{
                  padding: "5px 10px",
                  borderRadius: "999px",
                  background: lost
                    ? "var(--danger-dim)"
                    : won
                    ? "var(--correct-dim)"
                    : gameOver
                    ? "var(--surface-subtle)"
                    : "var(--accent-soft)",
                  border: `1px solid ${
                    lost
                      ? "var(--danger-border)"
                      : won
                      ? "rgba(31, 122, 92, 0.22)"
                      : gameOver
                      ? "var(--border)"
                      : "var(--accent-border)"
                  }`,
                  color: lost
                    ? "var(--danger-fg)"
                    : won
                    ? "var(--correct-fg)"
                    : gameOver
                    ? "var(--fg-2)"
                    : "var(--accent)",
                  whiteSpace: "nowrap",
                }}
              >
                {gameOver ? (lost ? "Case missed" : "Done") : `Clue ${state.hintsRevealed}`}
              </span>
            </div>
          </div>

          {/* Clue list */}
          <div
            ref={hintsRegionRef}
            className="gameboard-hints"
            style={{ padding: "14px 22px" }}
          >
            <HintList
              hints={caseData.hints}
              revealed={state.hintsRevealed}
              focusNewestOnMount={!gameOver && state.hintsRevealed > 1}
            />
          </div>

          {/* Divider + input area */}
          <div
            className={`gameboard-input-region${inputFocused ? " gameboard-input-region-focused" : ""}`}
            style={{
              borderTop: "1px solid var(--border)",
              padding: "14px 22px 16px",
            }}
          >
            {!gameOver ? (
              <GuessInput
                onGuess={handleGuess}
                onSkip={handleSkip}
                hintsRevealed={state.hintsRevealed}
                guessesRemaining={remaining}
                disabled={gameOver || submittingGuess}
                matchGuess={(input) => matchGuess(input, ORGANISMS)}
                autoFocus
                onFocusChange={setInputFocused}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {lost && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "12px",
                      background: "var(--danger-dim)",
                      border: "1px solid var(--danger-border)",
                      color: "var(--danger-fg)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Case failed. You used all 5 attempts without identifying the organism.
                  </div>
                )}
                {!showModal && (
                  <>
                    <button
                      onClick={() => setShowModal(true)}
                      style={{
                        padding: "9px 18px",
                        borderRadius: "999px",
                        background: lost ? "var(--danger-dim)" : "var(--surface)",
                        border: `1px solid ${lost ? "var(--danger-border)" : "var(--border)"}`,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: lost ? "var(--danger-fg)" : "var(--fg)",
                        transition: "border-color 150ms, box-shadow 150ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = lost
                          ? "var(--danger-border)"
                          : "var(--accent-border)";
                        e.currentTarget.style.boxShadow = lost
                          ? "0 0 0 3px rgba(180, 35, 24, 0.08)"
                          : "0 0 0 3px rgba(0, 113, 227, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = lost
                          ? "var(--danger-border)"
                          : "var(--border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {lost ? "Review failed case" : "View case summary"}
                    </button>
                    {lost && mode === "freeplay" && onNewGame && (
                      <button
                        onClick={onNewGame}
                        style={{
                          padding: "9px 18px",
                          borderRadius: "999px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--fg)",
                          transition: "border-color 150ms, box-shadow 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent-border)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 113, 227, 0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {newGameLabel ?? "Next Case"}
                      </button>
                    )}
                  </>
                )}
                <GuessHistory guesses={state.guesses} correctIndex={correctIndex} inline />
              </div>
            )}

            {/* Guess history shown below input when playing */}
            {!gameOver && state.guesses.length > 0 && !isCompactMobile && (
              <div className="gameboard-active-history" style={{ marginTop: "10px" }}>
                <GuessHistory guesses={state.guesses} correctIndex={correctIndex} inline />
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ResultModal
          state={state}
          reveal={reveal}
          caseData={caseData}
          onClose={() => setShowModal(false)}
          onNewGame={onNewGame}
          showNewGame={mode === "freeplay"}
          newGameLabel={newGameLabel}
        />
      )}
    </>
  );
}
