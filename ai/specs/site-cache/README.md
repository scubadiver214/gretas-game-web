# Site cache

The production service worker in `public/sw.js`, registered from `src/components/ServiceWorker.tsx`.

**Status:** v3 stops serving a saved page while the network is still working. A chunk-load failure reloads the page once.

| File | What it holds |
| --- | --- |
| [plan.md](plan.md) | What the worker caches |
| [phases.md](phases.md) | The v3 fix |
| [decisions.md](decisions.md) | Why pages wait for the network |
| [todos.md](todos.md) | Nothing open |
| [bugs.md](bugs.md) | The first-load ChunkLoadError |
