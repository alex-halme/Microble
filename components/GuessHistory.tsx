"use client";

interface GuessHistoryProps {
  guesses: (string | null)[];
  correctIndex?: number;
  inline?: boolean;
}

export default function GuessHistory({ guesses, correctIndex, inline }: GuessHistoryProps) {
  if (guesses.length === 0) return null;

  if (inline) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {guesses.map((guess, i) => {
          const isSkip = guess === null;
          const isCorrect = i === correctIndex;
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: isCorrect ? "var(--correct-dim)" : "var(--surface-subtle)",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                color: isCorrect ? "var(--correct-fg)" : "var(--fg-3)",
                textDecoration: !isCorrect && !isSkip ? "line-through" : "none",
                textDecorationColor: "var(--fg-3)",
                fontStyle: isSkip ? "italic" : "normal",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600 }}>
                {isCorrect ? "✓" : isSkip ? "–" : "✗"}
              </span>
              {isSkip ? "passed" : guess}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <section style={{ marginTop: 0 }}>
      <span className="label" style={{ display: "block", marginBottom: "12px", color: "var(--fg-2)" }}>
        Case Log
      </span>

      <div style={{ display: "grid", gap: "10px" }}>
        {guesses.map((guess, i) => {
          const isSkip = guess === null;
          const isCorrect = i === correctIndex;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "18px",
                background: "var(--surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span className="label" style={{ width: "22px", textAlign: "right", flexShrink: 0 }}>
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: isCorrect ? "var(--correct-fg)" : "var(--fg-3)",
                  flexShrink: 0,
                  width: "14px",
                }}
              >
                {isCorrect ? "✓" : isSkip ? "–" : "✗"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  color: isCorrect ? "var(--correct-fg)" : isSkip ? "var(--fg-3)" : "var(--fg-2)",
                  textDecoration: !isCorrect && !isSkip ? "line-through" : "none",
                  textDecorationColor: "var(--fg-3)",
                  fontStyle: isSkip ? "italic" : "normal",
                }}
              >
                {isSkip ? "passed" : guess}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
