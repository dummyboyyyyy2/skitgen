// Minimal service worker for SKIT GEN.
// Goal: satisfy PWA installability (a fetch handler + a manifest) and give
// a basic offline fallback for the app shell — NOT to cache API/DB
// responses, since samples/DNA/scripts must always come from Neon fresh.

const SHELL_CACHE = "skitgen-shell-v1";
const SHELL_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept POST/PATCH/DELETE (samples, dna, generate)

  const url = new URL(request.url);

  // Never cache API routes — always hit the network so data stays live.
  if (url.pathname.startsWith("/api/")) return;

  // Static Next.js assets: cache-first (they're content-hashed, safe to cache long-term).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // App shell / navigations: network-first, falling back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
