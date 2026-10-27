# Site cache — bugs

## Open

None.

## Closed

- **First load after a deploy throws `ChunkLoadError` for a `/_next/static/chunks/` file. Reload works.** (2026-10-26) The service worker gave up on the network after 1.2s and served a saved page from the previous build. That page requested chunks the new build had deleted. v3 waits for the network, and the page reloads itself once if a chunk still fails.
