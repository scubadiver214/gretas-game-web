# Pending UI — plan

`BootSplash` is the one loading screen. Two things put it on screen:

1. **Navigation.** Every `push`, `replace`, and `back` goes through `usePendingRouter` in `src/components/PendingNavigation.tsx`. The splash is up from the click until the address changes (path or query). Each route folder also has a `loading.tsx` that renders the same splash while Next.js is still streaming that segment.
2. **Blocking reads.** A TanStack query that is fetching and has no data yet raises the same splash, unless it sets `meta.background`. Background reads are the ones that already paint their own skeleton, chip, or a usable screen (personal bests, claw profile, score tables, Frogger stats).

Score posts, claw saves, and favorite toggles are mutations. They keep the spinner or save chip on the screen the player is looking at.
