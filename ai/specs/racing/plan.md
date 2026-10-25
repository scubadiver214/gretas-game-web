# Racing — architecture

Living plan. Phases and the checklist live in [phases.md](phases.md). Choices live in [decisions.md](decisions.md).

## 1. What the repository actually is

| Brief assumed | Reality | Decision |
| --- | --- | --- |
| "Existing React application" | `gretas-game-web`: Next.js 16 (App Router, webpack), React 19.2, MUI 9, TanStack Query, zustand 5, three 0.186, R3F 9, drei 10, vitest 5, pnpm | Reuse all of it. |
| Existing authentication / player accounts | **No auth.** Identity is a nickname (2-16 chars) + character + colour, persisted in `features/player/store.ts` and mirrored server-side in `players` keyed by normalised nickname. `RequirePlayer` gates screens. | Same nickname identity. Do not invent accounts. Risk in section 6. |
| "Rapier physics where appropriate" | No physics engine in the repo. Claw/Frogger/Kitchen all use pure-TS fixed-step engines. | **No Rapier.** Custom arcade vehicle model: deterministic, unit-testable, no WASM. |
| `games/the-fitz-and-furious/...` layout | Features live in `src/features/<game>/` | `src/features/racing/`, same shape as claw/frogger. |
| ASP.NET Core + Aspire + PostgreSQL | `gretas-game-api`: .NET 10 Minimal API + Dapper, FluentMigrator, Aspire. Per-game rules validate client-reported results. | Reuse that pattern for racing (Phase 4). |
| Zustand for game state | Used for the *HUD snapshot only*; the engine is a plain class that pushes when a displayed value changes. | Same. |

Conventions:

- Pure engine (no React, no three.js) with `advance(dt)`, fixed steps, an `Emitter` for events and an `onHud` callback.
- Imperative three.js renderer that only *reads* the engine; canvas created per mount; full disposal; DPR capped at 2.
- Thin React shell: menus, HUD, overlays. `useRoundMusic`, `fx.*`, `SettingsToggles`, `reducedMotion`.
- Tuning numbers in `config.ts` / data files; tests beside code.
- Repo rules: never commit, never deploy. Pushing `gretas-game-api` `main` auto-deploys, so backend work goes on a feature branch.

## 2. Module layout (`src/features/racing/`)

```
config.ts                  title, fixed step, vehicle + camera + AI + traffic tuning
types.ts                   Controls, HudSnapshot, events, RaceSummary, Standing
rivals.ts                  four computer cars: body, paint, handling, personality
engine/
  math.ts, vehicle.ts, collision.ts (including car-car), race.ts
  difficulty.ts            5 DifficultyConfig tiers + assist presets
  ai.ts                    pure-pursuit computer driver
  camera.ts, RaceEngine.ts, input.ts, weather.ts
world/                     spline track, terrain, content, five track defs
render/
  RacingRenderer.ts
  vehicle/fitzmagic.ts     player hypercar
  vehicle/rivals.ts        monster / bubble / formula / bus
  theme.ts, meshes/, textures.ts
components/                canvas, HUD, minimap, menu, overlays, touch
RacingGame.tsx             menu -> countdown -> race -> results
useRacingHud.ts            zustand HUD snapshot
app route: src/app/play/racing/page.tsx
```

Cars implement `VehicleVisual` (root + `update(state)`). A GLB loader can replace a procedural body later without touching engine or HUD.

## 3. Dependencies

None new. Rapier is deliberately not added. Audio uses `lib/fx`.

## 4. Database and API (Phase 4, `gretas-game-api`, feature branch)

Follow the claw pattern: FluentMigrator `M2026MMDDNNNN_AddRacing`, Dapper under `/api/racing`, `RacingRules.cs`, content exported as `racing-content.json` with a drift test. *Definitions are content, not tables.*

| Table | Purpose |
| --- | --- |
| `racing_profiles` | `player_id` pk/fk, coins, gems, xp, selected vehicle/avatar, assist |
| `racing_vehicles` | owned vehicles + `customization` jsonb |
| `racing_avatars` | unlocked avatars |
| `racing_races` | server-opened race (anti-cheat clock) |
| `racing_results` | finished races; unique `(player_id, client_race_id)` |
| `racing_track_progress` | per-track bests, completions, wins, best tier |
| `racing_achievements` | unlocked achievements |
| `racing_currency_transactions` | append-only ledger, idempotent grants |

Endpoints: profile, vehicles, avatars, tracks + progress, start race, complete race, personal bests.

Validation of client-simulated results: server clock bounds duration; minimum time from track length × laps / max boost speed; coin/gem counts bounded by track content × laps; position 1..racers; tier and track unlocked; per-minute rate limit. Same honesty caveat as Frogger/claw.

## 5. Phases (summary)

Full write-up: [phases.md](phases.md).

1. Repository analysis and architecture
2. Playable 3D desert prototype (solo)
3. Complete five-car race (rivals + time trial) — **done 2026-10-25**
4. Collectibles, rewards, persistence
5. Garage and customization
6. Worlds, difficulty unlocks (tracks pulled forward into 2/3)
7. Polish, audio, quality presets

## 6. Risks and tradeoffs

- **No authentication.** Anyone typing a nickname shares that player's racing profile. Acceptable for a family game; real accounts would be repo-wide.
- **Client-simulated results are untrusted.** Mitigated by a server clock + plausibility bounds, not eliminated.
- **Custom physics vs Rapier.** Less "realistic", but deterministic, stable at any frame rate, tunable for children, testable.
- **Track corridor overlap.** Cars stay in the corridor; `validateTrack` forbids distant sections overlapping.
- **Draw calls / triangles.** Repeated props are instanced; terrain is one mesh; shadow map follows the player.
- **Visual identity.** App shell is neon arcade; racing uses gold-framed plates on its own screens.
- **Pack-keeping.** Rivals speed up when far behind and ease off when far ahead, capped at their car's top speed. Skill still wins. Tuning: `config.ts` `AI`.
