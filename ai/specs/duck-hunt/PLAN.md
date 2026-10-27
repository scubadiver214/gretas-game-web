# Wild Adventure Hunting — architecture

Living plan. The original brief is [PLAN.md](PLAN.md) (with the reference screenshot [duckhunt.png](duckhunt.png)). Phases: [phases.md](phases.md). Choices: [decisions.md](decisions.md).

Feature slug: `duck-hunt`. Code: `src/features/hunting/`. Route: `/play/hunting`. Leaderboard mode: `hunting`.

## 1. What the repository gives us

| Brief assumed | Reality | Decision |
| --- | --- | --- |
| React + TS + three + R3F + drei + zustand | All present (Next 16 App Router, React 19.2, three 0.186, R3F 9, drei 10, zustand 5, MUI 9 for UI, vitest 5) | Reuse. **R3F for the whole game scene** (user's call, see D-01). No new dependencies. |
| Tailwind for menus/HUD | Repo uses MUI `sx` everywhere, no Tailwind | MUI `sx` + a game-local palette (`components/hudStyle.ts`). |
| Player profiles + auth | No auth. One nickname identity per device (`features/player/store.ts`), mirrored server-side | Same identity. Game progress is a device-local zustand store (`progress.ts`). |
| .NET Aspire + Postgres backend | `gretas-game-api`: .NET 10 minimal API + Dapper + FluentMigrator; per-mode score rules | Finished levels post to `POST /api/scores` as mode `hunting` (direct submit, like racing). API change lives on branch `feature/hunting-scores`. |
| GLTF assets | None for this game | Procedural models behind small builder functions (`render/models/*`). A GLB loader can replace any builder later. |
| Physics engine | None in repo | Hitscan rays against forgiving spheres, pure TS. |

## 2. Layering

```
engine/ (pure TS, no React, no three)   <- unit tested
  HuntEngine.ts   phases, weapon, shots, scoring, objectives, photos, HUD snapshot, events
  flight.ts       duck flight state machine (takeoff, fly, startled, exit, hit)
  wildlife.ts     ambient animals (swimmers, heron, turtle, frog, loon, kingfisher)
  shooting.ts     pellet spread, ray-sphere tests, aim assist
  aim.ts          yaw/pitch, clamps, direction maths
  photo.ts        photo framing score
  scoring.ts      points, combo, stars, end bonuses
  difficulty.ts   three presets + adaptive boost
  vec.ts          tiny vector helpers
levels.ts, species.ts, badges.ts, config.ts, types.ts   content + tuning as data
progress.ts       persisted zustand store + pure reducers (tested)
render/ (R3F)     reads the engine every frame; never changes game rules
  HuntCanvas.tsx  Canvas, scene root, driver / camera / passes
  Animals.tsx     pooled bird + critter rigs synced from engine.ducks / engine.wildlife
  Effects.tsx, Viewmodel.tsx   thin R3F wrappers around systems/*
  systems/        EffectsSystem, ViewmodelSystem, frame helpers (camera, passes, projector)
  bridge.ts       CanvasBridge: pending photo grab + world-to-screen projector for popups
  models/         birds, critters, shotgun, photo camera, hands (procedural builders)
  world/          terrain.ts + Ground.tsx, Sky, Water, flora + Vegetation, palette
components/       MUI menus, HUD, overlays, touch controls
useHuntHud.ts     HUD snapshot, popups, banners, photo card, badge toasts
audio.ts, fx.ts   synth sounds + lake ambience; engine events -> sound / HUD
HuntingGame.tsx   menu -> intro -> countdown -> play -> results
```

Per-frame mutation of three.js objects lives in plain classes / functions (`render/systems/*`), not in component bodies: the React compiler lint forbids assigning to hook values, and it keeps frames allocation-light (D-01).

The engine is advanced from a `useFrame` at priority -2 with a fixed 1/120 s step. The scene renders manually at priority 1:

1. world scene (main camera, near 0.5 / far 4000)
2. clear depth, then the first-person viewmodel scene (gun/camera + hands) with its own camera

Two passes keep the gun out of the lake reflection and out of wildlife photos, and avoid near-plane z-fighting.

## 3. World: Peaceful Lakeside

Player stands on a raised grassy bank at the origin, eye height 3.2, facing -Z (D-08). Water plane at y = 0.

- `render/world/terrain.ts` + `Ground.tsx` — one polar-grid mesh centred on the player (dense near, coarse far, 285° arc). Height: lake basin (noisy ellipse centred at z = -95), the player's knoll, grassy shore, rolling hills, ridged mountains 300–900 m out. Vertex colours by height/slope (sand, grass, forest, rock, snow). Same function places trees.
- `render/world/Water.tsx` — `Reflector` with a custom shader: procedural wave normals, Fresnel, sun glint, manual fog.
- `render/world/Sky.tsx` — dome shader with gradient, sun glow and moving fbm clouds. Also feeds a PMREM env map for PBR metal and wood.
- `render/world/Vegetation.tsx` — instanced palms, conifers, broadleaf trees, reeds/cattails, wind-swayed grass, lily pads, rocks, turtle log.

## 4. Gameplay systems

- **Aiming:** pointer lock mouse-look (desktop), drag-to-look (touch). Yaw ±75°, pitch -12°..55°. Sensitivity setting. Aim assist (magnetism while moving + sticky reticle) scales with difficulty.
- **Shotgun:** 5-shell magazine, pump cycle 0.42 s, per-shell reload 0.38 s (fire interrupts), auto-reload on empty. 9 pellets in a cone; range 70 m. Right click / AIM button = aim-down-sights (smaller FOV, tighter spread, lower sensitivity).
- **Camera (wildlife photography):** swap with Q / camera button in any level; the only tool in Explorer mode. Zoom 1×/2×/4×. A photo picks the best framed animal and scores 1–3 stars. Thumbnails are captured from the world pass (no hands) and kept in the Field Journal.
- **Ducks:** flights from reed beds (takeoff from the water) or from the sides. Steering with turn-rate limits, wander, banking, climbs and dives, V formations, startle on near misses, exit when done. Hit = sparkle poof + gold star, never injury.
- **Protected wildlife:** swans, heron, loon, kingfisher, turtle, frog. Pellets that hit them do nothing to the animal; the player gets a friendly message (and a small penalty above Junior).
- **Scoring:** 150 flying hit, 200 beyond 40 m, combo multiplier ×1 → ×2, +50 streak bonus, +200 per extra duck in one shot. End: +250 objective, +500 perfect, accuracy bonus up to 300, +25 per unused shell on limited-ammo levels.
- **Stars:** objective met = 1★; score thresholds per level for 2★ and 3★ (shown on the HUD bar).
- **Difficulty:** Junior Explorer / Adventure Hunter / Expert Ranger presets (size, speed, assist, time, penalties). Adaptive boost after repeated fails (slower, bigger, more time), shown to the player.

## 5. Persistence and backend

- `gretas-game:hunting` (localStorage): prefs, per-level best/stars/plays/fails, field journal (species, best stars, thumbnail), badges, totals.
- Global player store: `finishRound({ mode: "hunting", ... })` so stars, history and trophies work like other games.
- `POST /api/scores` mode `hunting`, level = level number within the world (1–5), max score 30,000 (API `ScoreRules`). DB check constraint widened by migration `M202610260001_AddHuntingScores`.

## 6. Risks

- **Reflection cost:** the lake re-renders the scene. Reflection target is half resolution (quarter on touch devices); the terrain arc and instanced trees keep draw calls low.
- **Pointer lock** is not available in every embed; aiming still works from raw mouse movement without it, and touch has its own look pad.
- **Procedural art ceiling:** models are hand-built from primitives. Builders are isolated so GLB assets can replace them.
- **Client-simulated scores** are untrusted, as in every game here; bounded by the API max.
