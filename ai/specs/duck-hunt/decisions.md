# Wild Adventure Hunting — decisions

Newest first. IDs are stable; refer to them from code reviews and later sessions.

## 2026-10-27 — Misses spook the flock

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-28 | A shot aimed within 18° of any duck spooks that whole flock. Every bird that was not hit peels onto its own path, weaves harder, and flies at 1.7× speed for 2.6 seconds. A second shot at them refreshes the spook. A shot pointed away from them does nothing. | A miss used to bother only a duck the pellets passed within 5 m of, so the rest of the flock stayed in line and the follow-up was easy. The ask was that a shot in their direction makes the group scatter and speed up. | Spooking every duck in the sky. Keeping the 5 m near-miss, which ignored a flock you were clearly aiming at. Leaving them fast for the rest of the round (levels would stop being finishable, especially for younger players). |

## 2026-10-27 — Busier skies

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-27 | Six ducks can be shot in the air: mallard, wood duck, northern pintail, green-winged teal, canvasback and northern shoveler, each as a drake or a hen. Swimming wood ducks stay protected. Flocks use a V, echelon, line, string, diamond, stack or chevron, and may skim low, fly overhead, hook back, peel apart, or cross from both sides. Level 1 still waits for a clear sky. Levels 2–5 launch the next flock while the last is up (champion: up to 8 at once, 36 a round). Points per duck are unchanged. Star thresholds moved up. A duck still flying when the round ends counts as escaped. | The ask was more kinds of ducks, richer formations, and more to shoot. Waiting for an empty sky made the lake feel empty. Same points keep every level under the 30,000 API cap. | Shooting the ducks that are swimming. Shrinking teal until an Expert center-shot misses. Raising the hit goal on every level. Clay targets (phase 2). |

## 2026-10-26 — User commits and pushes

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-26 | Agents do not commit or push. API work stays on `gretas-game-api` `main` with no feature branch, and the user commits and pushes that branch themselves. | The user commits and pushes `main` manually. A push of API `main` also deploys. | Agents committing or pushing when a task finishes. |

## 2026-10-26 — API commits on main

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-25 | `gretas-game-api` hunting score changes stay on `main`. The local `feature/hunting-scores` branch was removed after fast-forwarding `main` to `a3b3268`. That commit is local only. | The user wants API work committed on `main`, not a feature branch. Pushing `main` still auto-deploys, so it was not pushed. | Leaving the work on `feature/hunting-scores`. |

## 2026-10-26 — Expert Ranger accuracy

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-24 | Expert Ranger only: hit area 0.82→0.5, speed 1.25→1.7, jink 1.45→1.85, and the pellet cone is 0.4× (hip about 1.3°, aimed about 0.6°). No aim help. Junior and Adventure are unchanged. | Expert still scored a shot that only passed near the duck, because the pattern was wider than the bird. The request was perfect-accuracy aiming or faster ducks. Both, on Expert only. | Shrinking the duck model (harder to see). A single pellet and no spread (stops feeling like a shotgun). |

## 2026-10-26 — Harder shots

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-23 | Shots are less forgiving on every preset. Junior hit area 1.7→1.2 and aim help 0.85→0.45, with a slower pull. Adventure and Expert tighten further (Expert hit area 0.82, no aim help, faster jink). Hip-fire spread opens from 2.5° to 3.2°; aiming still tightens it to 1.6°. Time limits and shell counts stay put. | The default (Junior Explorer) ducks were large, slow, and the crosshair was pulled onto them, so a shot near a duck landed. The ask was a bit harder to shoot, not a shorter clock. | Only turning off aim help. Speeding the clock up. |

