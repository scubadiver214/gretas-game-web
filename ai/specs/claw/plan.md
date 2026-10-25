Claw Prize Adventure — Implementation Plan

Decisions confirmed





Rendering: three.js (imperative renderer for gameplay, R3F only for small turntable previews). No Phaser.



Persistence: server-side from Phase 2 — new Postgres tables + endpoints in gretas-game-api, keyed by nickname like everything else. Identity weakness is documented, not solved.

Step 2 — Technical design and rationale

Game loop architecture mirrors Frogger (src/features/frogger), the repo's cleanest arcade template:

flowchart LR
  Input[Keyboard / touch buttons / tap-a-toy] --> Engine
  subgraph engine [engine/ pure TypeScript, fixed 120 Hz steps]
    Engine[ClawEngine state machine] --> Grab[grab.ts grip resolution]
    Engine --> Pile[pile.ts settle + wobble]
    Engine --> Difficulty[difficulty.ts curve + adaptive assist]
    Engine --> Rewards[rewards.ts points, stars, milestones]
  end
  Engine -->|events| Fx[fx.ts sounds, haptics, popups, confetti]
  Engine -->|onHud snapshot| Hud[useClawHud zustand]
  Engine -->|read each frame| Renderer[render/ClawRenderer three.js]
  Hud --> Shell[ClawGame.tsx + MUI overlays]
  Shell -->|TanStack Query + outbox| Api[/api/claw/*]
  Api --> Db[(claw_profiles, claw_prizes, claw_avatars, claw_attempts, claw_grabs)]





Renderer: imperative ClawRenderer owning its canvas (like features/frogger/render/ThreeRenderer.ts, with the same fitCamera bisection and strict-mode-safe canvas lifecycle in FroggerCanvas.tsx). Rationale: ~30 toys + claw rig updated every frame with zero React reconciliation; reducedMotion read per frame from features/settings/store.ts. R3F + drei stay for the toy turntable preview (same as CharacterPreview).



Claw physics: custom arcade physics, no physics library. Toys are spheres/capsules with size, weight, gripDifficulty; pile.ts does a seeded drop-and-settle (each toy rests on the highest support beneath it) so layouts are deterministic and testable. grab.ts is a pure function: candidates under the jaw → score from alignment / jaw span vs size / grip vs weight / crowding / level tolerance → caught | missed, plus a seeded, time-fixed slip point during carry on harder levels. Rationale: a rigid-body library (rapier ~2 MB wasm, cannon-es) makes outcomes chaotic and untunable for "favor success at low levels"; a rules-based resolver is testable, forgiving by configuration, and never secretly biased against the player.



Collision: analytic sphere/capsule overlap in the engine (claw tip vs toys, toy vs toy during settle, toy vs chute). No broadphase needed at ≤ 40 toys.



State: plain-JSON engine state (engine/types.ts), Emitter<ClawEvent> from lib/game/events.ts, onHud pushing only on change (Frogger pattern).



Content: data-driven content/prizes.ts, content/levels.ts, content/worlds.ts, content/avatars.ts; a pnpm claw:export-content script writes claw-content.json that is embedded in the API so prize ids, unlock levels, level goals and avatar milestones have one source of truth (same spirit as FroggerRules.cs mirroring config.ts, but without hand-copying).



Art: procedural low-poly toy builders (render/toys/*, ~16 model builders × palette/scale/accessory params covering 45+ prizes; rarity adds gold/sparkle/emissive materials) via a lifted Kit (features/frogger/render/kit.ts → components/three/kit.ts with a re-export so Frogger is untouched). Collection thumbnails are rendered once from the same meshes to an offscreen canvas and cached (render/thumbnails.ts) — one art source for 3D and 2D. Avatars are inline SVG badge components. Each prize keeps an optional asset.glb slot for CC0 models (Quaternius / Kenney / poly.pizza, like public/models/LICENSE.md) if we later want richer toys.



Persistence: server authoritative for the collection, avatars and current level; client keeps a TanStack Query cache plus a persisted outbox of unsent grab/complete calls (idempotent by attempt id + sequence) so an offline session never loses toys.



UI: MUI + design/neon.ts tokens, world palettes recolour the cabinet; reuse RequirePlayer, QuitButton, SettingsToggles, ScorePopups, FlashOverlay, Panel, celebrate().

Gameplay state machine

stateDiagram-v2
  [*] --> ready
  ready --> positioning: start()
  positioning --> descending: grab()
  descending --> gripping: cable at pile
  gripping --> lifting: resolveGrab()
  lifting --> carrying: caught
  lifting --> returning: missed "Great try!"
  carrying --> slipping: slip point (hard levels)
  slipping --> returning
  carrying --> releasing: over chute
  releasing --> delivered: prize in bin "You got it!"
  delivered --> positioning: successes < goal
  delivered --> levelClear: successes >= goal
  returning --> positioning
  positioning --> paused: pause()
  paused --> positioning: resume()
  levelClear --> [*]

Positioning has no timer. Simple mode moves the claw on one rail (left/right); levels with depthControl: true (world 3+) add forward/back. "Tap a toy" raycasts and auto-positions the claw above it (Phase 3). Adaptive assist tracks the fail streak: +tolerance and +grip after 2 misses, a highlighted hint toy and arrow after 3, an easy toy nudged to the top after 4; resets on success.

Directory structure (web: gretas-game-web)

src/features/claw/
  config.ts                 speeds, cable lengths, jaw timings, points per rarity, assist thresholds, stars rule
  content/prizes.ts         PRIZES catalog (45+), Rarity, Category, model + palette, asset slot
  content/levels.ts         50 LevelDefs generated from tier curves + hand-tuned overrides
  content/worlds.ts         5 worlds: level range, palette, cabinet skin, prize pool, mystery prize + avatar
  content/avatars.ts        AVATARS + milestone rules (first grab, 5 toys, level 5 ... level 50, world mystery)
  content/avatarArt.tsx     inline SVG badges
  engine/ClawEngine.ts      state machine, fixed steps, events, onHud, summary()
  engine/claw.ts            kinematics: x/z, cable, jaw angle, damped pendulum swing
  engine/pile.ts            seeded layout, settle, wobble impulses, resettle after drop
  engine/grab.ts            pure grip resolution + slip point
  engine/difficulty.ts      tier curve -> DifficultyVars, adaptive assist
  engine/rewards.ts         points, level stars, milestone evaluation (shared with server JSON)
  engine/input.ts           keyboard bindings (arrows/AD, WS when depth, Space, Esc)
  engine/types.ts           plain-JSON state, ClawEvent, HudSnapshot
  engine/*.test.ts
  render/ClawRenderer.ts    cabinet, glass, marquee lights, claw rig, toys, chute, particles, camera fit
  render/meshes/{cabinet,claw,chute}.ts   render/toys/{teddy,duck,ball,car,slime,yoyo,dino,...}.ts
  render/textures.ts        CanvasTexture decals (faces, stripes, sparkles)
  render/thumbnails.ts      offscreen snapshot cache for 2D screens
  render/ToyTurntable.tsx   R3F preview for collection/celebration
  components/ClawCanvas.tsx ClawHud.tsx ClawControls.tsx MachineMenu.tsx PrizeCelebration.tsx
             LevelClearCard.tsx PauseOverlay.tsx HintArrow.tsx SaveStatusChip.tsx
  screens/ArcadeSelect.tsx ToyCollection.tsx AvatarCollection.tsx ClawProgress.tsx MysteryMachine.tsx
  ClawGame.tsx  fx.ts  api.ts  hooks.ts  outbox.ts  useClawHud.ts
src/app/play/claw/page.tsx   src/app/claw/{page,collection,avatars,progress}/page.tsx
scripts/export-claw-content.ts

API (gretas-game-api, branch feat/claw):

src/GretasGame.Api/Claw/ClawEndpoints.cs ClawRepository.cs ClawModels.cs ClawRules.cs ClawContent.cs claw-content.json (embedded)
src/GretasGame.Migrations/M202610240001_AddClawArcade.cs
tests/GretasGame.Api.Tests/ClawRulesTests.cs  Integration/ClawEndpointsTests.cs

Data models (core)

type Rarity = "common" | "uncommon" | "rare" | "legendary";
interface PrizeDef { id: string; name: string; description: string; category: string; rarity: Rarity;
  points: number; weight: number; size: number; gripDifficulty: number; unlockLevel: number;
  model: ToyModelId; palette: string[]; asset?: { glb: string } }
interface LevelDef { level: number; world: WorldId; goal: number; toyCount: number; pool: string[];
  difficulty: DifficultyVars; depthControl: boolean; timeChallenge?: number }
interface DifficultyVars { clawSpeed: number; gripStrength: number; alignTolerance: number; slipChance: number; crowding: number }
interface AvatarDef { id: string; name: string; rarity: Rarity; earnedBy: string;
  rule: { kind: "firstGrab" } | { kind: "prizesCollected"; count: number } | { kind: "uniquePrizes"; count: number }
      | { kind: "levelReached"; level: number } | { kind: "worldMystery"; world: WorldId } }
interface ClawProfile { currentLevel: number; selectedAvatar: string | null; points: number; totalGrabs: number; successfulGrabs: number;
  prizes: { prizeId: string; count: number; firstCollectedAt: string; favorite: boolean }[];
  avatars: { avatarId: string; unlockedAt: string }[]; levels: { level: number; stars: number; completedAt: string }[] }

Postgres (one migration): claw_profiles(player_id pk→players, current_level, selected_avatar, points, total_grabs, successful_grabs, updated_at), claw_prizes(player_id, prize_id, count, first/last_collected_at, favorite, pk(player_id, prize_id)), claw_avatars(player_id, avatar_id, unlocked_at), claw_attempts(id, player_id, level, status, started_at, completed_at, grabs, successes, stars, duration_seconds), claw_grabs(id, attempt_id, client_seq, prize_id, succeeded, recorded_at, unique(attempt_id, client_seq)). scores / game_sessions untouched — no public leaderboard for this game.

API endpoints





GET /api/claw/players/{nickname}/profile — full profile (empty profile for unknown players).



POST /api/claw/players/{nickname}/attempts { character, color, level } — PlayerSql.UpsertAsync, level must be ≤ current_level, returns { attemptId, startedAt }.



POST /api/claw/attempts/{id}/grabs { nickname, seq, prizeId, succeeded, elapsedSeconds } — ownership check (ScoreRules.NicknameKey), idempotent on seq, plausibility (prize known, unlockLevel ≤ level, cadence ≥ seq × minGrabCycleSeconds of server elapsed), awards prize, evaluates milestones, returns { count, points, newAvatars }.



POST /api/claw/attempts/{id}/complete { nickname, durationSeconds } — stars, advances current_level when goal met, level milestones, idempotent replay.



PUT /api/claw/players/{nickname}/avatar { avatarId } (must be unlocked) and PUT .../prizes/{prizeId}/favorite.



Rate limit: a claw fixed-window policy (60/min) alongside the existing game-sessions policy in GameSessionEndpoints.AddGameSessionRateLimiting.

Integration with existing systems





features/player/types.ts: add "claw" to GameMode + labels; store.ts migration v8 backfills roundsPlayed.claw / stars.claw (tested like earlier versions in store.test.ts). Completed levels call finishRound then markSubmitted immediately (Frogger's offline path) so "My runs" and 3 new claw achievements work without ever hitting POST /api/scores.



features/adventure/AdventureHub.tsx: new card → /claw; the player pill shows the selected claw avatar (new AvatarBadge, falls back to PlayerAvatar). Leaderboards keep initials (server score rows have no avatar).



Sounds: new SoundIds in lib/fx/audio.ts (motor, jawClose, prizeLift, prizeDrop, chute, rarePrize) synthesised like the rest; fx gains matching helpers. Music: useRoundMusic(playing) holds the menu bed like Frogger.



Settings: claw menu panel = SettingsToggles + a reduced-motion toggle (store already has reducedMotion).

Implementation phases

Phase 1 — Playable prototype (client only): config.ts, engine/* (claw, pile, grab, ClawEngine, input, types) with tests; render/ClawRenderer + cabinet/claw/chute meshes + 6 toy builders (teddy, duck, ball, car, slime jar, dino); ClawCanvas, ClawControls, minimal HUD, ClawGame.tsx, /play/claw; fx.ts + new sounds. Acceptance: move the claw, grab a toy, see it drop in the chute with a celebration popup.

Phase 2 — Rewards, progression, persistence: content/prizes|levels|avatars (first 10 levels, ~20 prizes, first 4 avatars), difficulty.ts + adaptive assist, rewards.ts; API migration + Claw/* + tests; api.ts, hooks.ts, outbox.ts, SaveStatusChip; GameMode + store v8; PrizeCelebration, LevelClearCard, MachineMenu with level picker. Acceptance: complete levels, collect toys, unlock avatars, resume after restart on another browser with the same nickname.

Phase 3 — Visual polish and collection screens: marquee lights, glass, world palette, toy wobble/swing/slip animations, confetti + particles, tap-a-toy, ToyCollection (shelf grid, thumbnails, rarity, counts, completion %, favorite, turntable preview), AvatarCollection (silhouettes, next-up preview, select), ClawProgress, hub card + avatar badge, phone layout pass.

Phase 4 — Expanded arcade: 5 worlds / 50 levels in content/worlds.ts + levels.ts, remaining toy builders (45+ prizes incl. rare/legendary), depth control from world 3, MysteryMachine (one legendary prize on a pedestal; the claw auto-sweeps and GRAB stops it — alignment, not odds; unlocks the world avatar), ArcadeSelect world map, claw achievements.

Phase 5 — Quality pass: remaining tests (levels solvable, content integrity, outbox), DPR/shadow budgets for phones, keyboard/touch/mouse verification, a11y (labels, 56px+ targets, reduced motion, no reading required to play), error/offline states, balancing, README sections in both repos documenting decisions.

Testing





Vitest (src/**/*.test.ts, node): grab.test (alignment/size/weight/grip outcomes, low levels favour success, seeded determinism), pile.test (no overlaps, toys inside bin, stable resettle), difficulty.test (monotone 1–50 curve, no spikes, assist bump/reset), rewards.test (points, stars, milestones, duplicate prizes count once for uniques), ClawEngine.test (full cycle, miss never completes a level, pause/resume, goal gating), levels.test (every level has ≥ goal grabbable prizes and one easy prize), content.test (unique ids, exported JSON in sync), outbox.test, store.test v8 migration.



