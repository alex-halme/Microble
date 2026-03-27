"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import GameBoard from "@/components/GameBoard";
import type { PublicMicrobleCase } from "@/lib/types";
import {
  ALL_FREEPLAY_PATHOGEN_TYPES,
  DEFAULT_FREEPLAY_FILTERS,
  type FreeplayDifficultyFilter,
  type FreeplayPathogenFilter,
} from "@/lib/freeplayFilters";
import {
  clearCurrentFreeplayCaseId,
  getCompletedFreeplayCaseIds,
  getCurrentFreeplayCaseId,
  resetFreeplayProgress,
  setCurrentFreeplayCaseId,
} from "@/lib/gameState";

const PATHOGEN_FILTER_OPTIONS: Array<{
  value: FreeplayPathogenFilter;
  label: string;
}> = [
  { value: "bacteria", label: "Bacteria" },
  { value: "fungi", label: "Fungi" },
  { value: "virus", label: "Virus" },
  { value: "protozoa", label: "Protozoa" },
];

const DIFFICULTY_FILTER_OPTIONS: Array<{
  value: FreeplayDifficultyFilter;
  label: string;
}> = [
  { value: "all", label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function buildPathogenSummary(pathogenTypes: FreeplayPathogenFilter[]): string {
  if (pathogenTypes.length === ALL_FREEPLAY_PATHOGEN_TYPES.length) {
    return "All pathogen types";
  }

  if (pathogenTypes.length === 0) {
    return "No pathogen types";
  }

  return PATHOGEN_FILTER_OPTIONS.filter((option) =>
    pathogenTypes.includes(option.value)
  )
    .map((option) => option.label)
    .join(", ");
}

function buildDifficultySummary(difficulty: FreeplayDifficultyFilter): string {
  if (difficulty === "all") return "Any difficulty";
  return `${difficulty[0].toUpperCase()}${difficulty.slice(1)} only`;
}

function FilterPopup({
  open,
  pathogenTypes,
  difficulty,
  onTogglePathogenType,
  onDifficultyChange,
  onSelectAllPathogenTypes,
  onClearPathogenTypes,
  onResetAll,
  onClose,
}: {
  open: boolean;
  pathogenTypes: FreeplayPathogenFilter[];
  difficulty: FreeplayDifficultyFilter;
  onTogglePathogenType: (value: FreeplayPathogenFilter) => void;
  onDifficultyChange: (value: FreeplayDifficultyFilter) => void;
  onSelectAllPathogenTypes: () => void;
  onClearPathogenTypes: () => void;
  onResetAll: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="filter-popup-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(15, 23, 42, 0.18)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "84px 20px 20px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="filter-popup-panel"
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "var(--surface-modal)",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          boxShadow: "var(--shadow-soft)",
          padding: "22px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="label" style={{ display: "block", marginBottom: "6px" }}>
              Free Play Filters
            </span>
            <p
              style={{
                margin: 0,
                color: "var(--fg-2)",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Build a custom pool, then keep drawing random unsolved cases from it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "var(--surface-subtle)",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span className="label" style={{ color: "var(--fg-3)" }}>
              Pathogen Type
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onSelectAllPathogenTypes}
                style={{
                  padding: "7px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--fg-2)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearPathogenTypes}
                style={{
                  padding: "7px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--fg-2)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PATHOGEN_FILTER_OPTIONS.map((option) => {
              const active = pathogenTypes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTogglePathogenType(option.value)}
                  aria-pressed={active}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: `1px solid ${
                      active ? "var(--accent-border)" : "var(--border)"
                    }`,
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    color: active ? "var(--accent)" : "var(--fg-2)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "background 150ms, border-color 150ms, color 150ms",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <span className="label" style={{ color: "var(--fg-3)" }}>
            Difficulty
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DIFFICULTY_FILTER_OPTIONS.map((option) => {
              const active = difficulty === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onDifficultyChange(option.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: `1px solid ${
                      active ? "var(--accent-border)" : "var(--border)"
                    }`,
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    color: active ? "var(--accent)" : "var(--fg-2)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "background 150ms, border-color 150ms, color 150ms",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            paddingTop: "6px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--fg-2)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {buildPathogenSummary(pathogenTypes)} · {buildDifficultySummary(difficulty)}
          </p>
          <button
            type="button"
            onClick={onResetAll}
            style={{
              padding: "9px 14px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "var(--surface-subtle)",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterToolbar({
  pathogenTypes,
  difficulty,
  onOpen,
}: {
  pathogenTypes: FreeplayPathogenFilter[];
  difficulty: FreeplayDifficultyFilter;
  onOpen: () => void;
}) {
  const activeCount =
    (pathogenTypes.length === ALL_FREEPLAY_PATHOGEN_TYPES.length ? 0 : 1) +
    (difficulty === "all" ? 0 : 1);

  return (
    <section
      className="filter-toolbar"
      style={{
        maxWidth: "860px",
        margin: "0 auto 18px",
        padding: "16px 20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "18px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span className="label" style={{ display: "block", marginBottom: "5px" }}>
          Free Play Pool
        </span>
        <p
          style={{
            margin: 0,
            color: "var(--fg-2)",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          {buildPathogenSummary(pathogenTypes)} · {buildDifficultySummary(difficulty)}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        style={{
          padding: "10px 16px",
          borderRadius: "999px",
          border: "1px solid var(--border)",
          background: activeCount > 0 ? "var(--accent-soft)" : "var(--surface-subtle)",
          color: activeCount > 0 ? "var(--accent)" : "var(--fg)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
      </button>
    </section>
  );
}

function CompletionView({
  totalCases,
  onReset,
  onResetFilters,
  filtered,
}: {
  totalCases: number;
  onReset: () => void;
  onResetFilters: () => void;
  filtered: boolean;
}) {
  const noMatchingCases = totalCases === 0;

  return (
    <section
      style={{
        maxWidth: "760px",
        margin: "48px auto 0",
        padding: "32px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "28px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span
        className="label"
        style={{ display: "block", marginBottom: "12px", color: "var(--accent-strong)" }}
      >
        Free Play Complete
      </span>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 600,
          letterSpacing: "-0.05em",
          color: "var(--fg)",
          margin: 0,
          lineHeight: 0.98,
        }}
      >
        {noMatchingCases
          ? "No cases match the current filters."
          : "You finished every available case."}
      </h1>
      <p
        style={{
          margin: "16px 0 0",
          fontSize: "18px",
          lineHeight: 1.6,
          color: "var(--fg-2)",
          maxWidth: "640px",
        }}
      >
        {noMatchingCases
          ? "Try a broader pathogen mix or difficulty setting to pull a different random subset."
          : filtered
          ? `You completed all ${totalCases} free-play cases that match the current filters. Reset free play to clear your progress, or reset the filters to widen the pool.`
          : `You completed all ${totalCases} free-play cases in the current local pool. Reset free play to clear your progress and start the rotation again.`}
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
        {!noMatchingCases && (
          <button
            onClick={onReset}
            style={{
              padding: "14px 20px",
              borderRadius: "999px",
              background: "var(--accent)",
              border: "1px solid var(--accent-border)",
              color: "white",
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset Free Play
          </button>
        )}
        {filtered && (
          <button
            onClick={onResetFilters}
            style={{
              padding: "14px 20px",
              borderRadius: "999px",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    </section>
  );
}

export default function PlayPage() {
  const [currentCase, setCurrentCase] = useState<PublicMicrobleCase | null>(null);
  const [totalCases, setTotalCases] = useState(0);
  const [completedMatchingCount, setCompletedMatchingCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pathogenTypes, setPathogenTypes] = useState<FreeplayPathogenFilter[]>(
    DEFAULT_FREEPLAY_FILTERS.pathogenTypes
  );
  const [difficulty, setDifficulty] = useState<FreeplayDifficultyFilter>(
    DEFAULT_FREEPLAY_FILTERS.difficulty
  );

  const syncProgress = useCallback(
    async (excludeId?: string) => {
      const completed = getCompletedFreeplayCaseIds();
      const activeCaseId =
        excludeId !== undefined ? undefined : getCurrentFreeplayCaseId() ?? undefined;
      const response = await fetch("/api/freeplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedIds: completed,
          excludeId,
          activeCaseId,
          pathogenTypes,
          difficulty,
        }),
      });
      const payload = (await response.json()) as {
        caseData: PublicMicrobleCase | null;
        totalCases: number;
        completedMatchingCount: number;
      };

      setCurrentCase(payload.caseData);
      if (payload.caseData) {
        setCurrentFreeplayCaseId(payload.caseData.id);
      } else {
        clearCurrentFreeplayCaseId();
      }
      setTotalCases(payload.totalCases);
      setCompletedMatchingCount(payload.completedMatchingCount);
      setHydrated(true);
    },
    [difficulty, pathogenTypes]
  );

  useEffect(() => {
    void syncProgress();
  }, [syncProgress]);

  const handleNewGame = useCallback(() => {
    clearCurrentFreeplayCaseId();
    void syncProgress(currentCase?.id);
  }, [currentCase?.id, syncProgress]);

  const handleReset = useCallback(() => {
    resetFreeplayProgress();
    void syncProgress();
  }, [syncProgress]);

  const resetFilters = useCallback(() => {
    setPathogenTypes(DEFAULT_FREEPLAY_FILTERS.pathogenTypes);
    setDifficulty(DEFAULT_FREEPLAY_FILTERS.difficulty);
  }, []);

  const togglePathogenType = useCallback((value: FreeplayPathogenFilter) => {
    setPathogenTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }, []);

  const filtered = useMemo(() => {
    if (difficulty !== DEFAULT_FREEPLAY_FILTERS.difficulty) return true;
    if (pathogenTypes.length !== ALL_FREEPLAY_PATHOGEN_TYPES.length) return true;
    return !ALL_FREEPLAY_PATHOGEN_TYPES.every((value) => pathogenTypes.includes(value));
  }, [difficulty, pathogenTypes]);

  if (!hydrated) {
    return (
      <div style={{ display: "grid", gap: "12px", opacity: 0.5 }}>
        <div
          style={{
            width: "140px",
            height: "14px",
            borderRadius: "999px",
            background: "var(--surface-muted)",
          }}
        />
        <div
          style={{
            width: "50%",
            height: "44px",
            borderRadius: "18px",
            background: "var(--surface-muted)",
          }}
        />
        <div
          style={{
            height: "260px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        />
      </div>
    );
  }

  const remainingCount = totalCases - completedMatchingCount;
  const nextActionLabel = remainingCount === 1 ? "Finish Run" : "Next Case";

  return (
    <>
      <FilterToolbar
        pathogenTypes={pathogenTypes}
        difficulty={difficulty}
        onOpen={() => setFiltersOpen(true)}
      />
      <FilterPopup
        open={filtersOpen}
        pathogenTypes={pathogenTypes}
        difficulty={difficulty}
        onTogglePathogenType={togglePathogenType}
        onDifficultyChange={setDifficulty}
        onSelectAllPathogenTypes={() =>
          setPathogenTypes(ALL_FREEPLAY_PATHOGEN_TYPES)
        }
        onClearPathogenTypes={() => setPathogenTypes([])}
        onResetAll={resetFilters}
        onClose={() => setFiltersOpen(false)}
      />
      {!currentCase ? (
        <CompletionView
          totalCases={totalCases}
          onReset={handleReset}
          onResetFilters={resetFilters}
          filtered={filtered}
        />
      ) : (
        <GameBoard
          key={`${currentCase.id}-${pathogenTypes.join(",")}-${difficulty}`}
          caseData={currentCase}
          mode="freeplay"
          onNewGame={handleNewGame}
          newGameLabel={nextActionLabel}
        />
      )}
    </>
  );
}
