# Racing — todos

Open work only. Finished items belong in [phases.md](phases.md). Point at a phase when there is one.

## Phase 4 — persistence and rewards

- [ ] Power-ups beyond coins / gems / boost
- [ ] Reward engine (stars already exist locally in `score.ts`; they are not saved)
- [ ] Avatars earned from racing
- [ ] API + migration in `gretas-game-api` on a feature branch (tables in [plan.md](plan.md) §4)
- [ ] `racing-content.json` export + drift test
- [ ] Start-race / complete-race endpoints and client outbox
- [ ] Persist coins, gems, best times, track progress

## Phase 5 — garage

- [ ] Unlock the Garage / Avatars / Trophies menu tiles
- [ ] 3D garage to inspect and paint the car
- [ ] Avatar collection screen
- [ ] Backend for owned vehicles and customization

## Phase 6 — progression

- [ ] Use difficulty tiers 4 and 5 in play (data already exists)
- [ ] Track / tier unlocks (all five tracks are open today on purpose)
- [ ] More moving obstacles beyond jungle crossings

## Phase 7 — polish

- [ ] Engine and skid audio (cues + metal soundtrack already play)
- [ ] Quality presets (Low / Medium / High / Auto) and adaptive pixel ratio
- [ ] Try on a physical phone and a low-end GPU
- [ ] Far mountains on desert still read a bit like pyramids
- [ ] Perf pass (draw calls, shadow map, DPR)

## Not a phase, do not forget

- [ ] context7 was unavailable when racing was built; re-check three.js APIs against current docs if the renderer is rewritten
