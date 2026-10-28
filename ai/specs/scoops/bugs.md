# Shelby's Scoops — bugs

## Open

None.

## Closed

### Toppings float off the scoop and the ice cream fades into the stage

On a light flavor such as cotton candy, the scoop fill faded to near-white at the top, so the white stage showed through. Syrup was a dashed stroke, which read as a cut down the middle. Topping pictures were placed from the text baseline, so worms and sparkles sat above the ice cream. The fill now stays the flavor color with a dark rim, syrup is a solid ribbon down the side, and toppings are centered on the upper dome. Found from a play screenshot on 2026-10-28.

### Community recipes return an empty 500 in production

`GET /api/scoops/recipes` threw while opening `.data/scoops-db.json` in the app directory. The production image cannot create that folder, and the throw escaped the handler, so the response had no JSON body. The shop file now goes to `/tmp` (or `SCOOPS_DATA_DIR`), and a disk failure serves the seeded shop from memory instead. Fixed 2026-10-27. Production stays broken until this web build is deployed.

### Welcome back after a scoop was already saved

A draft timer wrote the in-progress scoop back to `localStorage` after save, so the next visit offered to continue a finished recipe. The maker no longer writes a draft while the party screen is up, and save still clears the draft. Found and fixed 2026-10-27 while playing through the maker in the browser.

