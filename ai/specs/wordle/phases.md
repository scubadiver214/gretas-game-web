# Word Quest — phases

## Checklist

- [x] **Phase 1** — playable Word Quest (`/play/wordle`)
- [x] **Phase 2** — CI lint: hint action is not named like a React hook

---

## Phase 1 — playable game

**Goal.** A nickname-gated word game with a grid, keyboard, hints, and round scoring.

**What exists.** `src/features/wordle/` as described in [plan.md](plan.md). Product notes in `gretas-game-web/README.md`.

**How verified.** Already shipped before this spec folder was filled in. This entry records that state; it was not re-playtested in the lint-fix session.

---

## Phase 2 — hook-name lint

**Goal.** `eslint` `react-hooks/rules-of-hooks` passes on `WordleGame.tsx`.

**What was built.** The Zustand action `useHint` was renamed to `applyHint` in `useWordleGame.ts` and the three hint buttons in `WordleGame.tsx`. Behavior is unchanged.

**How verified.** `pnpm exec eslint src/features/wordle/WordleGame.tsx src/features/wordle/useWordleGame.ts` reports no `react-hooks/rules-of-hooks` errors. Browser play was not required: the click handlers still call the same function with the same hint kinds.