## 2026-10-26 — Lobby card and name

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-22 | The game's player-facing name is **Elijah's Quack Attack**. The mode id stays `hunting`, the route stays `/play/hunting`, and the spec slug stays `duck-hunt`. Scoreboard tabs use the short label "Quack". The lobby card uses a neon hero illustration at `public/characters/hunting-quack-neon.jpg`, the same treatment as the other adventure cards. | The emoji tile was the only card without hero art, so it read as a different design. The new name matches the "kid's name + pun" titles (Bea's Claw-some Adventure, The Fitz and Furious). | Keeping "Wild Adventure Hunting" on the card. Leaving the duck emoji as the art (D-19), now that art was requested. |

## 2026-10-26 — Sound

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-21 | The hunting screen plays a synthesised A-minor underscore (slow pad, a soft distant pulse, sparse bells) on the shared music bus, for the menu and the round. Lake ambience stays, a little quieter. The shotgun, a hit, and a new discovery dip the music. Aiming and the ejected shell got their own short sounds. The music toggle and slider apply, because this is a `hunting` track next to the racing band. | The arcade playlist was parked on this screen, so the lake was the only bed. The request was calming music with some suspense, plus effects that still read over it. A soft pulse every other bar is the suspense; there is no percussion, no stabs. | Streaming one of the shop songs (they don't belong at the lake). A heartbeat loud enough to feel like a thriller. Recorded music (no assets, and the synth can loop cleanly). |

## 2026-10-26 — Aim and shoot

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-20 | Desktop fire and aim listen to `mousedown` / `mouseup`. Touch looking stays on pointer events. | `pointerdown` fires only when the first mouse button goes down. A left click while right-click aim was held never reached the game, so a shot during aim did nothing. | Watching the `buttons` bitmask on `pointermove` (a click with no mouse movement would still be missed). |

## 2026-10-26 — Phase 1 build

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-19 | No hub hero art yet; the adventure hub card uses its glowing-emoji tile (🦆). | Image generation needs an explicit request from the user. | Generating neon card art unasked. |
| D-18 | Image-based lighting strength is set with `scene.environmentIntensity` (world 0.6, viewmodel 0.28), not `material.envMapIntensity`. | three r186 overrides `envMapIntensity` with `scene.environmentIntensity` whenever `scene.environment` is used (`WebGLRenderer.js`). At full strength the gun steel reflected the sky and read navy blue. | Per-material `envMapIntensity` (silently ignored). |
| D-17 | Desktop aiming uses pointer lock, with a fallback when the browser refuses it: raw `movementX/Y` still turns the view and clicks fire. Losing the lock mid-level pauses. | Embedded browsers (and some kiosks) deny pointer lock; the game must stay playable. | Cursor-follow crosshair (less like the reference FPS feel). |
| D-16 | The arcade soundtrack is held for the whole page; a synthesised lake ambience (wind, lapping water, birdsong, distant quacks) plays instead. Shotgun has a lake echo. | Immersion; no audio assets needed. Uses the shared SFX bus so global sound settings apply. | Menu music over nature sounds. |
| D-15 | Finished levels post to `POST /api/scores` as mode `hunting` (direct submit), `level` = level number 1–5. API max score 30,000. API change is on `gretas-game-api` branch `feature/hunting-scores`, uncommitted. | Same pattern as racing. `scoreCeiling` test keeps every level under the cap (busiest level ≈ 20,550). | Server-tracked sessions (overkill for an arcade round). |
| D-14 | Game progress is one device-local zustand store (`gretas-game:hunting`): prefs, per-level records, Field Journal (with photo thumbnails), badges. Global trophies and stars still go through `finishRound`. | The app has no accounts, only one nickname per device. | Multiple profiles per device; server-side journal (thumbnails are ~10 KB each; fine locally). |
| D-13 | Three presets (Junior Explorer 5–7, Adventure Hunter 8–10, Expert Ranger 11–14) scale duck size, hit size, speed, wiggle, aim assist, time, spare shells and the protected-wildlife penalty. Adaptive help after 2 and 4 failed attempts; a little extra wiggle after repeated 3-star runs. Shown to the player on the level intro. | Brief §8. Never punitive; always visible. | Silent adaptation. |
| D-12 | Stars: objective met = 1★; two per-level score thresholds give 2★/3★. The HUD score bar shows both thresholds as markers. | Mirrors the reference screenshot's score bar with markers; stars stay legible to kids. | Accuracy-only stars. |
| D-11 | Wildlife discovery: the camera is available in every hunt (Q / CAMERA button) and is the only tool in Wildlife Explorer mode. A photo picks the best-framed animal and scores 1–3★ on centring and frame fill. The first photo of a species reveals its name and a fact; the best photo becomes the journal thumbnail (JPEG 240×180 grabbed from the world pass, no hands). | User request: younger players can photograph instead of hunt; badges for identifying animals and finding rare ones. | Separate photo-only levels; storing full-size photos. |
| D-10 | Protected wildlife (swans, heron, loon, kingfisher, turtle, frog, swimming ducks) is never hurt. A shot that lands on one (and no duck) shows a friendly message and costs 0/25/50 points by difficulty; nearby animals startle (swim off, fly to the other shallows, duck under). | Brief §4B "identify and avoid", age-appropriate. | No consequence at all; harsher penalties. |
| D-09 | A hit duck flashes, pops away with a sparkle burst and a gold star floats up. No feathers, no falling birds. | Brief: nonviolent success animation. | Feather puffs (read as injury). |
| D-08 | The player stands on a raised grassy bank (eye 3.2 m), resting pitch 3°. | Matches the reference composition: water fills the lower half, far shore near the middle. At 1.7 m eye height the lake read as a thin strip and near grass blocked the view. | Eye at 1.7 m. |
| D-07 | All art is procedural (birds, critters, shotgun, camera, hands, vegetation, terrain) behind small builder functions. Hands use the player's chosen skin colour and shirt colour. | No licensed GLB assets exist; builders can be swapped for GLB later without touching the engine. | Blocking on assets; primitive placeholder boxes. |
| D-06 | Lake = `Reflector` with a custom shader: procedural wave normals, Fresnel, sun glints, shoreline lapping, manual fog. Reflection target at half resolution (0.35 on touch). The shader has a GLSL copy of `lakeDist`. | Best "realistic water reflections" for the cost; no textures needed. | drei `MeshReflectorMaterial` (less control); three `Water` (needs a normal-map asset). |
| D-05 | Two render passes per frame: world (main camera, near 0.3) then, after clearing depth, the viewmodel scene with its own camera (near 0.01). | Gun never clips into the world, never appears in the lake reflection or in wildlife photos; no depth-precision trouble. | Gun parented to the main camera. |
| D-04 | Engine is pure TypeScript with a fixed 1/120 s step: hitscan pellets (9 per shell, cone spread) against forgiving spheres; no physics library. | Deterministic and unit-testable (bot plays every level on every difficulty in tests). | Rapier / cannon. |
| D-03 | Code in `src/features/hunting/`, route `/play/hunting`, leaderboard mode `hunting`; spec slug stays `duck-hunt` (folder existed with the brief). | Repo convention is one feature folder per game. | `games/wild-adventure/` tree from the brief. |
| D-02 | Phase 1 scope: World 1 Peaceful Lakeside (levels 1–5) + Wildlife Explorer + Field Journal, built to final quality. Worlds 2–6 appear on the level map as non-interactive "coming soon" cards. Training Academy, Skeet & Trap and Equipment are not on the main menu yet. | User priority: a genuinely impressive first level that sets the bar. Brief rule: no buttons that do nothing. | Thin versions of all 30 levels / 4 modes in one pass. |
| D-01 | React Three Fiber for the whole scene (user's call). Per-frame work lives in plain classes / functions (`render/systems/*`) that R3F components call from `useFrame`. | Integrates with the React UI; keeps the React compiler `react-hooks/immutability` lint happy (assigning to hook values inside callbacks is flagged, method calls on plain objects are not) and keeps the frame path allocation-light. | Racing-style imperative renderer outside React. |
