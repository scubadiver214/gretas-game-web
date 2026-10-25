# Word Quest — architecture

Living plan. Phases live in [phases.md](phases.md). Choices live in [decisions.md](decisions.md).

## Module layout (`src/features/wordle/`)

```
WordleGame.tsx      React shell: intro, grid, hint buttons, keyboard, round finish
useWordleGame.ts    Zustand store: phase, puzzles, guesses, hints, score
WordGrid.tsx        Guess rows and tile colors
Keyboard.tsx        On-screen letter keys
words.ts            Word lists and guess validation
scoring.ts          Difficulty, hint unlocks, points, stars
scoring.test.ts     Scoring unit tests
```

Route: `src/app/play/wordle/page.tsx` → `/play/wordle`.

The store is the game. React reads slices with `useWordleGame` and calls actions (`typeLetter`, `submitGuess`, `applyHint`, `reset`). Hint buttons live in `WordleGame` and call `applyHint` with `"nextLetter"`, `"letterInWord"`, or `"revealSpot"`.

## Risks

- Store actions must not be named `useX`. `react-hooks/rules-of-hooks` treats that prefix as a hook, including calls inside `onClick`.
