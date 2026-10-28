# Shelby's Scoops — phases

## Phase 1 — Plan (done 2026-10-27)

Goal: inspect the app and write the plan before the maker exists.

- [x] Repository inspection recorded
- [x] Plan written in this folder (`plan.md`)

### What exists

Next.js 16 app, nickname identity, MUI, Zustand, a .NET score API behind `/api/*`. Scoops is not a `GameMode`.

### How it was verified

Read the web app, the player store, the API proxy, and `gretas-game-api` players/scores/claw layout before writing code.

## Phase 2 — Foundation (done 2026-10-27)

- [x] Game data for flavors, containers, toppings, sauces, extras, secrets, badges
- [x] Normalized store and repository
- [x] Route handler and kid-facing errors
- [x] Hub card to `/play/scoops`

## Phase 3 — Ice cream maker (done 2026-10-27)

- [x] Cone or cup, 15 flavors, mix styles
- [x] Toppings, sauces, extras
- [x] Animated picture, undo, start over

## Phase 4 — Recipes (done 2026-10-27)

- [x] Create, update, delete, clone, public flag
- [x] Draft autosave and welcome back

## Phase 5 — My Scoop Book (done 2026-10-27)

- [x] Cards with picture, flavors, favorite, make again, edit, delete

## Phase 6 — Community (done 2026-10-27)

- [x] Filters, Make this, inspired-by line, favorite

## Phase 7 — Progression (done 2026-10-27)

- [x] XP, levels, unlocks, secrets, badges, daily event

## Phase 8 — Polish (done 2026-10-27)

- [x] Sounds, confetti, tutorial, reduced motion, keyboard undo, phone layout, error boundary

### What exists

`src/features/scoops/`, route `/play/scoops`, API `/api/scoops/*` (Next, not the .NET proxy). Shop file `.data/scoops-db.json`. Hub card on `/adventure`. Demo nickname Shelby is seeded.

### How it was verified

- `pnpm exec tsc --noEmit` clean.
- `pnpm exec eslint` on the scoops files, the scoops routes, and `AdventureHub.tsx` clean.
- `pnpm exec vitest run src/features/scoops`: 8 files, 28 tests (creation, secrets, XP, moderation, events, repository ownership, file reload, handler).
- Browser at `http://localhost:3000/play/scoops` as Greta: tutorial offer, waffle cone, vanilla + chocolate + strawberry (auto triple), rainbow sprinkles, hot fudge, cherry, whipped cream. Finish saved "Berry Tower" for +75 XP and +38 coins, level 2, new unlocks, First Scoop and Double Trouble. Reveal card showed the cone. My Scoop Book listed Berry Tower. Welcome back appeared after a refresh with a draft. Community showed Shelby's Super Moon, Chocolate Explosion, Rainbow Unicorn, Cookie Monster, Berry Blast, and Wormy Moon, with the seven filters. `GET /api/scoops/me` as Greta returned level 2 and Berry Tower. Hub card "Shelby's Scoops!" is on `/adventure`. Phone-width layout (390px) keeps the scoop, mix styles, and flavor cards on screen without the action bar covering the shelves.
- Hydration warnings in that browser session are `data-cursor-ref` attributes injected on `BootSplash` by the browser tool, not a scoops mismatch.

## Phase 8b — Hub tile matches the other games (done 2026-10-27)

Goal: the Scoops card on `/adventure` uses the same tile as Bea's Claw.

- [x] Full-bleed 3:4 portrait at `public/characters/scoops-sister-neon.jpg`
- [x] Shared card chrome, `N.scoops`, status chip `Shop · New!`
- [x] `art` required on every hub tile
- [x] Cursor rule `.cursor/rules/hub-tiles.mdc`

### How it was verified

Visual check on `/adventure` next to the Claw card: portrait fills the art well, accent spine and status chip match the other tiles. `pnpm exec tsc --noEmit` and eslint on `AdventureHub.tsx`.

## Phase 8c — Shelby's name in the shop background (done 2026-10-27)

Goal: brand the playable shop with Shelby's name without covering the maker.

- [x] Glowing "Shelby's Scoops" wordmarks and scoop icons, fixed behind the UI
- [x] Clicks pass through; screen readers skip the wallpaper
- [x] Glow pauses when reduced motion is on

### How it was verified

In the browser on `/play/scoops`: the names glow in the sky and along the floor, the Make Ice Cream button still receives the click, and the scoop stage stays clear.

## Phase 8d — Avatar prizes (done 2026-10-27)

Goal: saving a scoop can win an avatar, with easy first prizes and harder ones for special cones.

- [x] 19 prize faces plus 2 free starters
- [x] Awarded when a creation is saved, shown before the finished scoop, and worn immediately
- [x] Locked faces on the profile say how to win them

### How it was verified

`pnpm exec vitest run src/features/scoops` covers first-save prizes, cherry/tower/fancy/waffle prizes, the rare faces, and Shelby's Twin on the secret favorite. In the browser, saving a cone shows the avatar prize before the finished scoop.

## Phase 9 — Living scoops (done 2026-10-28)

Goal: the ice cream moves, melts, and gets messy while a saved recipe stays a list of ingredients.

- [x] Scoops drop, squash, settle, and nudge the ones underneath
- [x] Toppings fall on, then slide or drop off as the load grows
- [x] A clock from the first scoop drives melt, drips, a puddle, and flowing syrup
- [x] Flavor looks and melt rates, short notes, and a Fresh → Super Melty meter
- [x] Start over and a new dessert reset the clock. Saved recipes do not store melt
- [x] Calm motion and the OS reduced-motion setting skip the animation loop

### What exists

`src/features/scoops/animation/` is the clock, the load bands, and the frame writer. `IceCreamPreview` still draws the SVG. The maker stage is the only place that runs the loop. Recipe cards and the saved reveal stay still. Tuning lives in `animation/motionConfig.ts`.

### How it was verified

- `pnpm exec vitest run src/features/scoops`: 10 files, 45 tests. The new file checks the 30/60/120 second stages, a capped melt curve, landing and bounce, overload versus a light sprinkle, drips, strawberry syrup moving faster than hot fudge, the kid messages, all 15 flavors, and that `CurrentCreation` has no melt field.
- `pnpm exec tsc --noEmit` and eslint on the animation folder, `IceCreamPreview.tsx`, and `Builder.tsx` are clean.
- In the browser at `/play/scoops`: a waffle cone with vanilla, chocolate, and strawberry. The new scoop started about 51px up and stretched, then settled, and the lower scoops shifted down when it landed. The meter moved from Fresh to Melting (drips and a puddle) and then Super Melty. Six toppings and three sauces showed "That's one messy masterpiece!", pieces fell past the cone, and hot fudge, caramel, and strawberry syrup moved at different speeds (about 5, 9, and 15 pixels in the same span). Average frame time on that stage was under 5ms. Start over cleared the scoops and the next vanilla began at Fresh with no puddle. Community cards still draw the saved cone with no drip nodes and no melt stage.



