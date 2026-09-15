# Greta's Game for fun - web

Mobile-first browser game built with Next.js 16 (App Router), React 19, Material UI, TanStack Query/Table, zustand and React Three Fiber.

Players pick a nickname and a character (Max or Greta), then choose an adventure:

- **Pizza Kitchen** - 3 orders per round. Tap the right toppings (+10, wrong -5), then bake: take the pizza out in the green zone for a perfect bake (+25), yellow +10, burnt 0.
- **Bike Delivery** - 60-second lane runner. Tap the arrows (or use ←/→ keys) to change lanes, ride through glowing mailboxes (+20), dodge cones and puddles (-10). Every 3 clean deliveries in a row earns a combo bonus.

Scores are submitted to the API and shown on the global scoreboard.

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
| `pnpm test`      | Vitest unit tests for game scoring  |

## Project layout

```
src/
  app/                    App Router pages (/, /character, /adventure, /play/kitchen,
                          /play/delivery, /results, /scoreboard) and the /api/[...path] proxy
  components/             PageContainer, GameShell, HUD, TouchControls, RequirePlayer, three/FitCamera
  features/
    player/               zustand store (nickname, character, last result) persisted to localStorage
    characters/           primitive-built 3D characters + turntable preview + character select
    kitchen/              Pizza Kitchen: scene, game store, pure scoring rules (+ tests)
    delivery/             Bike Delivery: scene, game store, pure scoring rules (+ tests)
    scores/               API client, TanStack Query hooks, results screen, TanStack Table scoreboard
    adventure/            Adventure hub
  theme.ts                Material UI theme
```

## How the API is reached

The browser only ever talks to the Next.js origin. `src/app/api/[...path]/route.ts` forwards `/api/*` requests at runtime to `process.env.API_URL`, so the same image works under Aspire (`API_URL` injected from the API endpoint) and docker-compose (`API_URL=http://api:8080`). No CORS configuration is needed.

## Docker

The `Dockerfile` is a multi-stage build that produces the Next.js standalone server on `node:22-alpine`. It is normally built by `docker compose up --build` from the API repo, but can be built directly:

```sh
docker build -t gretas-game-web .
docker run --rm -p 3000:3000 -e API_URL=http://host.docker.internal:5080 gretas-game-web
```
