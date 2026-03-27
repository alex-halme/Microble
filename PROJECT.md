# Microble — Project Summary

> This document is the authoritative reference for any AI assistant working on this codebase.
> Read it fully before making any changes. It reflects the current implemented state.

---

## What Is Microble

A browser-based clinical microbiology guessing game, inspired by Wordle. The player is presented with a real-world clinical case and must identify the causative organism (e.g. *Staphylococcus aureus*) from up to 5 sequential clues. The game is aimed at medical students and clinicians.

Two modes:
- **Daily** — one case per day, globally consistent (same case for all users at the same UTC date)
- **Free Play** — cases drawn from a local pool without repeats once completed; after clearing the pool, the user is congratulated and can reset progress

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Fonts | Apple-style system sans stack via CSS variables (`-apple-system`, `BlinkMacSystemFont`, `SF Pro` fallbacks) |
| Fuzzy matching | Fuse.js v7 |
| Testing | Vitest |
| AI generation | OpenAI `gpt-5-mini` via `openai` SDK |
| Schema validation | Zod |
| Script runner | `tsx` |
| Data storage | SQLite via `better-sqlite3` |
| Deployment target | Vercel (not yet deployed) |

**Important Tailwind v4 notes:**
- PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`), configured in `postcss.config.mjs`
- CSS entry point uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- Custom design tokens are plain CSS custom properties in `globals.css`, not in a Tailwind config

---

## File Structure

```
app/
  layout.tsx          Server component: sticky header (wordmark + nav), main wrapper
  page.tsx            Daily game — loads today's case from SQLite, renders GameBoard
  globals.css         Design system: CSS variables, fonts, .label utility class, .nav-link
  play/
    page.tsx          Free play — client component, fetches random unsolved cases from /api/freeplay
  api/
    freeplay/
      route.ts        Server route: returns one random eligible free-play case from SQLite

components/
  GameBoard.tsx       Main orchestrator: loads/saves state, handles guesses and skips
  HintList.tsx        Renders revealed clue cards with editorial styling
  GuessInput.tsx      Text input + autocomplete dropdown + Submit button + Pass button
  GuessHistory.tsx    Typeset list of previous attempts (strings + nulls for skips)
  ResultModal.tsx     Centered result dialog shown on win/loss; share, next case / finish run, close

lib/
  types.ts            All shared TypeScript interfaces (see Data Models below)
  organisms.ts        Static dictionary of ~60 organisms — THE source of truth for valid answers
  matcher.ts          4-pass answer matching logic (pure function, fully testable)
  gameState.ts        localStorage persistence, state transitions, share text builder
  dailyCase.ts        UTC epoch-based daily case selection
  caseStore.ts        SQLite-backed case storage, seeding, and pool queries
  generatedCases.ts   Helpers that normalize generated pathogen cases into live game cases

data/
  microble.db         SQLite database used by the live app and generation scripts
  daily-cases.json    Seed/fallback generated daily cases JSON
  legacy-daily-cases.json Archived hand-crafted daily seed cases
  pathogen-catalog.ts Expanded editorial pathogen list: 164 bacteria/viruses/parasites for future pool growth
  pathogen-generation-plan.ts Quota plan for separate daily vs free-play expansion pools
  generated-freeplay-pathogen-cases.json Legacy seed/export file for generated free-play cases
  generated-daily-pathogen-cases.json Legacy seed/export file for generated daily cases

scripts/
  generate-cases.ts   Offline AI case generation pipeline that now writes free-play cases into SQLite
  generate-pathogen-cases.ts Broader offline pipeline for bacteria + viruses + parasites, writing daily/free-play pools into SQLite

tests/
  matcher.test.ts     22 unit tests for the matching logic — all passing
```

---

## Data Models

```typescript
// lib/types.ts

interface Organism {
  id: string;              // kebab-case: "staphylococcus-aureus"
  canonical: string;       // "Staphylococcus aureus"
  kind: "bacterium" | "virus" | "parasite";
  genus?: string;
  species?: string;
  abbreviations: string[]; // ["S. aureus", "Staph aureus", "Staph. aureus"]
  commonNames: string[];   // ["MRSA"] — ONLY unambiguous ones
  gramStain?: "positive" | "negative" | "variable" | "none";
  morphology?: "cocci" | "bacilli" | "spirochete" | "other";
  oxygen?: "aerobe" | "anaerobe" | "facultative" | "microaerophilic";
  classificationTags?: string[];
  notes?: string;
}

