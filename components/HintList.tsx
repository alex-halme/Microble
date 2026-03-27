"use client";

import { useEffect, useRef } from "react";
import type { Hint } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  presentation:       "Clinical Presentation",
  history:            "Patient History",
  lab:                "Laboratory",
  imaging:            "Imaging",
  exposure:           "Exposure History",
  treatment_response: "Treatment Response",
};

interface HintListProps {
  hints: Hint[];
  revealed: number;
}

export default function HintList({ hints, revealed }: HintListProps) {
  const visible = hints.slice(0, revealed);
  const newest = visible.length - 1;
  const remaining = 5 - revealed;
  const newestHintRef = useRef<HTMLElement | null>(null);
  const previousRevealedRef = useRef(revealed);

  useEffect(() => {
    const previousRevealed = previousRevealedRef.current;

    if (
      revealed > previousRevealed &&
      previousRevealed > 0 &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches
    ) {
      window.requestAnimationFrame(() => {
        newestHintRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    previousRevealedRef.current = revealed;
  }, [revealed]);

  return (
    <div
      className="hint-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        alignItems: "stretch",
      }}
    >
      {visible.map((hint, i) => {
        const isNewest = i === newest;

        return (
          <article
            key={hint.order}
            className="hint-card"
            ref={isNewest ? newestHintRef : null}
            style={{
              border: `1px solid ${isNewest ? "var(--accent-border)" : "var(--border)"}`,
              borderRadius: "12px",
              padding: "10px 14px",
              background: isNewest ? "var(--surface-tint)" : "var(--surface-subtle)",
              scrollMarginTop: "96px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "999px",
                    background: isNewest ? "var(--accent)" : "var(--border-strong)",
                    flexShrink: 0,
                  }}
                />
                <span
                  className="label"
                  style={{ color: isNewest ? "var(--accent)" : "var(--fg-3)", fontSize: "10px" }}
                >
                  Clue {hint.order}
                </span>
              </div>
              <span
                className="label"
                style={{
                  fontSize: "10px",
                  color: isNewest ? "var(--accent)" : "var(--fg-3)",
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {CATEGORY_LABELS[hint.category] ?? hint.category}
              </span>
            </div>

            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13.5px",
                lineHeight: 1.5,
                color: "var(--fg)",
                margin: 0,
              }}
            >
              {hint.text}
            </p>
          </article>
        );
      })}

      {remaining > 0 && (
        <div
          className="hint-card hint-card-placeholder"
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "12px",
            padding: "10px 14px",
            background: "transparent",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className="label" style={{ color: "var(--fg-3)", fontSize: "10px" }}>
            {remaining} more clue{remaining !== 1 ? "s" : ""} will appear
          </span>
        </div>
      )}
    </div>
  );
}
