# Shelby's Scoops — decisions

Newest first.

## 2026-10-27 — Production shop file lives in tmp

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-16 | The shop file is `SCOOPS_DATA_DIR`, or `/tmp/gretas-scoops/scoops-db.json`. If that cannot be created, the process keeps a seeded shop in memory and the route still returns JSON. | `www.gretagames.com/api/scoops/recipes` returned an empty 500. The container runs as `nextjs` and cannot create `.data` under `/app`, and that throw happened before the handler could answer. | Writing `.data` next to `server.js`. Letting the route crash with an empty 500. |

## 2026-10-27 — Plans stay in ai/specs

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-14 | The Scoops plan is only `ai/specs/scoops/plan.md`. `shelbys-scoops-plan.md` points at it. The always-on specs rule now forbids a plan in `docs/` or at the workspace root. | The first write-up was also linked from `docs/shelbys-scoops-plan.md`, so the record was split. | Keeping a second full copy outside the feature folder. |

## 2026-10-27 — Avatars are prizes for saved scoops

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-13 | Two starter faces are free. The other 19 avatars are won only by saving a scoop that meets a challenge, from a first cone up to Shelby's secret favorite and 10 saved recipes. The newest prize is worn right away. Level-ups do not grant them. | Kids want a prize when the scoop is saved, and the harder cones should take longer. | Unlocking every face by level. A random prize with no challenge. |

## 2026-10-27 — Shelby's name glows behind the shop

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-12 | A fixed wallpaper of glowing "Shelby's Scoops" wordmarks and scoop icons sits behind every shop screen. It does not receive clicks, is hidden from the screen reader, and the glow stops when motion is reduced. | Shelby asked for the game, so her name is part of the shop, but the maker, book, and buttons stay in front. | A banner or extra button that takes a tap. Putting the words on the ice cream itself. |

## 2026-10-27 — Scoops hero is Bea's sister, not Bea

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-11 | The Scoops portrait is a different child: chestnut braids, hazel-green eyes, freckles, cotton-candy blue hoodie with mint neon. Same poster style and 3:4 crop as the Claw card. File is `public/characters/scoops-sister-neon.jpg`. | The first portrait reused Bea's face, hair, and pink hoodie. The tile should feel related, not like the same character. | Recoloring Bea's hoodie only. A totally unrelated art style. |

## 2026-10-27 — Hub tile matches Bea's Claw card

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-10 | The adventure-hub Scoops tile uses a 3:4 neon portrait, the shared card chrome, and `N.scoops`. `art` is required on every hub tile. A Cursor rule at `.cursor/rules/hub-tiles.mdc` says new tiles copy Bea's Claw card. The current portrait is `public/characters/scoops-sister-neon.jpg`. | The first Scoops tile was a glowing emoji in the art well. Every other game, and Claw especially, is a full-bleed portrait with the same crop. | A custom Scoops card. Leaving the emoji fallback in the hub. |

## 2026-10-27 — Drafts stop when the scoop is saved

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-9 | The maker stops writing the local draft once the naming step has saved and the party screen is up. | A timer was writing the draft again after a successful save, so Welcome back appeared for a scoop that was already in the book. | Clearing the draft only, and leaving the timer free to put it back. |

## 2026-10-27 — Shop architecture

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-1 | Scoops is not a `GameMode`. The hub gets a card that links to `/play/scoops`. XP, coins, badges, and unlocks live in the scoops profile. | `GameMode` is wired to stars, daily challenges, and `POST /api/scores`. Scoops is a sandbox, not a timed round. Adding a mode would migrate every player save and the score rules for no scoreboard. | A `scoops` entry in `GAME_MODES` and a Postgres score cap. |
| D-2 | The player is the existing nickname. User id is the lower-cased nickname. Demo login sets that nickname to Shelby. | The site is already child-safe nickname login. A second email/password system would collect personal information this game is not supposed to ask for. | A scoops-only account table with passwords. Anonymous local-only ids that cannot own a community recipe. |
| D-3 | Recipes persist in a normalized JSON document behind `/api/scoops`, through a repository interface. The Next route is a static segment so the catch-all proxy does not send it to .NET. | The maker has to run with `next dev` and no Postgres. The handler shape is what a future Dapper module would implement. Community recipes on one dev server are shared through the file. | Calling the .NET API in this pass (the shop would be dead whenever Aspire is down). localStorage as the only copy (other browsers would never see a published recipe). |
| D-4 | Unfinished scoops autosave in `localStorage`, not in the recipe table. | A draft is not a recipe yet. Refresh should restore it even if the file store is busy. Welcome back reads that draft. | Writing a half-named recipe on every tap. |
| D-5 | Most of the freezer is unlocked at level 1. Blue Moon, Superman, birthday cake, and blueberry cheesecake wait for later levels, matching the brief, but eight flavors work immediately. | A locked shop is not fun for a four-year-old on the first visit. The gated flavors are the reason to keep scooping. | Locking everything except vanilla, chocolate, and strawberry. Unlocking all 15 at the start. |
| D-6 | The shop does not use the neon arcade chrome. Display type is Baloo (`--font-display`). Sound uses the existing `fx` bus and the global sound toggle. No background music. | The brief asks for a candy shop of its own, and for sound that can be turned off without an autoplaying song. | A neon reskin of the hub. A new audio engine. |
| D-7 | Secret match is "contains these ingredients", not an exact recipe. | Kids add a cherry and should still discover Super Moon. Exact match would hide the reward. | Exact ingredient lists only. |
| D-8 | Editing a recipe grants a small XP bonus. The full scoop score is for a new recipe. Secret bonuses still pay the first time they are discovered. | Otherwise a child can farm level 10 by pressing save. | Full XP on every save. No XP on edit. |
