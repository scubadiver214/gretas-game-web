# Site cache — phases

## v3 — fresh deploys load (2026-10-26)

- [x] Pages wait for the network. The 1.2s timer that served a saved page is gone.
- [x] HTML is not precached.
- [x] Cache version bumped to `v3` so the old saved pages are deleted on activate.
- [x] An inline script in the root layout reloads once when a chunk fails to load, then clears that flag after a successful load.

Verified by reading the worker and the layout script. The production failure itself shows up on the first request after a deploy to www.gretagames.com, so it is not reproducible against the dev server.
