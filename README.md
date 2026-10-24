# Greta's Game for fun - web

Mobile-first browser game built with Next.js 16 (App Router), React 19, Material UI, TanStack Query/Table, zustand and React Three Fiber.

Players pick a nickname, a character (Max or Greta) and an outfit colour, then choose an adventure:

- **Pizza Kitchen: Lunch Rush** - an Overcooked-style 3D kitchen. Run between stations to roll dough, sauce, grate, chop, bake, slice and serve pizzas before customers lose patience. Solo (swap between two chefs) or couch co-op on one keyboard; coins buy new ingredients and kitchen upgrades. See [Lunch Rush](#lunch-rush-pizza-kitchen) below.
- **Bike Delivery** - 60-second lane runner. Tap the arrows (or use ←/→ keys) to change lanes, ride through glowing mailboxes (+20), dodge cones and puddles (-10). Every 3 clean deliveries in a row earns a combo bonus.
- **Word Quest** - guess five-letter words with green/yellow letter hints.
- **Frogger Adventure** - arcade Frogger in low-poly 3D: hop across five lanes of traffic and a river of logs and diving turtles to fill five lily-pad bays, then the next level speeds up. See [Frogger Adventure](#frogger-adventure) below.
- **Bea's Claw-some Adventure** - a 3D claw machine for ages 4-10: line the claw up, press GRAB, and win toys for a persistent collection. 50 levels across five arcade worlds, mystery machines with legendary prizes, and collectible avatars. No timers, no leaderboard, no purchases. See [Bea's Claw-some Adventure](#beas-claw-some-adventure) below.

Scores are submitted to the API and shown on the global scoreboard (the claw game keeps its progress private on the player's profile instead).

### Progression and extras

- **Difficulty levels** (1 Rookie → 5 Legend) per mode, unlocked every 2 finished rounds on the device (`features/player/progress.ts`). The kitchen gets longer shifts, a bigger menu, more tickets at once, less patient customers, rush orders and crust swaps; delivery gets a faster bike, denser spawns and more obstacles (`kitchenDifficultyFor`, `deliveryDifficultyFor`).
- **Daily challenge** - `/play/<mode>?daily=1` runs a level-3 round seeded from the UTC date (`lib/rng.ts`), so everyone gets the same orders / street. Scores post with `challengeDate` and appear on the scoreboard's "Today's challenge" board (best per player).
- **Sound, haptics, confetti** - Web Audio synthesised effects and `navigator.vibrate` (`lib/fx`), toggles on the hub and intro cards, confetti + fanfare on the results screen (bigger for a personal best).
- **Animated glTF characters** - CC0 Quaternius models in `public/models` (see `LICENSE.md` there) loaded with drei `useGLTF`/`useAnimations`; the primitive rig shows instantly as a fallback and stays if the model fails to load. The player's colour recolours the outfit.
- **Avatars and My scores** - the outfit colour doubles as the avatar colour on leaderboards; `/my-scores` lists every round played on this device (sortable TanStack Table) with rank and personal-best markers.

## Requirements

- Node 22+ and [pnpm](https://pnpm.io)
- The API from the sibling repo `../gretas-game-api` (the web app proxies `/api/*` to it)

## Run

The normal dev loop is orchestrated by Aspire from the API repo:

```sh
cd ../gretas-game-api
aspire run
```

That starts Postgres, the migrations, the API and this Next.js app with `API_URL` wired up, and prints the web URL in the dashboard.

To run this app on its own against an API that is already listening:

```sh
pnpm install
API_URL=http://localhost:5080 pnpm dev   # API_URL defaults to http://localhost:5080
```

## Scripts

| Script           | What it does                        |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Next.js dev server with HMR         |
| `pnpm build`     | Production build (`output: standalone`) |
| `pnpm start`     | Serve the production build          |
| `pnpm lint`      | ESLint                              |
| `pnpm typecheck` | `tsc --noEmit`                      |
| `pnpm test`      | Vitest unit tests (game rules, Frogger and claw engines, store migration) |
| `pnpm claw:export-content` | Writes `features/claw/content/claw-content.json` (and the API's embedded copy when `../gretas-game-api` exists) from the TypeScript prize/level/avatar content |

## Project layout

```
src/
  app/                    App Router pages (/, /character, /adventure, /play/kitchen, /play/delivery,
                          /play/wordle, /play/frogger, /play/claw, /claw (+ /collection, /avatars, /progress),
                          /results, /scoreboard, /my-scores) and the /api/[...path] proxy
  components/             PageContainer, GameShell, HUD (+ SettingsToggles), TouchControls, RequirePlayer,
                          PlayerAvatar, three/FitCamera, three/kit (shared low-poly mesh kit), three/particles
  features/
    player/               zustand store (nickname, character, colour, history, rounds played), level rules,
                          useRoundSetup (level / daily seed from the URL)
    settings/             sound + haptics toggles (persisted)
    characters/           Character (glTF with primitive fallback), GltfCharacter, PrimitiveCharacter,
                          turntable preview, character + colour select
    kitchen/              Pizza Kitchen: Lunch Rush (see below)
    delivery/             Bike Delivery: scene, game store, pure scoring + difficulty rules (+ tests)
    wordle/               Word Quest
    frogger/              Frogger Adventure (see below)
    claw/                 Bea's Claw-some Adventure (see below)
    scores/               API client, TanStack Query hooks, results screen, scoreboard, My scores
    adventure/            Adventure hub (levels, daily challenge, settings)
  lib/fx/                 Web Audio sound synth, haptics, confetti
  lib/game/               shared game-engine helpers (event emitter)
  lib/rng.ts              seeded PRNG + daily key
  theme.ts                Material UI theme
public/models/            CC0 character models (boy.glb, girl.glb) + LICENSE.md
```

## Frogger Adventure

`/play/frogger` is a self-contained feature in `src/features/frogger/`, built so more arcade games can follow the same shape:

```
config.ts, levelConfig.ts   board size, timings, scoring, lives, level definitions (all tunable here)
engine/                     pure TypeScript game: GameEngine (fixed 120 Hz steps, state machine, events),
                            frog, lanes, collision, levels, scoring, input mapping - no React, no three.js
render/                     imperative three.js view: ThreeRenderer, procedural low-poly meshes and
                            CanvasTexture textures, animated water (pooled particles live in components/three)
components/                 FroggerCanvas (owns the WebGL canvas + frame loop), HUD, D-pad, main menu,
                            pause and game-over overlays, mini leaderboard
FroggerGame.tsx             menu -> countdown -> play -> game over, plus the API session lifecycle
useFroggerHud.ts            zustand HUD snapshot; the engine pushes only when a shown value changes
audio.ts                    engine events -> lib/fx sounds, haptics, popups, confetti
api.ts, hooks.ts            game-session API calls and TanStack Query hooks
```

- **Rules.** 13 rows (home hedge, 5 river lanes, median, 5 road lanes, start) by 15 columns. Positions of everything in a lane are a pure function of time, so collisions are identical at any frame rate and a seed replays exactly (the daily challenge uses `daily:<date>`). Scoring: 10 per new row reached on a trip, 50 per home plus 10 per second left on the frog's timer, 1,000 per level; 3 lives, +1 every 10,000 points (max 5). Levels 1-3 are hand-tuned; 4+ scale speed, timer, log length and turtle dives with caps, and a unit test checks every level up to 20 still has a way across.
- **Controls.** Arrows / WASD hop one tile (held keys don't repeat, one quick extra press is buffered); Space or Esc pauses; the tab or window losing focus pauses. Touch devices get an on-screen D-pad, and swipes or taps on the board also hop.
- **Rendering.** React renders only menus and the HUD; the three.js scene is drawn from engine state each animation frame, with no assets downloaded (all meshes and textures are procedural). Colours are tuned to the classic toy-box look; tall phone screens get a steeper camera. "Reduced motion" turns off camera shake, flashes, fireworks and confetti.
- **Saving.** Pressing Play starts a server session (`POST /api/games/frogger/sessions`) while the 3-2-1 countdown runs; game over completes it, and the result also lands in the device's My runs, stars and trophies. If the API is unreachable the game stays playable and says the score won't be saved; a failed save shows Retry, which is safe because the API treats an identical completion as the same result.

## Lunch Rush (Pizza Kitchen)

`/play/kitchen` is an Overcooked-style pizzeria in `src/features/kitchen/`, built like Frogger: a pure engine, a renderer that only reads it, and a thin React shell.

```
config.ts                   every tunable number (speeds, work/bake times, scoring, star shares)
content/                    ingredients, recipes, the tile-map kitchen layout, shop catalog + upgrade multipliers
engine/                     pure TypeScript: KitchenEngine (fixed 60 Hz steps, command queue, events),
                            pizza rules + order matching, orders/menu, difficulty + lunch-rush curve,
                            scoring/combo/stars, movement + collisions (+ tests)
render/                     React Three Fiber scene: stations, pizzas/ingredients, chefs (the player's
                            glTF character + their buddy), bake meter, particles, aspect-aware camera
components/                 ticket rail, shift clock/score/combo, touch stick + buttons, menu, shop, pause
input/keyboard.ts           key bindings -> per-player stick + buttons (solo and two-player)
fx.ts                       engine events -> sounds, haptics and floating popups
progress.ts, shopRules.ts   coins, unlocked ingredients and upgrades (saved on the device)
KitchenGame.tsx             menu -> countdown -> shift -> closing card -> /results
```

- **Loop.** Grab dough from the pantry, roll it at a dough table into a base, add sauce, grated cheese and chopped toppings (in any order, on any counter), bake it, slice it and hand it through the pass. Ovens run on their own: take the pizza out in the green for a perfect crust; leave it and it burns.
- **Feedback.** Tickets tick off what's on the pizza you're holding or facing and glow when it's on track; anything no ticket wants pulses red on the pizza, shows as a red chip on the closest ticket, and pops "No order wants 🍍!". Rejections explain themselves ("Chop the 🍄 first!", "Slice it first!").
- **Scoring.** A correct pizza pays its ingredients' value, +15 for a perfect bake, a tip that shrinks as the customer waits, x1.5 for rush orders, all multiplied by the streak combo (x1 up to x3). The wrong pizza earns a quarter, no tip, and breaks the combo; a customer walking out costs 15. Star targets come from a par score for the level and today's menu.
- **Progression.** Levels raise shift length, menu size, tickets on the rail, customer impatience, rush orders and crust swaps; within a shift orders speed up for the lunch rush around 12:40. Coins (a tenth of the score plus 15 per star) buy ingredients, which add new recipes, and upgrades (sneakers, sharp knife, turbo ovens, comfy chairs, tip jar, extra oven). The daily challenge uses the full pantry and no upgrades so it's fair.
- **Players.** Solo controls two chefs and swaps between them (Q / Tab, or the Swap button). Co-op puts two players on one keyboard (WASD + Space/E/Shift and arrows + Enter / / .). Touch devices get a stick and Grab / Chop / Dash / Swap buttons and play in landscape: starting a shift goes fullscreen and locks landscape where the browser allows it (Android), and holding the device upright shows a "turn your device" screen and pauses the shift (the only option on iOS) (`landscape.ts`, `RotateOverlay`).
- **Towards online multiplayer.** Everything a shift does goes through `engine.command({ type, chef, ... })`, the state is plain JSON, and the simulation is deterministic for a seed, so a later networked mode can relay the same commands (host- or server-authoritative) and stream snapshots without changing the rules. Shop progress is device-local today; it would move to the API with accounts.

## Bea's Claw-some Adventure

`/play/claw` is a 3D claw machine in `src/features/claw/`, built on the same shape as Frogger (pure engine, imperative three.js renderer, thin React shell) plus a server-side profile for the toy collection.

```
config.ts                   cabinet geometry, claw speeds and timings, grab-odds weights, assist thresholds, points, stars rule
content/prizes.ts           the prize catalog (112 toys: id, rarity, points, size/weight/grip, unlock level, model + palette, finish)
content/worlds.ts           five worlds (level range, palette, prize pool, mystery prize, avatar)
content/levels.ts           levelDef(1..50): goal, toy count, pool and difficulty from the curve; mysterySetup(world)
content/avatars.ts          13 avatars and the milestone rules that unlock them; avatarArt.tsx draws them as inline SVG
content/export.ts           the slice the API embeds; claw-content.json is the committed export (content.test.ts guards drift)
engine/                     pure TypeScript, fixed 120 Hz steps: ClawEngine (state machine, events, onHud, summary),
                            claw (rails, cable, pendulum swing), pile (seeded layout, sphere stacking, settle),
                            grab (grip resolution, slip point, hint), difficulty (level 1-50 curve + adaptive assist),
                            rewards (points, stars, milestone evaluation), input (held keys) - no React, no three.js
render/                     ClawRenderer (cabinet, marquee, gantry, claw rig, toys, chute, particles, camera fit),
                            meshes/ (cabinet, claw), toys/ (45 procedural toy builders), textures, thumbnails (offscreen
                            stills for the collection), ToyTurntable (R3F preview)
components/                 canvas host, hold-to-move controls + GRAB, HUD chips, machine and mystery menus, prize
                            celebration, level-clear card, pause, save-status chip, avatar badge
screens/                    /claw arcade hub (worlds), toy collection, avatars, progress
ClawGame.tsx                menu -> play -> celebrate -> level clear, plus the attempt lifecycle with the API
api.ts, hooks.ts            claw endpoints, profile query (server first, device mirror as fallback), mutations
outbox.ts, mirror.ts        queued grab/complete writes that retry in order; last known profile kept on the device
fx.ts                       engine events -> sounds, haptics, popups, confetti
```

- **Loop.** Move the claw over a toy in 3D (left/right across the cabinet, up/down to the back and front, or tap a toy to glide to it), with a ring under the claw showing where it will land (green when a toy is under it), then press GRAB: the claw drops onto the pile, closes, lifts, carries the toy to the chute and drops it in. Win the level's goal (1-4 prizes) to clear it. There are no timers, lives or limits; a miss says "Great try!" and hands control straight back.
- **Grab odds are a pure, inspectable function** (`engine/grab.ts`): alignment dominates, then grip strength vs. the toy's weight and grip difficulty, oversize toys and crowding. Level 1 tops out at 98% when centred on a light toy; level 50 asks for precision and can slip during the carry. Nothing looks at what the player has already won. Every level uses the full 2D distance (`hasDepthControl` / `DEPTH_FROM_LEVEL` in `content/levels.ts`); the engine still supports simple left/right machines, which measure alignment on x only and keep the pile in a band under the rail.
- **Adaptive assist.** Two misses in a row widen the tolerance and strengthen the grip a notch (up to three notches), three highlight the easiest exposed toy with an arrow, four lift an easy toy to the top of the pile. Any success resets it. The player is never penalised for taking longer.
- **Mystery machines.** Clearing a world's last level opens its mystery machine: one legendary prize on a pedestal and a claw that sweeps on its own; GRAB stops it, and the outcome is exact (inside the window wins, outside misses - no dice). Winning unlocks the world's avatar.
- **Saving.** Pressing Play starts a server attempt (`POST /api/claw/players/{nickname}/attempts`). Every grab and the completion are queued in `outbox.ts` and sent in order; the server treats repeats as no-ops, so a flaky network never loses a toy and the queue drains again when the tab comes back online. If the API cannot be reached at the start, the level is still playable and the HUD says it will not be saved. The profile (current level, collection, avatars, cleared levels) is the server's; `mirror.ts` keeps the last copy on the device so the hub shows the avatar instantly and level gating still works offline.
- **Content is the source of truth.** Adding a toy is a new entry in `content/prizes.ts` (plus, optionally, a builder in `render/toys`); worlds, levels and avatar rules are data too. Run `pnpm claw:export-content` afterwards so the API's embedded copy matches; `content.test.ts` fails when they drift.
- **Rendering.** The cabinet, claw and all 112 toys are procedural low-poly meshes sharing one `MeshKit` (lifted from Frogger into `components/three/kit.ts`); no assets are downloaded. One shadow light, DPR capped at 2, smaller shadow maps on phones, and "Reduced motion" turns off wobble, bulb chasing, the sign's breathing glow, fireworks and confetti. The game's name hangs on the arcade's back wall as a cursive neon sign (`render/meshes/wallSign.ts`, Pacifico via `--font-script`): beside the cabinet on wide screens, above the marquee on tall ones, kept dim and never over the cabinet or HUD. The title itself is `GAME_TITLE` in `config.ts`. Each prize has an optional `asset.glb` slot for CC0 models later.
- **Decisions and tradeoffs.** three.js over Phaser so the cabinet is really 3D and reuses the repo's existing stack; rules-based grab resolution over a rigid-body library so odds are tunable, testable and honest; server-side profiles keyed by nickname (the repo's identity model) with the caveat that nicknames are not authenticated, so another device typing the same nickname shares the collection; the claw game has no leaderboard by design.

## How the API is reached

The browser only ever talks to the Next.js origin. `src/app/api/[...path]/route.ts` forwards `/api/*` requests at runtime to `process.env.API_URL`, so the same image works under Aspire (`API_URL` injected from the API endpoint) and docker-compose (`API_URL=http://api:8080`). No CORS configuration is needed.

## Docker

The `Dockerfile` is a multi-stage build that produces the Next.js standalone server on `node:22-alpine`. It is normally built by `docker compose up --build` from the API repo, but can be built directly:

```sh
docker build -t gretas-game-web .
docker run --rm -p 3000:3000 -e API_URL=http://host.docker.internal:5080 gretas-game-web
```

`.github/workflows/publish-image.yml` lints, typechecks, tests and pushes `ghcr.io/<owner>/gretas-game-web` on every push to `main`. Production deployment (Caddy + TLS on a VPS, or Aspire → Azure Container Apps) is documented in the API repo under `deploy/`.
