# Pending UI — phases

## 1 — Loading screen while a request is in flight (2026-10-27)

- [x] A client navigation shows `BootSplash` immediately and clears it when the next URL paints.
- [x] A query with no cached data shows the same splash, unless `meta.background` says the screen already handles that wait.
- [x] `loading.tsx` on `/`, `/adventure`, `/play/*`, `/claw`, `/scoreboard`, `/my-scores`, `/trophies`, `/character`, and `/results` uses the same splash.

Verified in the browser against `next dev` on localhost. Entering a nickname and choosing Let's play showed the splash, then the hub. With the network slowed, tapping Elijah's Quack Attack on `/adventure` covered the hub with "Greta's Games for Fun is loading" while `/play/hunting` was still arriving, then the Quack Attack menu replaced it and the splash was gone. Back to the arcade returned to the hub the same way. The hub stayed usable while the bests and claw-profile calls failed (API not running); those reads are marked background.
