# Shelby's Scoops — architecture

Full write-up: [docs/shelbys-scoops-plan.md](../../../../docs/shelbys-scoops-plan.md). This file is the spec copy the feature log points at.

## Fit

Next.js 16 app, nickname identity, MUI, Zustand, Vitest. Scoops is a feature folder and a `/play/scoops` route. It is not a `GameMode` and does not post to `/api/scores`.

Ingredient catalogs live in `src/features/scoops/game-data/`. Screens render from recipe data via `IceCreamPreview`. Persistence goes through `ScoopsRepository`. The shipping store is a normalized JSON document at `.data/scoops-db.json`, served by `/api/scoops/*`. Those routes are a static `scoops` segment, so they are not forwarded to the .NET API.

Drafts live in `localStorage` per scoops user id. Sound and reduced motion use `useSettingsStore`.

## Tables inside the document

`users`, `profiles`, `recipes`, `recipeFlavors`, `recipeToppings`, `recipeSauces`, `recipeExtras`, `favorites`, `achievements`, `unlocks`, `makes`, `discoveries`, `events`.

Every recipe has `ownerUserId`. Catalog entities (flavors, cones, toppings, sauces, extras) are code, not rows, so seasonal ingredients can be added without a migration.

## Client

`ScoopsProvider` loads `GET /api/scoops/me` and the community list. The maker keeps `CurrentCreation` plus an undo stack. Save, edit, delete, favorite, make, and clone go through the client and patch the provider from the response.

## Later, without a rewrite

A Dapper repository in `gretas-game-api` can take the same handler contract. Coin spending, orders, and seasons plug into `game-data` and `ScoopsRepository` rather than into the picture component.
