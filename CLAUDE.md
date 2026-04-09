# Microble — Claude Code Context

**Read [PROJECT.md](PROJECT.md) fully before making any changes.** It is the authoritative reference for architecture, data models, game rules, and design decisions.

This file contains the subset of information most critical for Claude Code to act correctly.

---

## What This Is

A browser-based clinical microbiology guessing game (Wordle-style). Players identify a causative pathogen from up to 5 sequential clinical clues. Two modes: Daily (one case/day, globally deterministic) and Free Play (local pool, no repeats until reset).

Stack: Next.js 16 App Router · TypeScript · Tailwind v4 · Fuse.js · Zod · OpenAI SDK

---

## Verification

Always run both before considering a change complete:

```bash
npm run build   # must exit 0
npm run test    # vitest — all tests must pass
```

---

## Critical Invariants — Do Not Break

| Invariant | Location | Why |
|---|---|---|
| `EPOCH = 2026-04-01` | `lib/dailyCase.ts` | Changing it after launch shifts every daily case assignment globally |
| `MAX_GUESSES = 5` | `lib/gameState.ts` | Game logic, share text, and UI all depend on exactly 5 turns |
| `hintsRevealed` starts at 1 | `lib/gameState.ts` | Hint 1 is always visible; formula is `min(guessCount + 1, 5)` |
| `guesses` is `(string \| null)[]` | `lib/types.ts` | `null` = Pass/skip. Changing to `string[]` breaks share text and GuessHistory |
| Fuse built with per-name records | `lib/matcher.ts` | Concatenating names into one string degrades match quality |
| `source === "ai_generated"` no longer gates difficulty floor | `lib/caseStore.ts` | The floor now applies to all cases — do not re-add the source guard |

---

## Code Style Rules

- **Inline styles, not Tailwind classes** for anything that reads a CSS custom property (design token). Tailwind is used only for structural/layout utilities. This is intentional — see PROJECT.md.
- **No `src/` directory.** Imports use `@/` alias pointing to the project root.
- **`lib/organisms.ts`** is the single source of truth for valid answer organisms. Any new pathogen needs to be added here before it can be a correct answer in-game.
- **`data/pathogen-catalog.ts`** is the editorial expansion catalog. Adding a pathogen here only queues it for generation; it does not make it a valid answer until it is also in `lib/organisms.ts`.
- **JSON files in `data/`** are the live runtime case store. They are read by the server at request time.

---

## Difficulty System

- Three tiers: `usmle_core` (min: easy), `usmle_extended` (min: medium), `rare_bonus` (min: hard, **all cases must be hard**).
- The floor is enforced in `lib/caseStore.ts → normalizeStoredRecord()` for all cases regardless of source.
- If you add handcrafted cases for `rare_bonus` pathogens, they must be labeled `"hard"`. Run `npm run fix:difficulties` to patch any mistakes retroactively.

---

## Free-Play Deduplication

Completed case tracking uses localStorage keys prefixed `microble-fp-{caseId}`. The `getCompletedFreeplayCaseIds()` function in `lib/gameState.ts` trusts the key prefix — it no longer checks `state.mode === "freeplay"`. Do not add that check back.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run generate:pathogens` | Generate AI cases for the daily/freeplay pools |
| `npm run generate:pathogens -- --pathogen-id=<id>` | Generate for one pathogen only |
| `npm run generate:pathogens -- --pool=daily` | Daily pool only |
| `npm run fix:difficulties` | Retroactively apply tier difficulty floor to all JSON cases |
