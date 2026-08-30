const FX_CACHE_VERSION = "fx01-v1.3.1";
const FX_CACHE_NAME = `fx01-${FX_CACHE_VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(FX_CACHE_NAME)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("fx01-") && k !== FX_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("chrome-extension")) return;
  if (
    !e.request.url.startsWith(self.location.origin) &&
    !e.request.url.startsWith(self.location.protocol)
  )
    return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        e.waitUntil(
          fetch(e.request)
            .then((r) => {
              if (r && r.ok) {
                caches.open(FX_CACHE_NAME).then((c) => c.put(e.request, r.clone()));
              }
            })
            .catch(() => {})
        );
        return cached;
      }
      return fetch(e.request)
        .then((r) => {
          if (r && r.ok && e.request.url.startsWith(self.location.origin)) {
            const cl = r.clone();
            caches.open(FX_CACHE_NAME).then((c) => c.put(e.request, cl));
          }
          return r;
        })
        .catch(() => cached);
    })
  );
});