type HintCategory =
  | "presentation" | "history" | "lab"
  | "imaging" | "exposure" | "treatment_response";

interface Hint {
  order: 1 | 2 | 3 | 4 | 5;
  text: string;       // 1–3 sentences of clinical text
  category: HintCategory;
}

interface MicrobleCase {
  id: string;
  organismId: string;  // must match an Organism.id in organisms.ts
  hints: [Hint, Hint, Hint, Hint, Hint];  // exactly 5, in order
  difficulty: "easy" | "medium" | "hard";
  explanation: string; // shown in ResultModal after game ends
  source: "handcrafted" | "ai_generated";
  validated: boolean;
  createdAt: string;   // ISO date string
}

interface GameState {
  caseId: string;
  mode: "daily" | "freeplay";
  date?: string;              // YYYY-MM-DD, daily mode only
  guesses: (string | null)[]; // string = organism text guess, null = skipped (Pass)
  hintsRevealed: number;      // 1–5 (1 is always shown from game start)
  status: "playing" | "won" | "lost";
  completedAt?: string;
}

type MatchResult =
  | { matched: true; organism: Organism; confidence: "exact" | "fuzzy" }
  | { matched: false; reason: "no_match" | "ambiguous" | "below_threshold" };
```

---

## Game Rules (IMPORTANT — do not change without understanding the cascade)

1. **Hint 1 is always visible** when the game loads. `hintsRevealed` starts at `1`, not `0`.
2. **Each wrong guess OR pass reveals the next hint**, up to a maximum of 5.
   - Formula: `hintsRevealed = Math.min(guessCount + 1, 5)`
3. **MAX_GUESSES = 5** (in `lib/gameState.ts`). Turn sequence:
   - Turn 1 wrong → 2 hints, 4 left
   - Turn 2 wrong → 3 hints, 3 left
   - Turn 3 wrong → 4 hints, 2 left
   - Turn 4 wrong → **5 hints** (all shown), 1 left
   - Turn 5 wrong → **LOST**
4. **Pass (skip)** adds `null` to `guesses[]` and counts as a turn. It is disabled when:
   - All 5 hints are already visible (`hintsRevealed >= 5`), OR
   - Only 1 guess remains (`guessesRemaining <= 1`) — cannot waste the final turn
5. **Correct guess** on any turn → `status: "won"`, game ends immediately.
6. **Share text** uses ✅ for win, ❌ for wrong guess, ⬜ for pass.
7. **State is stored in `localStorage`**, keyed as:
   - Daily: `microble-daily-YYYY-MM-DD`
   - Free play: `microble-fp-{caseId}`
8. **Completed free-play cases are not repeated** until the user resets free-play progress.
9. **If a free-play case is seen again before completion**, its saved in-progress state is cleared and the round starts fresh.
10. **When every free-play case is complete**, the free-play page shows a completion state with a reset button instead of selecting another case.

---

## Answer Matching (lib/matcher.ts)

`matchGuess(input, organisms)` runs 4 passes, fastest/strictest first:

| Pass | Logic | Example |
|---|---|---|
| 1 | Exact canonical name (case-insensitive, normalized whitespace) | `"staphylococcus aureus"` |
| 2 | Exact match against any registered abbreviation or common name | `"S. aureus"`, `"MRSA"` |
| 3 | Abbreviation expansion: single-letter genus + species, or partial genus + species prefix | `"S aureus"`, `"staph aureus"`, `"strep pneumo"` |
| 4 | Fuse.js fuzzy on per-name records (threshold 0.45, `ignoreLocation: true`) | `"Staphyloccocus aureus"` (typo) |

**Rejection rules:**
- If pass 3 expands to multiple organisms → `ambiguous`
- If pass 4 top two distinct organisms score within 0.1 of each other → `ambiguous`
- If nothing clears threshold → `no_match` or `below_threshold`

**Critical constraints:**
- The Fuse index is built with one record per name variant (not concatenated). This is intentional — concatenation degrades match quality.
- `ignoreLocation: true` is required; without it, Fuse penalises matches not near the start of a string, which breaks long species names.
- Do not raise the threshold above ~0.5 without re-running the full test suite.

---

## Daily Case Selection (lib/dailyCase.ts)

```typescript
const EPOCH = new Date("2026-04-01T00:00:00Z"); // launch date — do not change after launch

