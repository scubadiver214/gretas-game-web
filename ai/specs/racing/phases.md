# Racing — phases

A phase is a named slice of this game with a clear "done". Tick the box only after it is verified (tests and, for anything on screen, a real browser).

## Checklist

- [x] **Phase 1** — repository analysis, architecture, plan
- [x] **Phase 2** — playable 3D desert prototype (solo)
- [x] **Phase 3** — complete five-car race (rivals + time trial)
- [ ] **Phase 4** — collectibles, rewards, persistence
- [ ] **Phase 5** — garage, customization, avatar collection
- [ ] **Phase 6** — five tiers wired through, remaining worlds/unlocks, moving obstacles *(tracks 2–5 were pulled forward into 2/3)*
- [ ] **Phase 7** — polish, audio, quality presets, optimization

Pulled-forward extras (not their own phase numbers): variety pass (Fitzmagic + extra tracks) in [2.2](#22-variety-pass), beach + jungle in [2.3](#23-beach-and-jungle).

---

## Phase 1 — architecture

**Goal.** Decide how racing fits this repo (no Rapier, nickname identity, `src/features/racing/`, phased delivery).

**Done when.** [plan.md](plan.md) exists and the later phases are listed.

Shipped as this spec.

---

## Phase 2 — playable 3D desert prototype

**Goal.** One child can finish a 3D lap on a desert track. No opponents. Rank is hidden because there is only one racer.

**In scope.** Track system, terrain, road, props, a procedural car, arcade physics, chase camera, keyboard + touch, walls and obstacles, ramps, coins/gems (counted, not saved), checkpoints + laps + timer, countdown, HUD, results, tests.

**Out of scope.** AI cars, persistence, garage, extra worlds (those arrived early in 2.2 / 2.3).

### 2.1 What shipped (verified)

All in `gretas-game-web`, route `/play/racing`, hub card added; **no API changes**.

- Track system: closed centripetal spline, equal-spacing samples, projection, ramps, gates, validation. World 1 *Dusty Desert Dash* (~1.4 km, 2 laps, 6 gates, 2 ramps).
- 3D desert: dunes, dirt road, boulder wall, cacti, hay / tyres / boulders, posts, turn signs, striped arches, sky, shadows.
- Procedural cartoon buggy (later replaced by Fitzmagic in 2.2) behind `VehicleVisual`.
- Arcade vehicle: accel, brake/reverse, speed-sensitive steering, grip, handbrake drift, boost, sand, ramps and jumps.
- Collisions: track walls, solid obstacles, arch legs, ramp back-face protection.
- Chase camera: smoothed angle, rigid distance, speed FOV, turn tilt, shake, obstruction, menu orbit.
- Keyboard (WASD / arrows, Space, Shift, R, Esc) and on-screen touch (multi-touch).
- Race flow: 3-2-1-GO, ordered gates, laps, timer, finish, results, pause, restart, reset, wrong-way and stuck.
- Pulled forward because a lap needs them: coins + gems (not saved), gold-plate HUD, minimap, boost meter, assist (Pro / Helper / Super helper), five `DifficultyConfig` tiers as data (only tier 1 in use then).
- Tests beside the engine and world.

**Browser verification (embedded Chromium + WebGL):** menu over the live orbiting scene; Play → countdown → GO; holding W reaches ~87 MPH and matches the HUD; a two-lap finish (gas-only Helper ~1:19, pure-pursuit ~1:56); gates in order; pause / restart / R / main menu; phone-landscape touch layout; hub card; production build includes `/play/racing`.

### 2.2 Variety pass (pulled from Phase 6)

All tracks open from first launch (no unlocks; those stay in Phase 4/6).

- **Frosty Flurry Run** (winter): snow road, deep-snow shoulder, drifts, pines, ice, snowmen, falling snow.
- **Sunny Summit Sprint** (alpine): tarmac, meadows, snow-capped mountains, pines, blossom, log piles.
- Worlds as data: `WorldProfile`, `WorldTheme`, per-world road texture and props builder. Road is flat apart from ramps; "mountainous" is scenery beyond the walls.
- Surfaces: snow / deep snow, tarmac / grass. Every track finishable by autopilot and gas-only Helper (`engine/tracks.test.ts`).
- **Fitzmagic** replaces the jeep: lofted pearl-white hypercar (`vehicle/loft.ts`), black nose/canopy, gold roundel, logo decals. Same `VehicleVisual` contract.
- Menu "Pick a track" (five cards); `trackId` saved in racing settings.

### 2.3 Beach and jungle

- **Breezy Beach Blast**: packed-sand road, sea plane, dunes, palms, road hills, beach obstacles.
- **Jungle Roar Rally**: red-earth hills; lions/tigers/giraffes dash across when a car is near (`RaceEngine` wait/cross/rest); soft hits; roamers off-road.
- Hills are arc-length swells (`hillAt`, slope ≤ 0.2, kept off ramps). Terrain follows the road nearby.

---

## Phase 3 — complete five-car race

**Goal.** The menu offers a race against other cars *or* a time trial. Rivals are different shapes and sizes. The race looks contested (pack stays near the player) without taking the win away from a good driver.

**In scope.** Four AI personalities on a racing line, car-car collisions, starting grid, HUD rank, minimap opponents, results with placements, time-trial toggle.

**Out of scope.** Persistence, garage, unlocks, engine/skid audio.

### 3.1 What shipped (2026-10-25)

- Mode picker above Play: **Race rivals** (default) or **Time trial**. Saved as `mode` in racing settings (storage version 3). Switching rebuilds the grid without reloading the world.
- Four rivals (`rivals.ts`, `render/vehicle/rivals.ts`): Big Bertha (monster truck), Zippy (bubble car), Rocket Rita (formula), Bus-ter (school bus). Each has its own radius, handling and personality.
- AI (`engine/ai.ts`): pure pursuit on a lane, slows for the next bend, dodges traffic, seeded mistakes, boosts on a straight to pass a nearby player. Stuck / wrong-way rivals respawn. They never collect pickups.
- Pack-keeping (`config.ts` `AI`): far behind → speed up (capped at that car's top speed) and corner better; far ahead → ease off.
- Car-car bumping (`resolveCars`): mass-weighted; player is heavier with more assist; airborne cars pass; no bumping during respawn flicker.
- Player starts at the back of the grid. Rank ties on the grid go to the car further up the road.
- HUD `n/5`, overtake banners, coloured minimap arrows, player-only SFX. Results list finishing order (or "still racing").
- Scoring unchanged (time, coins, gems) so both modes share one leaderboard.
- Tests: `engine/rivals.test.ts`, car-car cases in `collision.test.ts`. All five tracks: every car finishes, rivals stay in the corridor, no rival rescues, field within 30 s.

**Browser verification:** menu shows both modes and names the four rivals; Play puts five distinct cars on the desert grid (rank 5/5); gas-only Helper can take 1st; results card lists order; time trial empties the grid; alpine grid still shows all four bodies.

### 3.2 Crashes and a closer pack (2026-10-25)

**Goal.** A major hit wrecks a car where it happened, and the rivals are hard to pass by just holding the gas.

**What shipped**

- `CRASH` in `config.ts`. A closing speed of 9 u/s into an animal or a roadside obstacle, or 12 u/s into another car, wrecks the car. A slower nudge stays a bump. The boundary wall still only bounces.
- The wrecked car is set a few metres back along the road, in its lane, facing forward, speed 0. It sits (`recoverSeconds`, shorter for Helper / Super helper, shorter still for rivals), then has to drive again. That is not a checkpoint reset. `R` still returns to the last gate.
- HUD shows **CRASH!** while the player is sitting. The body spins; the chase camera keeps the road heading. Dust burst and the crash cue play for the player.
- Rivals run near their cars' real pace (tier 1 AI speed 0.94, much less corner dumping, fewer mistakes). They defend a lead inside 50 m with a tidy line and a boost, and only ease off after a 110 m lead.
- Desert, gas-only Helper: about 3rd, a second off the win, the whole field inside a few seconds. After 22 s they are still not in the lead.

**Verified.** `engine/crash.test.ts` (obstacle, animal, head-on, slow nudge, wall). `engine/rivals.test.ts`: gas-only Helper finishes off the win and inside 8 s; rank is still behind after a 22 s sprint; every track's rivals finish in the corridor with no gate rescue and within 18 s of each other.

**Browser (embedded Chromium, `/play/racing`).** Desert, Pro, Race rivals: still 5/5 at 35 s while the car was off in the sand (rivals not left behind). Jungle, Super helper: held ~85 MPH in 5th for the first 12 s, then **CRASH!** and speed 0; about a second later the banner was gone, lap was still 1 of 2, the clock had kept running, and speed was back over 80 MPH. Restart was at the crash, not the last gate.

### 3.3 Weapons

**Goal.** During a race, gun, mine and oil icons lie on the road. Drive over one to pick it up. Switch weapons and fire them with the keyboard (and with on-screen buttons).

- Icons every 150 m along the road, clear of ramps. Driving over one adds a charge (max 5) and selects it. They come back on the next lap. Ammo is kept through a crash and a new lap.
- Q / E cycle, 1 / 2 / 3 select gun / mine / oil, F fires. Touch: SWAP and FIRE. The HUD tray shows all three counts, with the selected one lit.
- A blaster bolt wrecks the first other car it reaches. A mine dropped behind the car arms after 0.45 s, then wrecks whoever drives over it. An oil puddle only makes the car slide. Rivals can be hit. They do not pick up or fire.
- The wreck is the same in-place restart as phase 3.2. The shooter does not crash from their own bolt.

**Verified.** `engine/weapons.test.ts` (pickup, cycle, empty fire, bolt, mine arm, oil). `world/content.test.ts` includes the icons in the determinism check and keeps them on the road, off ramps. `engine/input.test.ts` covers Q, E, 1–3 and F. Full racing suite: 343 tests. `tsc --noEmit` clean.

**Browser (embedded Chromium, `/play/racing`, desert, Super helper).** The tray showed GUN / MINE / OIL at 0 with "Q E switch · F fire". By 14 s the car had driven over icons and the tray read gun 1, mine 1. F dropped the mine (count went to 0 and a red mine sat on the road behind the car). 1 then F fired the gun (count went to 0). A further F flashed "Empty!". The pause card lists the weapon keys.

### 3.4 Easier first races, gun bursts

**Goal.** The first rival races are ones you can pass. The field gets faster each time you start another. A gun pickup fires for 10 seconds, not one shot.

- Rival pace starts at 70% of the tier pace and reaches full pace on the 7th rival race you start (`AI.rookiePace`, `AI.paceRaces`). The count is saved in racing settings on this browser. Time trial does not count. Start over counts as another race.
- The menu says whether the other cars are taking it easy, speeding up, or at full speed.
- Pressing F with a gun spends one charge and shoots bolts for 10 seconds. Another charge, pressed again, adds another 10 seconds. The tray shows the seconds left. A crash pauses that clock. Mines and oil are still one use.

**Verified.** `rivalPaceScale` steps from 0.7 to 1. A gas-only Helper leads the first desert race after 22 s, and is still off the win once the field is at full pace. A gun charge sets a 10 s burst, a second charge makes it 20 s, and the burst stops when the time is gone. Racing suite: 347 tests. `tsc --noEmit` clean.

**Browser (embedded Chromium, `/play/racing`, desert, Super helper).** The menu said "Race 1: the other cars are taking it easy". By 24 s the car was in 1st at 84 MPH, with two guns. F started the burst and the tray counted down (it showed 1s while still in the lead). Back on the menu it said "Race 2: the other cars are taking it easy".

### 3.5 Phone boost

**Goal.** A phone player can boost while holding GO.

The boost button is above the right steer arrow, on the left thumb. GO, STOP and DRIFT stay on the right, with nothing stacked on GO.

**Browser (embedded Chromium, phone landscape 844×390).** The flame sits above the right steer arrow (x 127). GO is on the right (x 726) with STOP and DRIFT beside it, and nothing stacked on GO. The minimap stays clear of the flame.

### 3.6 Weapon hits boom

**Goal.** A gun, mine or oil slick that catches another car plays an explosion, so a hit sounds different from dropping the weapon.

The boom plays on the hit: a bolt that wrecks a rival, a mine that wrecks a rival, or the moment a rival first slides on your oil. Pressing F still only whooshes. Your own oil still flashes "Slippery!". Your own mine still uses the crash bump.

**Verified.** `engine/weapons.test.ts`: a rival placed on a fresh slick emits `weaponHit` kind `oil`, gets slippery, and is not wrecked. Gun and mine hits already emit `weaponHit`, and the sound hook plays the explosion when the target is not the player. `tsc --noEmit` clean. The boom itself is a synthesised cue (`fx.explosion`), so the browser could not be checked by ear.

---

## Phase 4 — collectibles, rewards, persistence

**Goal.** Power-ups, a reward engine, avatars, celebration, API + migration, saved progress. See [plan.md](plan.md) section 4.

Not started. [todos.md](todos.md).

## Phase 5 — garage and customization

**Goal.** 3D garage, vehicle paint, avatar collection, backend persistence.

Not started. Menu tiles Garage / Avatars / Trophies are locked placeholders.

## Phase 6 — worlds, difficulty, moving obstacles

**Goal.** Tiers 1–5 wired through AI/assist, remaining world work, progression/unlocks, moving obstacles.

Tracks 2–5 and crossing animals shipped early. Still to do: unlocks, using all five difficulty tiers in play, more moving obstacles.

## Phase 7 — polish

**Goal.** Engine and skid audio, quality presets (Low/Medium/High/Auto), adaptive pixel ratio, mobile polish, perf pass.

Not started. Cue SFX and the metal soundtrack already play.
