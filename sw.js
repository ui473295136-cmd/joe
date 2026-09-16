const CACHE = "chuanxi-2026-v59-itinerary-switch";
const RUNTIME = "chuanxi-2026-runtime-v3";
const CORE = [
  "./",
  "./index.html",
  "./login.js",
  "./session-store.js",
  "./app-bootstrap.js",
  "./offline-v1.js",
  "./remove-photo-inspiration.js",
  "./app-v4.html",
  "./app-v4.css",
  "./app-v4.js",
  "./guest-mode-v1.js",
  "./ledger-detail-v3.js",
  "./ledger-settlement-v4.js",
  "./ledger-related-focus-v1.js",
  "./daily-rhythm-v1.js",
  "./structured-clone-compat-v1.js",
  "./itinerary-admin-v1.js",
  "./itinerary-dynamic-guard-v1.js",
  "./sync-hub-v1.js",
  "./profile-display-v1.js",
  "./map-open-watchdog-v1.js",
  "./auth-guard.js",
  "./geo-throttle.js",
  "./time-compat-v1.js",
  "./minimal-v1.css",
  "./minimal-v1.js",
  "./profile-sync-v2.css",
  "./profile-sync-v2.js",
  "./admin-switch-v1.js",
  "./ledger-ack-v1.js",
  "./ledger-v2.css",
  "./ledger-v2.js",
  "./itinerary-live-v1.css",
  "./itinerary-live-v1.js",
  "./daily-card-v1.css",
  "./daily-card-v1.js",
  "./daily-finance-pairwise-v1.js",
  "./travel-assist-v1.css",
  "./travel-assist-v1.js",
  "./travel-assist-dayfix-v1.js",
  "./trip-stage-v2.css",
  "./trip-stage-v2.js",
  "./stage-tag-guard-v1.js",
  "./trip-stage-card-guard-v1.js",
  "./itinerary-header-sync-v1.js",
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
  "./road-routes.json",
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
            .filter(
              (key) =>
                key.startsWith("chuanxi-2026-") &&
                key !== CACHE &&
                key !== RUNTIME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

async function trim(cache, max = 420) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    trim(cache).catch(() => {});
  }
  return response;
}

async function networkFirstRuntime(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      await cache.put(request, response.clone());
      trim(cache).catch(() => {});
    }
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const navigation = event.request.mode === "navigate";

  if (url.origin !== location.origin) {
    const isMapTile =
      /autonavi\.com$/.test(url.hostname) ||
      /geoq\.cn$/.test(url.hostname);
    const isWeather = url.hostname === "api.open-meteo.com";
    const isTripAsset =
      url.hostname.endsWith("supabase.co") ||
      url.hostname.endsWith("supabase.in");
    if (isMapTile || isTripAsset) {
      event.respondWith(cacheFirst(event.request));
      return;
    }
    if (isWeather) {
      event.respondWith(networkFirstRuntime(event.request));
      return;
    }
    return;
  }

  if (
    !navigation &&
    !["script", "style", "image", "manifest", "font"].includes(
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