function getDailyCase(cases: MicrobleCase[]): MicrobleCase {
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayIndex = Math.floor((utcToday - EPOCH.getTime()) / 86_400_000);
  const idx = ((dayIndex % cases.length) + cases.length) % cases.length;
  return cases[idx];
}
```

- All arithmetic is in UTC. Changing `EPOCH` after launch shifts every case assignment — don't do it.
- Cases cycle: when `dayIndex >= cases.length`, it wraps.
- The daily page is dynamically rendered on request and the client refreshes at the next UTC midnight, so the daily case changes exactly once per UTC day.
- Generated daily cases are the live daily pool. Legacy hand-crafted daily cases are used only as a seed/fallback source.

---

## Design System

Visual direction: **"Clinical Clarity"** — light, highly legible, system-typography-first. Tone should feel like a premium Apple productivity app interpreting a medical case handout, not a game wrapped in visual effects.

### CSS Custom Properties (globals.css)

```css
--bg:              #f5f5f7;
--surface:         #ffffff;
--surface-subtle:  #f5f5f7;
--surface-tint:    #f5f9ff;
--surface-modal:   rgba(255,255,255,0.96);
--border:          #d9d9de;
--border-strong:   #c6c7cc;
--fg:              #1d1d1f;
--fg-2:            #424245;
--fg-3:            #6e6e73;
--accent:          #0071e3;
--accent-soft:     rgba(0,113,227,0.08);
--accent-border:   rgba(0,113,227,0.24);
--correct:         #1f7a5c;
--correct-fg:      #1f7a5c;
```

### Typography
- **System sans stack**: all UI and reading text use Apple-style system sans fallbacks for maximum legibility and platform fit.
- **System monospace** (`ui-monospace`): available for technical text when needed, but no longer the primary organism display style.
- `.label` utility class: 12px, 600 weight, modest tracking, uppercase — used for metadata and section markers.

### Signature Element
The most recently revealed clue card gets a **quiet blue-tinted paper treatment** and a small accent marker. Older clue cards remain plain white with generous spacing and high-contrast text.

### Components Use Inline Styles
All components use inline `style={{}}` props (not Tailwind classes) for design-token-dependent styles, because Tailwind v4's arbitrary value syntax for CSS variables is verbose and less readable in this codebase. Tailwind is used only for structural/layout utilities where convenient.

---

## AI Case Generation (scripts/generate-cases.ts)

**Purpose:** Offline script that generates validated `MicrobleCase` objects and writes them into the SQLite `freeplay` pool. JSON files are now only seed/export artifacts.

**Cost strategy:**
- 3 cases per API call per organism (amortises system prompt tokens)
- `gpt-5-mini` model for stronger structured generation quality
- No critique/review pass (local validation only)
- OpenAI Batch API flag (`--batch`) for 50% cost reduction at 24h turnaround
- **Full run: ~60 organisms × 3 = 180 cases ≈ $0.05–$0.10 total**

**Validation pipeline (per generated case):**
1. Zod schema validation (hints count, category enum, string lengths)
2. Organism name in dictionary check (must match `ORGANISMS` exactly)
3. First-hint vignette check: hint 1 must be a patient presentation, not generic background information
4. Name-leakage check: no hint text may contain genus, species, abbreviation, or common name
5. Distinct hint categories check (all 5 hints must use different categories)
6. Lab-unit check: reject cases that use clearly US-style lab units such as `mg/dL` or `/uL`

**CLI:**
```bash
OPENAI_API_KEY=sk-...  npm run generate                       # immediate, all organisms
OPENAI_API_KEY=sk-...  npm run generate -- --count=50         # top-up ~50 cases
OPENAI_API_KEY=sk-...  npm run generate:batch                 # Batch API (50% cheaper)
OPENAI_API_KEY=sk-...  npm run generate -- --batch-status <id>
OPENAI_API_KEY=sk-...  npm run generate -- --batch-retrieve <id>
```

Output: `data/microble.db` (`cases` table, `freeplay` pool rows).

### Expanded Pathogen Pipeline

To support a larger future pool that includes **viruses and parasites** in addition to bacteria, the repo now also contains:

- `data/pathogen-catalog.ts`: broader target list of **164 pathogens** (`71` bacteria, `48` viruses, `45` parasites), intended as the editorial expansion catalog
- `data/pathogen-generation-plan.ts`: quota plan that separates **daily** and **free play** generation targets
  - free play target: **2060** AI-generated candidate cases
  - daily candidate target: **324** higher-quality candidate cases
- `scripts/generate-pathogen-cases.ts`: offline generator that writes into the SQLite `cases` table for:
  - `freeplay`
  - `daily`

This expanded pipeline now feeds the live game path as well: `lib/organisms.ts`, the matcher, and the result UI all support bacteria, viruses, and parasites. The pathogen catalog remains the editorial source for broader coverage and quota planning.

Editorial generation requirements for both pipelines:
- every case should read as a patient vignette rather than a list of facts
- hint 1 must be a clinically meaningful presentation clue, not broad background information
- non-presentation background clues should use patient-specific `history`, not generic pathogen background
- laboratory hints should use European / SI-style units
- generated cases should be closer in depth to the hand-crafted daily cases, with concrete patient detail rather than generic summary language
- generated cases should default to globally legible clinical framing rather than US-centered institutions or assumptions

**Expanded CLI:**
```bash
OPENAI_API_KEY=sk-... npm run generate:pathogens
OPENAI_API_KEY=sk-... npm run generate:pathogens -- --pool=daily
OPENAI_API_KEY=sk-... npm run generate:pathogens -- --count=100
OPENAI_API_KEY=sk-... npm run generate:pathogens -- --pathogen-id=influenza-a-virus
```

---

## What Is NOT Yet Built

These are the next planned phases. They are not implemented yet.

### Hosted multi-instance storage
- The app now uses local SQLite (`data/microble.db`) for case storage.
- This is appropriate for local development and a lightweight single-instance deployment.
- If the project outgrows file-based SQLite, the next migration target should be a hosted Postgres database.

### Vercel cron for pool replenishment
- `vercel.json` with a cron entry hitting `/api/admin/generate-cases`
- Should top up pool when `used_count` per organism drops below a threshold

### Animations
- No Framer Motion or CSS animations yet. The design calls for subtle transitions on hint card reveal and incorrect guess feedback.

### OG image / sharing metadata
- `app/layout.tsx` has basic OpenGraph tags but no custom image.

---

## Running the Project

```bash
npm run dev       # development server at localhost:3000
npm run build     # production build (must pass before any deploy)
npm run test      # vitest unit tests
npm run generate  # AI case generation (requires OPENAI_API_KEY)
npm run generate:pathogens  # broader pathogen case generation (requires OPENAI_API_KEY)
```

The build must pass cleanly (`npm run build` exits 0) before any change is considered complete.

---

## Known Constraints and Non-Obvious Decisions

| Decision | Reason |
|---|---|
| All game logic client-side | Wordle precedent; no competitive stakes; eliminates session complexity |
| `guesses` is `(string \| null)[]` | `null` represents a Pass (skip). Do not change to `string[]` — it would break the share text builder and GuessHistory rendering |
| `hintsRevealed` starts at 1 | Hint 1 is always visible. Initial state has 0 guesses but 1 hint. The formula `min(guessCount + 1, 5)` maintains this invariant |
| `MAX_GUESSES = 5`, not 6 | Exactly one guess allowed after all 5 hints are revealed |
| Fuse built with per-name records | Concatenating all names into one string degrades match scores for typos. Each name variant is a separate record |
| CSS variables not Tailwind theme | Tailwind v4 theme integration for custom variables is verbose; inline styles + CSS vars are more maintainable here |
| No `src/` directory | The project root is flat. Imports use `@/` alias pointing to the project root |
| System font stack, not webfonts | Keeps the UI fast, native-feeling, and closer to Apple platform typography without external font loading |
| `EPOCH = 2026-04-01` | Do not change after launch. Moving the epoch shifts every case assignment globally |
| SQLite is the live case store | Daily and free-play case selection now read from `data/microble.db`; JSON files are seed/export artifacts, not the runtime source of truth |
