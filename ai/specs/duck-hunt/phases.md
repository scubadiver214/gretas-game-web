# Wild Adventure Hunting — phases

Brief: [PLAN.md](PLAN.md) section 20. User priorities (2026-10-26): R3F, a genuinely impressive first level, and a wildlife discovery (photography) mode for younger players.

## Phase 1 — Lakeside duck hunt + wildlife discovery (done 2026-10-26)

Goal: a polished, playable World 1 that sets the quality bar for the rest.

- [x] R3F scene: sky with moving clouds, ridged snowy mountains, reflective lake, palms/broadleaf/conifer forest, reed beds and cattails, wind-swayed grass, lily pads with flowers, rocks, turtle log, kingfisher snag
- [x] First-person shotgun with hands (player's skin and shirt colours): recoil, pump stroke, shell ejection, per-shell reload with a shell in hand, aim-down-sights, muzzle flash, smoke, sway
- [x] Procedural mallards (drake with iridescent head, hen), two-segment flapping wings, flight AI: takeoff from the reeds, V formations, banking, climbs, glides, startle and scatter, exit
- [x] Shooting engine (pellet spread, forgiving hit spheres, aim assist), scoring, streak multiplier, two-for-one bonus, stars
- [x] Levels 1–5 as data, unlock chain, results screen, adaptive help
- [x] Difficulty presets (Junior Explorer / Adventure Hunter / Expert Ranger)
- [x] Wildlife photography: camera tool in hunts + Wildlife Explorer mode, 1×/2×/4× zoom, live framing label, photo scoring, polaroid card with fact, Field Journal with the player's own photos, 11 badges
- [x] Ambient wildlife: swans, heron (stand / stalk / strike / fly), painted turtle, frog (hops between pads), loon (dives), kingfisher (arrive / perch / hover / dive), swimming mallards and wood ducks in Explorer mode
- [x] Screenshot-style HUD (shell column, slate score plate with star markers and goal counter, timer, streak chip, reticle that turns gold on target), menus, pause with "How to play", touch controls, rotate prompt
- [x] Synthesised audio: shotgun with lake echo, pump, shell eject, aim, quacks, wing flutter, splashes, shutter, chimes, lake ambience, and a calm suspenseful underscore on the music bus (D-21)
- [x] Hub card, `hunting` leaderboard mode in the web app; API rules + migration committed on `gretas-game-api` `main` (`a3b3268`, not pushed)
- [x] Tests for engine, flight, shooting, scoring/balance, photos, levels, progress, badges

### What exists

- `src/features/hunting/` — `engine/` (pure TS), `render/` (R3F + `systems/` classes), `components/` (MUI), `levels.ts`, `species.ts`, `badges.ts`, `progress.ts`, `audio.ts`, `fx.ts`, `HuntingGame.tsx`; route `src/app/play/hunting/page.tsx`.
- Shared: `GameMode` gains `hunting` (player store v10 migration, scoreboard accent, share card, My Scores, hub card, neon tokens).
- API (committed on local `main`, not pushed): `ScoreRules` modes + max 30,000; migration `M202610260001_AddHuntingScores`; unit + integration tests.

### How it was verified

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (57 files, 689 tests; 50 new in `features/hunting`, 1 new migration test), `pnpm build` (route `/play/hunting` prerendered).
- A scripted player clears every level on every difficulty in `HuntEngine.test.ts`, and every duck is accounted for (hit or escaped).
- In the browser (Cursor's browser, desktop 1553×1284 and 844×390 touch emulation): menu over the live lake, level select, intro, countdown, shooting a duck (sparkles, +150 popup, gold star, shell spent, pump), results screen with stars and badge, Wildlife Explorer photos of heron, turtle, frog and swan (polaroid card with thumbnail and fact, journal entries saved), Field Journal, pause menu, touch controls. ~200 fps on the desktop GPU.
- `gretas-game-api`: `dotnet test` 120/120 (with Docker), including a `hunting` submit through the real migration.

## Phase 1b — Busier duck flights (done 2026-10-27)

Goal: more kinds of ducks to shoot, richer flying formations, and more birds in the air at once on the lakeside levels.

- [x] Six shootable ducks (mallard, wood duck, pintail, teal, canvasback, shoveler), drake and hen
- [x] Formations beyond the V: echelon, line, string, diamond, stack, chevron
- [x] Flight patterns: low pass, overhead, hook back, peel apart, two groups crossing
- [x] Levels 2–5 keep the next flock coming while the last is still up; level 1 stays one flock at a time
- [x] Score cap still holds; ducks left in the air when the round ends count as escaped
- [x] A shot aimed at a duck or a flock scatters every survivor and speeds them up for a few seconds

### What exists

Flying targets are mallard, wood duck, northern pintail, green-winged teal, canvasback and northern shoveler. Swimming wood ducks stay protected. A hit popup names the duck. New species are in the Field Journal (12 animals) once photographed. Flocks use a V, echelon, line, string, diamond, stack or chevron, and may skim low, fly high, hook back, peel apart, or cross from both sides. Level 1 is still one flock at a time (10 ducks). Levels 2–4 overlap (21, 24 and 28 ducks). Level 5 keeps up to 8 in the air, 36 per round.

### How it was verified

- `pnpm exec vitest run src/features/hunting` — 6 files, 56 tests. A bot still clears every level on every difficulty, and hits + escaped equals ducks spawned. Score ceilings stay under 30,000.
- `pnpm exec tsc --noEmit` clean.
- In the browser on Duck Patrol: several ducks in the air at once (a pair on the right, another bird off to the left). Letting the round finish with no shots reported 0/21, so every flock had spawned.
- Scatter-on-miss: `HuntEngine.test.ts` aims just above a pair, misses, and both birds leave the formation and speed up. A shot into the sky leaves the flock together. In the browser, a shot past the first duck of First Flight scored 0 and spent a shell.

## Phase 2 — Core gameplay: rifle, scope, deer, skeet, trap (not started)

Scoped rifle (2×/4×/6×), binoculars, deer AI (graze, walk, run, cover), Deep Mountain Woods as first deer world, skeet and trap ranges with clay physics and break particles.

## Phase 3 — Training Academy (not started)

Five optional lessons (controls, target practice, shotgun, rifle, first hunt) and the Rookie Ranger reward. Today the pause menu's "How to play" is the only help.

## Phase 4 — Environments 2–6 (not started)

Mountain Woods, Tropical Jungle, African Safari (photo-first wildlife), Mountain Wilderness, Championship Range; weather and time-of-day.

## Phase 5 — Full 30-level progression and rewards (not started)

Levels 6–30, equipment unlocks/skins, avatars and hats, cross-world badges, API levels beyond 5.

## Phase 6 — Polish and optimization (not started)

Recorded audio, LODs, loading screens per world, accessibility pass, real-device mobile tuning.
