/* Greta's Game service worker.
 *
 * - Static assets (models, icons, Next build chunks) are cached on first use
 *   and served cache-first, so a revisit can play offline. Models are not
 *   precached: they are ~2.7MB and were starving the first page load.
 * - Pages try the network, then a cached copy if the network is slow, so a
 *   return visit can paint the boot splash instead of a blank tab.
 * - /api/* is never cached.
 */
const VERSION = "v2";
const STATIC_CACHE = `gretas-static-${VERSION}`;
const PAGE_CACHE = `gretas-pages-${VERSION}`;

const PRECACHE = ["/", "/adventure", "/icon.svg"];
const NAV_TIMEOUT_MS = 1200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/models/") || /\.(svg|png|ico|glb|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstPage(req));
  }
});

function networkFirstPage(req) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      caches.match(req).then((hit) => hit || caches.match("/")).then((hit) => {
        if (settled || !hit) return;
        settled = true;
        resolve(hit);
      });
    }, NAV_TIMEOUT_MS);

    const finish = (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    };

    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(req, copy));
        }
        finish(res);
      })
      .catch(() => {
        if (settled) return;
        clearTimeout(timer);
        caches.match(req).then((hit) => hit || caches.match("/")).then((hit) => {
          if (hit) finish(hit);
          else reject(new Error("navigation failed"));
        });
      });
  });
}
