# Wild Adventure Hunting — todos

Ordered. Phase in brackets.

1. **Ship the API before (or with) the web change.** Until `gretas-game-api` `feature/hunting-scores` is merged and deployed, the web "Hunting" scoreboard tab gets a 400 and finished levels fail to post (the game itself works). Merging to `main` auto-deploys. [1]
2. Hub hero art for the hunting card (`public/characters/…-neon.jpg`, same style as the others) if the user wants generated art. [1]
3. Test on real phones/tablets: frame rate with the reflection at 0.35 scale, thumb reach of the buttons, iOS audio unlock. [6]
4. Scoped rifle, binoculars, deer AI and Deep Mountain Woods. [2]
5. Skeet and trap ranges with clay physics. [2]
6. Training Academy (5 lessons, Rookie Ranger). [3]
7. Worlds 3–6 with their wildlife; Safari is photo-first. [4]
8. Levels 6–30 and equipment unlocks/skins. The API caps `level` at 5, so either raise it or submit the level within its world. [5]
9. Optional recorded audio samples (the synth versions stay as fallbacks). [6]
10. Optional GLB models for ducks and the shotgun behind the existing builders. [6]
