# Wild Adventure Hunting — bugs

## Open

- **Dev-only hydration warning on `BootSplash` when the page is opened in Cursor's built-in browser.** The browser's accessibility snapshot adds `data-cursor-ref` attributes before React hydrates. Not reproducible from the app itself; no fix needed. (2026-10-26)
- **Touch quality is decided once at mount.** `lowPower` (lighter terrain, fewer plants, smaller reflection) follows the touch media query when the page loads; plugging a mouse into a tablet does not switch it. Low impact. (2026-10-26)

## Closed

- **Shooting while aiming did nothing** (2026-10-26). Right-click aim then left-click fire never called `fire`: `pointerdown` only fires for the first button held, so the shot was dropped while aim was held. Mouse buttons now use `mousedown`/`mouseup`, which fire per button. Touch still uses pointer events for looking. Checked in the browser: crosshair shrinks to the aimed size while the right button is down, a left click during that shrinks the magazine from 5 to 4, and releasing the right button returns the crosshair to hip size.

- **Last wave ended the level early** (2026-10-26). In wave levels the "anything still flying?" check ran before the final wave spawned, so the level finished 1.1 s later with that duck still taking off: it was never hit and never counted as escaped. Fixed in `HuntEngine.stepSpawns`; `HuntEngine.test.ts` now asserts hits + escaped = ducks on every level and difficulty.
- **Gun read as navy blue plastic** (2026-10-26). `material.envMapIntensity` is ignored with `scene.environment`; the viewmodel scene now sets `environmentIntensity` (D-18).
- **Shoreline grass blocked the view and the lake read as a strip** (2026-10-26). Raised the player's bank and lowered the resting pitch (D-08); short grass in front, long grass to the sides.
