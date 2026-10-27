# Shelby's Scoops — bugs

## Open

None.

## Closed

### Community recipes return an empty 500 in production

`GET /api/scoops/recipes` threw while opening `.data/scoops-db.json` in the app directory. The production image cannot create that folder, and the throw escaped the handler, so the response had no JSON body. The shop file now goes to `/tmp` (or `SCOOPS_DATA_DIR`), and a disk failure serves the seeded shop from memory instead. Fixed 2026-10-27. Production stays broken until this web build is deployed.

### Welcome back after a scoop was already saved

A draft timer wrote the in-progress scoop back to `localStorage` after save, so the next visit offered to continue a finished recipe. The maker no longer writes a draft while the party screen is up, and save still clears the draft. Found and fixed 2026-10-27 while playing through the maker in the browser.

