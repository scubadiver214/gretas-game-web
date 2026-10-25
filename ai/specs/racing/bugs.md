# Racing — bugs

Open first. Close in place with date and fix; do not delete.

## Open

| ID | Severity | Summary | Notes |
| --- | --- | --- | --- |
| B-01 | Low | Desert far mountains read like pyramids | Visual; Phase 7. |
| B-02 | Low | `BootSplash` hydration warning on `/` and `/play/racing` | Pre-existing; also triggered by the browser tool's `data-cursor-ref`. Not racing code. |
| B-03 | Medium | Embedded / background Chromium throttles the sim when the tab is idle | Looks like rivals vanishing or "still racing" on the results card if the page was not producing frames. Real Chrome with the tab focused is fine. Worth a visibility/focus guard in Phase 7 if phones do the same. |
| B-04 | Low | Not tried on a physical phone or a low-end GPU | Phase 7. Touch layout was checked at 844×390 in the embedded browser only. |

## Closed

| ID | Closed | Summary | Resolution |
| --- | --- | --- | --- |
| B-05 | 2026-10-25 | HUD rank showed 1st for every car on the grid | `RaceManager.rank()` now breaks ties with signed distance along the loop (`engine/race.ts`). |
| B-06 | 2026-10-25 | Rank hidden because there was only one racer | Phase 3: five-car race; HUD shows `n/5`. Time trial still hides rank (`racers === 1`). |
