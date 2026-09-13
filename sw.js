/* Kaytact Service Worker — minimal, no navigation caching
 * This prevents stale cached pages from showing 404s.
 * Static assets (icons, QR lib) are cached for offline use.
 */
const CACHE = "kaytact-v3";
const ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/qr-lib.js",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Firestore / Firebase API calls
  if (url.hostname.endsWith("firebaseio.com") ||
      url.hostname.endsWith("googleapis.com") ||
      url.hostname.endsWith("gstatic.com")) {
    return;
  }

  // Navigation requests — ALWAYS go to network, never cache.
  // This prevents stale 404s from being served.
  if (req.mode === "navigate") {
    return; // Let the browser handle it — Vercel rewrites serve index.html
  }

  // Same-origin static assets — cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
    return;
  }
});
