# The Fitz and Furious (racing)

Kids' arcade racer at `/play/racing`. Code: `src/features/racing/`.

**Status: phases 1–3 done**, including 3.2 (in-place crashes, closer rivals), 3.3 (gun, mine and oil picked up off the road), 3.4 (easier first rival races, 10-second gun bursts), 3.5 (boost on the left thumb) and 3.6 (an explosion when a weapon catches another car). Five open tracks, Fitzmagic plus four rival cars, race-or-time-trial on the menu. Persistence, garage, unlocks and polish are still ahead.

## Read in this order

1. [phases.md](phases.md) — what Phase 2 and Phase 3 actually are, and what shipped
2. [plan.md](plan.md) — architecture, layout, API sketch, risks
3. [decisions.md](decisions.md) — every choice and the ones we rejected
4. [todos.md](todos.md) — leftover work, by phase
5. [bugs.md](bugs.md) — known defects

## Snapshot

| | |
| --- | --- |
| Route | `/play/racing` |
| Engine | Pure TS, fixed 60 Hz, no Rapier |
| Renderer | Imperative three.js, procedural worlds and cars |
| Modes | Race rivals (default) or time trial |
| Tracks | Desert, winter, alpine, beach, jungle — all open |
| Persistence | Scores post to the shared leaderboard; no racing profile yet (Phase 4) |

## Code map

`config.ts`, `types.ts`, `rivals.ts`, `engine/` (including `ai.ts`), `world/`, `render/` (Fitzmagic + `vehicle/rivals.ts`), `components/`, `RacingGame.tsx`.
