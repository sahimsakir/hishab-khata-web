/* Only public installation assets are cached. API/auth requests always use the network. */
const CACHE = "hishabkhata-install-v2";
const PUBLIC_FILES = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192-v2.png", "/icons/icon-512-v2.png", "/icons/maskable-512-v2.png", "/icons/apple-touch-icon-v2.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith("hishabkhata-install-") && key !== CACHE)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin ||
      url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE)
      .then((cache) => cache.match("/offline.html"))));
  } else if (PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      (await cache.match(event.request)) || fetch(event.request)));
  }
});
