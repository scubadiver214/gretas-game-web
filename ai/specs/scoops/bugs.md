# Shelby's Scoops — bugs

## Open

None.

## Closed

### Welcome back after a scoop was already saved

A draft timer wrote the in-progress scoop back to `localStorage` after save, so the next visit offered to continue a finished recipe. The maker no longer writes a draft while the party screen is up, and save still clears the draft. Found and fixed 2026-10-27 while playing through the maker in the browser.