xUnit: ClawRulesTests (plausibility, milestones, stars), Integration/ClawEndpointsTests on the existing PostgresFixture (empty profile → attempt → grabs → complete → prize + avatar visible; idempotent replay; forbidden nickname; locked level; avatar select requires unlock).



Manual: desktop keyboard, iPad touch, phone portrait; 60 FPS target with DPR cap.

Risks and mitigations





Mobile GPU cost (glass, lights, shadows): translucent panes instead of transmission, one shadow light, DPR ≤ 2, instanced marquee bulbs, perf check in Phase 3.



Procedural art falling short of the reference images: budgeted in Phase 3; asset.glb slot allows CC0 model drop-ins without engine changes.



Content drift between web and API: single exported JSON embedded in the API, validated at startup and by tests.



Nickname-only identity: accepted; server only rejects impossible results. Documented in the API README like Frogger's known limitations.



API push to main auto-deploys: all API work on feat/claw; I will warn before any push to main and never dispatch a deploy.



Store migration v8 touching every player: covered by the existing migration test style.

Estimated complexity





Phase 1: Medium–Large (engine + renderer core, ~2.5k LOC). Phase 2: Large (API + persistence + progression). Phase 3: Large (art and screens). Phase 4: Medium–Large (content volume, mystery machine). Phase 5: Medium.

Assumptions (documented, changeable in config)





Simple left/right controls by default; depth control from level 21. No timers; optional time challenge only as world-5 bonus, off by default.



Level goal: 1 prize (L1–3), 2 (L4–10), 3 (L11–30), 4 (L31–50). Points: common 10, uncommon 25, rare 60, legendary 150. Stars: 3 if goal met within goal+1 grabs, 2 within goal+3, else 1.



Avatars appear on the hub pill and all claw screens; leaderboards keep initial badges.



Mystery Prize Machine is a timing/alignment challenge, one per world, unlocking a legendary prize and that world's avatar.



Documentation goes into README sections in both repos (existing convention), not new doc files.

