# Site cache — plan

`public/sw.js` handles same-origin GET requests.

- `/_next/static/`, `/models/`, and image/font/model files: cache after a successful fetch, then reuse.
- HTML navigations: wait for the network and store a copy. The copy is used only when the network fails.
- `/api/*` is not intercepted.
- `/` and `/adventure` are not precached. A saved page from the previous deploy names chunk files that the new build deleted.
