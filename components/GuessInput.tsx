"use client";

import { useState, useRef, useEffect } from "react";
import { ORGANISMS } from "@/lib/organisms";
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const organismsByCanonical = ORGANISMS.map((organism) => ({
    canonical: organism.canonical,
    searchNames: [
      organism.canonical,
      ...organism.abbreviations,
      ...organism.commonNames,
    ],
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setCompactLayout(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      setSelectedIdx(-1);
      return;
    }

    const lower = input.toLowerCase();
    const filtered = organismsByCanonical
      .filter(({ searchNames }) =>
        searchNames.some((name) => name.toLowerCase().includes(lower))
      )
      .map(({ canonical }) => canonical)
      .slice(0, 7);
    setSuggestions(filtered);
    setSelectedIdx(-1);
  }, [input]);

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
    setSuggestions([]);
    inputRef.current?.focus({ preventScroll: true });
    onGuess(result.organism.canonical);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        setInput(suggestions[selectedIdx]);
        setSuggestions([]);
        setSelectedIdx(-1);
      } else if (!input.trim()) {
        if (canSkip) {
          setFeedback(null);
          onSkip();
        }
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setSelectedIdx(-1);
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
            padding: "5px 5px 5px 14px",
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
                setSuggestions([]);
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
        </div>

        {suggestions.length > 0 && (
          <div
            className="guess-suggestions"
            style={{
              position: "absolute",
              top: compactLayout ? "auto" : "calc(100% + 6px)",
              bottom: compactLayout ? "calc(100% + 6px)" : "auto",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
              overflow: "hidden",
              maxHeight: compactLayout ? "min(240px, 36vh)" : "none",
              overflowY: compactLayout ? "auto" : "hidden",
            }}
          >
            {suggestions.map((s, i) => (
              <div
                key={s}
                onMouseDown={() => {
                  setInput(s);
                  setSuggestions([]);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                style={{
                  padding: "9px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  color: i === selectedIdx ? "var(--fg)" : "var(--fg-2)",
                  backgroundColor: i === selectedIdx ? "var(--accent-soft)" : "transparent",
                  borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
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
