# Shelby's Scoops — implementation plan

Playable ice-cream shop for Greta's Games. Route: `/play/scoops`. Code: `src/features/scoops/`.

This is the only plan for the game. Phases, decisions, todos, and bugs are in this same folder.

The ice cream maker is the product. Cookbook, community, and progression hang off a finished scoop, not the other way around.

## What the repo already is

Inspected before any scoops code:

| Piece | What it is |
| --- | --- |
| Web | Next.js 16 App Router, React 19, MUI 9, Zustand, TanStack Query, Vitest, `canvas-confetti` |
| Styling | MUI plus the neon arcade tokens in `src/design/neon.ts`. Games also ship their own look (hunting does). |
| Identity | A nickname (2–16 letters) and a character, stored in `gretas-game:player`. No email, no password, no real name. |
| Sound | `useSettingsStore` (`soundOn`, `musicOn`, `reducedMotion`) and synthesised `fx` in `src/lib/fx`. |
| API | `gretas-game-api` is .NET + Postgres (Dapper, FluentMigrator). Players are nickname rows. Scores, claw, and frogger sessions live there. |
| Proxy | `src/app/api/[...path]/route.ts` forwards `/api/*` to `API_URL`. A static segment such as `/api/scoops` is more specific and stays on Next. |
| Games | `src/features/<game>`, page at `src/app/play/<game>/page.tsx`, card on the adventure hub. |

Scoops does **not** join `GameMode`. That union drives stars, daily challenges, and score posts. Scoops has its own XP, coins, and unlocks. Putting it on the scoreboard would require a player-store migration and a Postgres score rule for a game that is not a timed round.

## Architecture

```text
src/features/scoops/
  game-data/          flavors, containers, toppings, sauces, extras, secrets, achievements, avatars
  logic/              creation, undo, secrets, XP, moderation, events, sort scores
  data/               normalized document store + repository
  api/                HTTP handler and browser client
  components/         shop screens and the ice cream picture
  ScoopsGame.tsx      screen router
src/app/play/scoops/  page, loading, error
src/app/api/scoops/   route handler (not the .NET proxy)
```

Visual components never import the repository. They call the scoops client, which calls `/api/scoops`. The handler calls `ScoopsRepository`. Tests use an in-memory repository. The dev server uses a JSON file at `gretas-game-web/.data/scoops-db.json` (gitignored).

The file is a normalized database: users, profiles, recipes, recipe flavors/toppings/sauces/extras, favorites, achievements, unlocks, makes, discoveries, daily events. Catalog rows (the 15 flavors and the rest) stay in `game-data` so a new flavor is a data row, not a UI edit.

A later phase can move the same tables into Postgres behind `gretas-game-api` without changing the screen components. The handler's request and response shapes are that seam. It is intentionally not in the .NET API yet: the shop has to run with `next dev` alone, and scoops progress is not a score submission.

## Identity

The logged-in player is the nickname they already chose on the start screen. The scoops user id is that nickname, lower-cased. Recipes store `ownerUserId`. Another nickname on the same shop file cannot edit them.

Demo login: nickname **Shelby**. That account is seeded at level 12 with a full freezer and five public recipes (plus recipes from Berry, Coco, Noodle, and Pip). A button on the shop home switches the site nickname to Shelby.

There is no open chat, no private message, no location, and no link field on a recipe. Names go through a word filter. Community creators are the seeded nicknames or whatever nickname the child already uses for Greta's Games.

## Primary loop

1. Home → Make ice cream.
2. Tap a cone or cup, then flavors, toppings, sauces, and extras. Cards are big. Tap adds. Drag onto the scoop also adds.
3. The picture updates immediately (drop, drizzle, sprinkle rain, wobble when the stack is tall).
4. Make my scoop replays the build. Finish opens a short naming step, not a form.
5. Save writes the recipe for this player, grants XP and coins, checks secrets, unlocks, and badges.
6. The finished scoop is revealed. It shows up in My Scoop Book.
7. Make again loads it into the maker. Community → Make this loads someone else's ingredients, and saving creates a new recipe with "Inspired by …".

An unfinished scoop is written to `localStorage` (`gretas-game:scoops-draft:v1:<userId>`). Coming back shows Welcome back.

## Recipe model

```ts
interface IceCreamRecipe {
  id: string;
  ownerUserId: string;
  ownerName: string;
  name: string;
  description?: string;
  containerId: string;
  serve: "cone" | "cup";
  mix: "single" | "double" | "triple" | "swirl" | "layered" | "half" | "crazy";
  scoops: { flavorId: string }[];
  toppings: { toppingId: string }[];
  sauces: { sauceId: string }[];
  extras: { extraId: string }[];
  isPublic: boolean;
  inspiredBy?: { recipeId: string; name: string; owner: string };
  createdAt: string;
  updatedAt: string;
  stats: { timesMade: number; favorites: number };
  shelbyFavorite: boolean;
}
```

