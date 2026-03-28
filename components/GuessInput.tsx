"use client";

import { useState, useRef, useEffect } from "react";
import type { MatchResult } from "@/lib/types";

interface GuessInputProps {
  onGuess: (input: string) => void;
  onSkip: () => void;
  hintsRevealed: number;
  guessesRemaining: number;
  disabled?: boolean;
  matchGuess: (input: string) => MatchResult;
  autoFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export default function GuessInput({
  onGuess,
  onSkip,
  hintsRevealed,
  guessesRemaining,
  disabled,
  matchGuess,
  autoFocus = false,
  onFocusChange,
}: GuessInputProps) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setCompactLayout(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!autoFocus || disabled || typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      const valueLength = inputRef.current?.value.length ?? 0;
      if (compactLayout) {
        inputRef.current?.setSelectionRange(valueLength, valueLength);
      } else {
        inputRef.current?.select();
      }
    }, 40);

    return () => window.clearTimeout(timer);
  }, [autoFocus, compactLayout, disabled]);

  function handleSubmit(value?: string) {
    const guess = (value ?? input).trim();
    if (!guess || disabled) return;

    const result = matchGuess(guess);
    if (!result.matched) {
      setFeedback(
        result.reason === "ambiguous"
          ? "Ambiguous — use the full pathogen name."
          : "Not recognised — check spelling or use the full pathogen name."
      );
      return;
    }

    setFeedback(null);
    setInput("");
    inputRef.current?.focus({ preventScroll: true });
    onGuess(result.organism.canonical);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!input.trim()) {
        if (canSkip) {
          setFeedback(null);
          onSkip();
        }
      } else {
        handleSubmit();
      }
    }
  }

  const canSkip = hintsRevealed < 5 && guessesRemaining > 1 && !disabled;

  return (
    <div className="guess-input-shell">
      {/* Input row */}
      <div className="guess-input-row-shell" style={{ position: "relative" }}>
        <div
          className="guess-input-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: compactLayout ? "8px 12px" : "5px 5px 5px 14px",
            border: focused
              ? "1px solid var(--accent-border)"
              : feedback
              ? "1px solid rgba(0,113,227,0.4)"
              : "1px solid var(--border)",
            borderRadius: "10px",
            background: "var(--surface-subtle)",
            boxShadow: focused ? "0 0 0 3px rgba(0, 113, 227, 0.08)" : "none",
            transition: "border-color 150ms, box-shadow 150ms",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFeedback(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() =>
              setTimeout(() => {
                setFocused(false);
                onFocusChange?.(false);
              }, 150)
            }
            onFocus={() => {
              setFocused(true);
              onFocusChange?.(true);
              if (inputRef.current?.value && !compactLayout) {
                inputRef.current.select();
              } else if (inputRef.current?.value) {
                const valueLength = inputRef.current.value.length;
                inputRef.current.setSelectionRange(valueLength, valueLength);
              }
            }}
            disabled={disabled}
            placeholder="Type pathogen name"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              height: "1.3em",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              lineHeight: 1.3,
              color: "var(--fg)",
              padding: 0,
              margin: 0,
              appearance: "none",
              WebkitAppearance: "none",
              caretColor: "var(--accent)",
            }}
          />

          {!compactLayout && (
            <button
              className="guess-submit-button"
              onClick={() => handleSubmit()}
              disabled={disabled || !input.trim()}
              style={{
                background: input.trim() && !disabled ? "var(--accent)" : "var(--surface-muted)",
                border: "none",
                borderRadius: "7px",
                cursor: input.trim() && !disabled ? "pointer" : "default",
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                fontWeight: 600,
                color: input.trim() && !disabled ? "white" : "var(--fg-3)",
                padding: "8px 14px",
                transition: "background 150ms, color 150ms",
                flexShrink: 0,
              }}
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {/* Footer row */}
      <div
        className="guess-input-footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginTop: "7px",
          minHeight: "18px",
        }}
      >
        <span
          className={`guess-input-helper${feedback ? " guess-input-helper-feedback" : ""}`}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            color: feedback ? "var(--accent-strong)" : "var(--fg-3)",
            lineHeight: 1.4,
          }}
        >
          {feedback ?? "Wrong guesses and passes reveal the next clue."}
        </span>

        {compactLayout && (
          <button
            className="guess-submit-button"
            onClick={() => handleSubmit()}
            disabled={disabled || !input.trim()}
            style={{
              background: input.trim() && !disabled ? "var(--accent)" : "var(--surface-muted)",
              border: "none",
              borderRadius: "999px",
              cursor: input.trim() && !disabled ? "pointer" : "default",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: 600,
              color: input.trim() && !disabled ? "white" : "var(--fg-3)",
              padding: "8px 16px",
              transition: "background 150ms, color 150ms",
              flexShrink: 0,
            }}
          >
            Submit
          </button>
        )}

        {canSkip && (
          <button
            className="guess-pass-button"
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--fg-3)",
              padding: "5px 12px",
              transition: "color 150ms, border-color 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--fg)";
              e.currentTarget.style.borderColor = "var(--accent-border)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--fg-3)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Pass
          </button>
        )}
      </div>
    </div>
  );
}
