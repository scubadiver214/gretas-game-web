# Word Quest — decisions

Newest first.

## 2026-10-25 — Hint action is `applyHint`, not `useHint`

**What.** The store method that spends a hint is `applyHint(kind)`.

**Why.** `react-hooks/rules-of-hooks` treats any `use` + Capital name as a hook. Calling `useHint` from `onClick` failed CI even though it is a Zustand action, not a hook.

**Rejected.** Aliasing only in the component (`const applyHint = useWordleGame((s) => s.useHint)`) while leaving the store key as `useHint`. That would clear today's lint and leave the bad name for the next caller. Disabling the rule on those lines would hide a real naming trap.
