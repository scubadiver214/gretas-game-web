# Greta's Game for fun - web

Mobile-first browser game built with Next.js 16 (App Router), React 19, Material UI, TanStack Query/Table, zustand and React Three Fiber.

Players pick a nickname, a character (Max or Greta) and an outfit colour, then choose an adventure:

- **Pizza Kitchen** - 3-5 orders per round. Tap the right toppings (+10, wrong -5), then bake: take the pizza out in the green zone for a perfect bake (+25), yellow +10, burnt 0.
- **Bike Delivery** - 60-second lane runner. Tap the arrows (or use ←/→ keys) to change lanes, ride through glowing mailboxes (+20), dodge cones and puddles (-10). Every 3 clean deliveries in a row earns a combo bonus.
- **Word Quest** - guess five-letter words with green/yellow letter hints.
- **Frogger Adventure** - arcade Frogger in low-poly 3D: hop across five lanes of traffic and a river of logs and diving turtles to fill five lily-pad bays, then the next level speeds up. See [Frogger Adventure](#frogger-adventure) below.

Scores are submitted to the API and shown on the global scoreboard.

### Progression and extras

- **Difficulty levels** (1 Rookie → 5 Legend) per mode, unlocked every 2 finished rounds on the device (`features/player/progress.ts`). Kitchen gains orders, toppings and a faster oven; delivery gets a faster bike, denser spawns and more obstacles (`kitchenDifficultyFor`, `deliveryDifficultyFor`).
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
| `pnpm test`      | Vitest unit tests (game rules, Frogger engine, store migration) |

## Project layout

```
src/
  app/                    App Router pages (/, /character, /adventure, /play/kitchen, /play/delivery,
                          /play/wordle, /play/frogger, /results, /scoreboard, /my-scores) and the /api/[...path] proxy
  components/             PageContainer, GameShell, HUD (+ SettingsToggles), TouchControls, RequirePlayer,
                          PlayerAvatar, three/FitCamera
  features/
    player/               zustand store (nickname, character, colour, history, rounds played), level rules,
                          useRoundSetup (level / daily seed from the URL)
    settings/             sound + haptics toggles (persisted)
    characters/           Character (glTF with primitive fallback), GltfCharacter, PrimitiveCharacter,
                          turntable preview, character + colour select
    kitchen/              Pizza Kitchen: scene, game store, pure scoring + difficulty rules (+ tests)
    delivery/             Bike Delivery: scene, game store, pure scoring + difficulty rules (+ tests)
    wordle/               Word Quest
    frogger/              Frogger Adventure (see below)
    scores/               API client, TanStack Query hooks, results screen, scoreboard, My scores
    adventure/            Adventure hub (levels, daily challenge, settings)
  lib/fx/                 Web Audio sound synth, haptics, confetti
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
                            CanvasTexture textures, animated water, pooled particles
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

## How the API is reached

The browser only ever talks to the Next.js origin. `src/app/api/[...path]/route.ts` forwards `/api/*` requests at runtime to `process.env.API_URL`, so the same image works under Aspire (`API_URL` injected from the API endpoint) and docker-compose (`API_URL=http://api:8080`). No CORS configuration is needed.

## Docker

The `Dockerfile` is a multi-stage build that produces the Next.js standalone server on `node:22-alpine`. It is normally built by `docker compose up --build` from the API repo, but can be built directly:

```sh
docker build -t gretas-game-web .
docker run --rm -p 3000:3000 -e API_URL=http://host.docker.internal:5080 gretas-game-web
```

`.github/workflows/publish-image.yml` lints, typechecks, tests and pushes `ghcr.io/<owner>/gretas-game-web` on every push to `main`. Production deployment (Caddy + TLS on a VPS, or Aspire → Azure Container Apps) is documented in the API repo under `deploy/`.
