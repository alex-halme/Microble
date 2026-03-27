"use client";

import { useEffect, useState } from "react";
import type { CaseReveal, GameState, Organism, PublicMicrobleCase } from "@/lib/types";
import { buildShareText } from "@/lib/gameState";

interface ResultModalProps {
  state: GameState;
  reveal: CaseReveal | null;
  caseData: PublicMicrobleCase;
  onClose?: () => void;
  onNewGame?: () => void;
  showNewGame?: boolean;
  newGameLabel?: string;
}

const GRAM_LABELS: Record<string, string> = {
  positive: "Gram-positive",
  negative: "Gram-negative",
  variable: "Gram-variable",
  none: "Non-gram-staining",
};

const OXYGEN_LABELS: Record<string, string> = {
  aerobe: "Obligate aerobe",
  anaerobe: "Obligate anaerobe",
  facultative: "Facultative anaerobe",
  microaerophilic: "Microaerophilic",
};

function getPathogenKind(
  organism: Organism
): "bacterium" | "virus" | "parasite" | "fungus" {
  return organism.kind ?? "bacterium";
}

function getClassificationTags(organism: Organism): string[] {
  if (organism.classificationTags?.length) {
    return organism.classificationTags;
  }

  const kind = getPathogenKind(organism);
  if (kind !== "bacterium") {
    if (kind === "virus") return ["Virus"];
    if (kind === "parasite") return ["Parasite"];
    return ["Fungus"];
  }

  return [
    organism.gramStain ? GRAM_LABELS[organism.gramStain] : null,
    organism.morphology ? organism.morphology : null,
    organism.oxygen ? OXYGEN_LABELS[organism.oxygen] : null,
  ].filter(Boolean) as string[];
}

export default function ResultModal({
  state,
  reveal,
  caseData,
  onClose,
  onNewGame,
  showNewGame = false,
  newGameLabel = "Next Case",
}: ResultModalProps) {
  const [copied, setCopied] = useState(false);
  const won = state.status === "won";
  const lost = state.status === "lost";
  const organism = reveal?.organism;
  const classificationTags = organism ? getClassificationTags(organism) : [];

  useEffect(() => {
    const handleAdvance = onNewGame;
    if (!showNewGame || !handleAdvance) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing
      ) {
        return;
      }

      event.preventDefault();
      handleAdvance?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewGame, showNewGame]);

  async function handleShare() {
    if (!organism) return;
    const text = buildShareText(state, organism.canonical);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(29, 29, 31, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backdropFilter: "saturate(180%) blur(18px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "88vh",
          overflowY: "auto",
          backgroundColor: "var(--surface-modal)",
          border: "1px solid var(--border)",
          borderRadius: "32px",
          boxShadow: "var(--shadow-soft)",
          padding: "0 0 max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "30px 30px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <span
              className="label"
              style={{
                color: won ? "var(--correct-fg)" : "var(--danger-fg)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: won ? "var(--correct-dim)" : "var(--danger-dim)",
              }}
            >
              {won ? "Correct diagnosis" : "Case failed"}
            </span>
            <span
              className="label"
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                background: "var(--surface-subtle)",
                color: "var(--fg-2)",
                border: "1px solid var(--border)",
              }}
            >
              {won ? `${state.guesses.length} of 5 attempts` : "5 of 5 attempts used"}
            </span>
          </div>
          {lost && (
            <p
              style={{
                margin: "0 0 14px",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "var(--danger-dim)",
                border: "1px solid var(--danger-border)",
                color: "var(--danger-fg)",
                fontSize: "15px",
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              You did not identify the organism before the case ran out of attempts.
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "38px",
              fontWeight: 600,
              color: "var(--fg)",
              margin: 0,
              lineHeight: 0.98,
              letterSpacing: "-0.06em",
            }}
          >
            {organism?.canonical ?? "Revealing diagnosis..."}
          </h2>
          {classificationTags.length > 0 && (
            <p className="label" style={{ marginTop: "8px", color: "var(--fg-3)" }}>
              {classificationTags.join(" · ")}
            </p>
          )}
        </div>

        <div
          style={{
            padding: "24px 30px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span className="label" style={{ display: "block", marginBottom: "10px" }}>
            Explanation
          </span>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "18px",
              lineHeight: 1.65,
              color: "var(--fg-2)",
              margin: 0,
            }}
          >
            {reveal?.explanation ?? "Loading explanation..."}
          </p>
        </div>

        <div
          style={{
            padding: "20px 30px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "22px",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="label" style={{ display: "block", marginBottom: "4px" }}>
              Attempts
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 600,
                color: won ? "var(--fg)" : "var(--danger-fg)",
              }}
            >
              {won ? `${state.guesses.length} / 5` : "Failed"}
            </span>
          </div>
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "22px",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="label" style={{ display: "block", marginBottom: "4px" }}>
              Difficulty
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 600,
                color: "var(--fg)",
                textTransform: "capitalize",
              }}
            >
              {caseData.difficulty}
            </span>
          </div>
        </div>

        <div
          className="result-modal-actions"
          style={{
            padding: "20px 30px 0",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="result-modal-action result-modal-action-secondary"
            onClick={handleShare}
            disabled={!organism}
            style={{
              flex: showNewGame || onClose ? 1 : undefined,
              minWidth: "140px",
              padding: "15px 18px",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 500,
              color: copied ? "var(--correct-fg)" : "var(--fg-2)",
              opacity: organism ? 1 : 0.55,
              cursor: organism ? "pointer" : "default",
              transition: "color 150ms, border-color 150ms, background 150ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (!copied) el.style.color = "var(--fg)";
              el.style.borderColor = "var(--accent-border)";
              el.style.background = "var(--surface)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              if (!copied) el.style.color = "var(--fg-2)";
              el.style.background = "var(--surface-subtle)";
              el.style.borderColor = "var(--border)";
            }}
          >
            {copied ? "Copied" : "Share"}
          </button>

          {showNewGame && onNewGame && (
            <button
              className="result-modal-action result-modal-action-primary"
              onClick={onNewGame}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "15px 18px",
                background: "var(--accent)",
                border: "1px solid var(--accent-border)",
                borderRadius: "999px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "15px",
                fontWeight: 600,
                color: "white",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
              }}
            >
              {newGameLabel}
            </button>
          )}

          {onClose && (
            <button
              className="result-modal-action result-modal-action-close"
              onClick={onClose}
              style={{
                minWidth: "120px",
                padding: "15px 18px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--fg-2)",
                transition: "color 150ms, border-color 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--fg)";
                e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--fg-2)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