The picture component takes this shape (or the in-progress creation, which is the same ingredients without an id). Cards, the stage, and the reveal all use it.

## API

Header: `x-scoops-player: <nickname>`.

```text
GET    /api/scoops/me
POST   /api/scoops/me                 avatar, tutorial seen

GET    /api/scoops/flavors
GET    /api/scoops/toppings
GET    /api/scoops/sauces
GET    /api/scoops/extras
GET    /api/scoops/containers

GET    /api/scoops/recipes?scope=mine|community&sort=newest|popular|made|favorited|weird|colorful|shelby
POST   /api/scoops/recipes
GET    /api/scoops/recipes/:id
PUT    /api/scoops/recipes/:id
DELETE /api/scoops/recipes/:id
POST   /api/scoops/recipes/:id/favorite
POST   /api/scoops/recipes/:id/make
POST   /api/scoops/recipes/:id/clone

GET    /api/scoops/users/:id/recipes
GET    /api/scoops/users/:id/achievements
GET    /api/scoops/users/:id/unlocks
```

Failures return `{ message: "🍦 Oops! Shelby dropped that scoop. Let's try again!" }` (or a more specific kid sentence). The technical reason is logged on the server only. A player can only update or delete their own rows. Private recipes of other players read as not found.

## Progression

Eight flavors, the basic cones and cups, and most toppings are available at level 1 so the first sitting is already a game. The freezer opens further as XP grows:

| Level | Unlocks |
| --- | --- |
| 1 | Vanilla, chocolate, strawberry, fudge, cookies & cream, rocky road, cotton candy, salted caramel, basic cones and cups |
| 2 | Mint chocolate chip |
| 3 | Cookie dough, chocolate waffle cone |
| 4 | Blue Moon |
| 5 | Superman |
| 6 | Butter pecan, rainbow cone |
| 7 | Birthday cake, birthday cup |
| 8 | Mystery cup |
| 10 | Blueberry cheesecake |

XP for a new scoop starts at 25 and grows with each ingredient. Secret recipes add a bonus. Double Scoop Day doubles XP for every new scoop that day. Editing a saved recipe grants a little XP, not a full scoop, so saving cannot be farmed. Coins are banked for a future shop. They are not spent yet.

Secrets (the creation must contain every listed ingredient; extras do not block them):

- Super Moon — Blue Moon + Superman
- Campfire S'more — chocolate + marshmallows + graham wafer
- Red, White & Blue — vanilla + strawberry + blueberries
- Birthday Blast — birthday cake + cotton candy + rainbow sprinkles
- Pecan Praline — salted caramel + butter pecan + peanuts
- Shelby's Favorite — Shelby's cup + Superman + Blue Moon + rainbow sprinkles + marshmallow + a cherry

Badges: First Scoop, Double Trouble, Triple Scoop Master, Rainbow Power, Chocolate Overload, Fruit Explosion, Scoop Scientist (10), Master Scooper (25), Recipe Star (someone else makes yours), Shelby's Favorite.

Avatar prizes are won by saving a scoop. The list and the rules are in `game-data/avatars.ts` and `logic/prizes.ts`.

Daily event (deterministic from the date and the player, so refresh does not reroll it): Double Scoop Day, Mystery Flavor, or Shelby's Challenge. Some days are quiet.

## Screens

Home, maker, My Scoop Book, Scoop Community, achievements, profile (avatars), settings (sound, music, haptics, reduced motion — the same store as the rest of the site). First visit asks if Shelby should show a short tour.

The shop palette is strawberry, cotton-candy blue, cream, mint, and sherbet. It does not use the neon arcade chrome. Shelby is a smiling scoop in a paper hat.

## Phases

1. Plan and fit with the existing app.
2. Foundation: types, catalog, schema, repository, `/api/scoops`, hub card.
3. Ice cream maker: containers, 15 flavors, mixes, toppings, sauces, extras, animated picture.
4. Save, load, edit, delete, clone, public/private, draft resume.
5. My Scoop Book.
6. Community browse, filters, Make this, favorites, attribution.
7. XP, levels, unlocks, secrets, badges, daily event.
8. Sound, confetti, tutorial, reduced motion, keyboard, kid errors, phone and desktop layout.

Customer orders, a coin shop, contests, and parental accounts are not in this pass. The repository and the ingredient files are the extension points.

## Tests

Vitest, node environment, no browser:

- Creation rules (mix caps, undo, trim).
- Secret matching and XP.
- Name moderation.
- Repository: ownership, save/load/edit/delete, favorite, make, clone, community sorts.
- File store round-trip.
- HTTP handler status codes and kid messages.
