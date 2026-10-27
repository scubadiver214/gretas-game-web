# Pending UI — decisions

## 2026-10-27

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| P-01 | Every client navigation (`push`, `replace`, `back`) raises `BootSplash` until the URL changes. Route `loading.tsx` files render that same splash. | `router.push` left `/adventure` sitting still while the next route's response and JS were in flight. A tap on `/play/hunting` looked like it did nothing. | A hunting-only loader. `useLinkStatus` on `<Link>`, which would not cover `router.push`. Relying on `loading.tsx` alone, which does not paint until that segment suspends. |
| P-02 | A query fetching with no data yet uses the same splash, unless `meta.background` is set. Personal bests, the claw profile, top scores, and Frogger stats are background. Mutations stay inline. | A screen that cannot draw until a read returns should not sit blank. Reads that already have a skeleton, a chip, or a usable page must not hide that page. A score save should not cover the results the player is reading. | Covering every `/api` call, including the hub's bests request. A second spinner style for API waits. |
| P-03 | The navigation splash gives up after 45 seconds. | A push that never changes the URL would otherwise leave the splash up. | Leaving it up with no way back. |
