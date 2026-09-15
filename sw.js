const CACHE = "chuanxi-2026-v43";
const CORE = [
  "./",
  "./index.html",
  "./login.js",
  "./session-store.js",
  "./app-bootstrap.js",
  "./app-v4.html",
  "./app-v4.css",
  "./app-v4.js",
  "./auth-guard.js",
  "./geo-throttle.js",
  "./time-compat-v1.js",
  "./minimal-v1.css",
  "./minimal-v1.js",
  "./profile-sync-v2.css",
  "./profile-sync-v2.js",
  "./admin-switch-v1.js",
  "./ledger-ack-v1.js",
  "./itinerary-live-v1.css",
  "./itinerary-live-v1.js",
  "./daily-card-v1.css",
  "./daily-card-v1.js",
  "./travel-assist-v1.css",
  "./travel-assist-v1.js",
  "./travel-assist-dayfix-v1.js",
  "./trip-stage-v2.css",
  "./trip-stage-v2.js",
  "./map-state-guard-v1.js",
  "./social-v1.css",
  "./social-v1.js",
  "./driver-fun-v2.css",
  "./driver-fun-v2.js",
  "./avatar-interactions-v1.css",
  "./avatar-interactions-v1.js",
  "./map-v5.css",
  "./map-v5.js",
  "./ux-v5.css",
  "./decision-v1.css",
  "./interaction-ux.css",
  "./interaction-ux.js",
  "./avatars.js",
  "./manifest.webmanifest",
  "./icon.svg",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("chuanxi-2026-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  const navigation = event.request.mode === "navigate";
  if (
    !navigation &&
    !["script", "style", "image", "manifest"].includes(
      event.request.destination,
    ) &&
    !url.pathname.endsWith("/road-routes.json")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = new Request(url.origin + url.pathname);
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(key, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(key);
        if (cached) return cached;
        if (navigation) {
          const fallback = await cache.match(
            url.pathname.endsWith("/app-v4.html")
              ? "./app-v4.html"
              : "./index.html",
          );
          if (fallback) return fallback;
        }
        throw error;
      }
    })(),
  );
});