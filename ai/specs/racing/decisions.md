# Racing — decisions

Newest first. Each entry is a choice that later work should not silently reverse. If you reverse one, add a new entry that says so.

## Decision tree (how we got here)

```mermaid
flowchart TD
  start[Kids arcade racer in this repo]
  start --> physics{Physics?}
  physics -->|Rapier| rejectedPhysics[Rejected: WASM, non-deterministic, hard to tune for ages 4-10]
  physics -->|Custom arcade| arcade[Fixed-step vehicle model]
  start --> identity{Accounts?}
  identity -->|New auth| rejectedAuth[Rejected: repo-wide change]
  identity -->|Nickname like other games| nick[RequirePlayer + usePlayerStore]
  arcade --> opponents{Opponents?}
  opponents -->|Always five cars| alwaysRace[Rejected: user asked for time trial as an option]
  opponents -->|Menu: race or time trial| modes[Default: race rivals]
  modes --> shapes{How do rivals look?}
  shapes -->|Reskins of Fitzmagic| rejectedClone[Rejected: user asked for different shapes and sizes]
  shapes -->|Four unique bodies| bodies[Monster, bubble, formula, bus]
  modes --> pace{Keep the pack close?}
  pace -->|Fixed AI speed only| lonely[Rejected: fast player leaves the field]
  pace -->|Catch-up capped at car top speed| pack[config.ts AI catchUp / easeOff]
  arcade --> persist{Save progress now?}
  persist -->|Phase 4 API| later[Scores only, shared leaderboard]
```

## Log

### 2026-10-25 — Road weapons

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| R-35 | Three toy weapons — a blaster bolt, a pop mine, an oil puddle — sit on the road as icons. Drive over one to gain a charge (max 5) and select it. Q/E or 1/2/3 select, F fires. Touch gets SWAP and FIRE | The player asked to grab weapons off the road and switch them with keys. Rivals stay fast, so this is how you catch them | A weapon wheel, mouse aiming, realistic guns |
| R-36 | A bolt or an armed mine wrecks the car it touches (same in-place restart as a crash). A mine cannot go off for 0.45 s, so dropping it does not blow you up. Oil only cuts grip. Rivals do not pick up or fire | The same wreck already exists, and a child should not die to their own mine the instant they drop it. Computer cars stay a driving fight | Damage numbers, rivals that shoot back, oil that wrecks |
| R-37 | Ammo survives a crash and a new lap. The icons come back each lap, like coins. The boundary wall is still not a crash | You should keep what you grabbed. A lap should restock the road, not empty your pockets | Losing ammo on a wreck; icons that never return |

### 2026-10-25 — Crashes and a closer pack

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| R-32 | A wreck restarts the car **where it crashed** (about 4 m back, on the road, facing forward) | The player asked to restart at the crash, and a car left inside a cactus or an animal cannot drive | Teleport to the last gate (that stays the R / stuck rescue); leaving the car embedded in the thing it hit |
| R-33 | Only a **major** hit wrecks: animal or roadside obstacle at 9 u/s, car-to-car at 12 u/s. The boundary wall stays a bounce. Helper and Super helper need a harder hit and sit for less time | A nudge or a brush of the barrier would wreck a child every corner. A head-on or a fast hit into a hay bale, cactus, animal or another car should stop the race for a moment | Wrecking on every contact; wrecking on the corridor wall; the same sit time for a four-year-old and a pro |
| R-34 | Rivals race near their own top speed, carry speed through bends, and defend a short lead. They ease off only after a 110 m gap | Holding the gas walked past the whole field, because tier 1 ran them at 70% and any lead made them slow down | Making a rival faster than Fitzmagic can boost past; uncapped rubber-banding; leaving the old ease-off in place |

### 2026-10-25 — Phase 3 rivals

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| R-20 | Menu offers **Race rivals** (default) and **Time trial** | User asked for a time-trial option before the race so competition is optional | Always-on five-car races; hiding rivals behind a locked tile |
| R-21 | Four unique bodies, not Fitzmagic reskins | User asked for different shapes and sizes | Palette-swaps of the player car |
| R-22 | Rivals: Bertha (truck), Zippy (bubble), Rita (formula), Bus-ter (bus) | Read as different from across the grid; each has its own radius and handling | Identical hitboxes |
| R-23 | Player starts at the **back** of the grid | There is always someone to chase | Pole by default (`playerSlot: 0` still exists for tests) |
| R-24 | Light pack-keeping: behind → faster (capped at that car's top speed) and better corners; ahead → ease off | Otherwise a gas-only child gaps the field by hundreds of metres on desert | Pure fixed AI speed (the original "no rubber-band" line in `difficulty.ts`); uncapped catch-up |
| R-25 | Player car is heavier the more assist they have | A bump must not ruin a little one's race | Equal mass for all cars |
| R-26 | Rivals never pick up coins/gems | Pickups are the player's toy; AI collecting them would steal the HUD | Shared pickups |
| R-27 | Seeded AI (`track.seed:name`) | Races replay; tests are deterministic | `Math.random()` |
| R-28 | Sounds and camera kicks only for the **player's** events | Four rival walls would drown the mix | SFX per racer |
| R-29 | Scoring unchanged (time + coins + gems) | One leaderboard for both modes; place is flavour | Separate race vs time-trial scores |
| R-30 | Results list every car; unfinished cars say "still racing" | Player finish is the moment; we do not wait for the AI | Block the card until all five finish |
| R-31 | Grid rank uses road position when fractions are equal | Otherwise everyone on the grid showed as 1st | `fraction` only (0 for every car behind the line) |

### Earlier (Phases 1–2, from the original architecture doc)

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| R-01 | No Rapier; custom arcade vehicle | Deterministic, tunable for children, matches claw/frogger | Rigid-body WASM |
| R-02 | Nickname identity, no accounts | Repo-wide; family game | Inventing auth |
| R-03 | Feature lives in `src/features/racing/` | Same shape as claw/frogger | `games/the-fitz-and-furious/` |
| R-04 | Engine is pure TS; renderer only reads it | Testable; no React/three in the sim | Driving the sim from R3F |
| R-05 | Zustand for HUD snapshots only | Avoid per-frame React renders | Putting vehicle state in zustand |
| R-06 | Deliver in numbered phases | Scope is larger than one change | Building persistence and garage first |
| R-07 | Client simulates the race; server will only bound results (Phase 4) | Same honesty model as Frogger/claw | Authoritative server physics |
| R-08 | Coins/gems counted in Phase 2, not saved | Needed to finish a lap fantasy; persistence is Phase 4 | Skipping pickups until the API |
| R-09 | Assist is a player setting, separate from track tier | A four-year-old and an older sibling can share a track | Tying help to the world |
| R-10 | All five tracks open from launch | Show range up front; unlocks stay Phase 4/6 | Gating worlds behind wins |
| R-11 | Worlds are data (`WorldProfile` + `WorldTheme` + props builder) | Adding a track should not fork the renderer | One-off scenes |
| R-12 | Road is flat apart from ramps and explicit hills | Kids must be able to drive it; no cliff walls | Full 3D mesh collision |
| R-13 | Fitzmagic lofted hypercar replaces the jeep | Visual identity; same `VehicleVisual` contract | Shipping the cartoon buggy |
| R-14 | Crossing animals are a state machine in the engine, roamers are render-only | Hits must be fair and testable | Decorative-only animals on the road |
| R-15 | `RaceManager` always ranked N cars; Phase 2 raced 1 | Avoid rewriting ranking for Phase 3 | A solo-only progress tracker |
