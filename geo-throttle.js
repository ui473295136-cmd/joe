(() => {
  if (window.CWSession?.qa === true)
    window.TEAM = ["瑞子", "普子", "航子", "辉子"];
  try {
    const g = navigator.geolocation;
    if (g && !g.__cwThrottle) {
      const raw = g.watchPosition.bind(g);
      g.watchPosition = (ok, err, opt) => {
        let lastT = 0,
          last = null;
        return raw(
          (p) => {
            const now = Date.now(),
              lat = p.coords.latitude,
              lon = p.coords.longitude;
            let moved = Infinity;
            if (last) {
              const dy = (lat - last[0]) * 111000,
                dx = (lon - last[1]) * 111000 * Math.cos((lat * Math.PI) / 180);
              moved = Math.hypot(dx, dy);
            }
            if (now - lastT < 4000 && moved < 15) return;
            lastT = now;
            last = [lat, lon];
            ok(p);
          },
          err,
          opt,
        );
      };
      g.__cwThrottle = 1;
    }
  } catch (e) {}
  try {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    if (d?.get && d?.set && !window.__cwTileHtmlGuard) {
      Object.defineProperty(Element.prototype, "innerHTML", {
        configurable: true,
        enumerable: d.enumerable,
        get: d.get,
        set: function (v) {
          if (
            this?.id === "tileGrid" ||
            this?.classList?.contains("cw-reactions")
          ) {
            if (this.__cwLastTileHtml === v) return;
            this.__cwLastTileHtml = v;
          }
          return d.set.call(this, v);
        },
      });
      window.__cwTileHtmlGuard = 1;
    }
  } catch (e) {}
  function style(href, mark) {
    if (
      document.querySelector(`link[data-${mark}]`) ||
      [...document.querySelectorAll("link[rel=stylesheet]")].some(
        (l) => new URL(l.href).pathname === new URL(href, location.href).pathname,
      )
    ) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.dataset[mark.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "1";
    document.head.appendChild(l);
  }
  function script(src, mark) {
    if (document.querySelector(`script[data-${mark}]`)) return;
    const s = document.createElement("script");
    s.src = src;
    s.dataset[mark.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "1";
    s.async = false;
    document.body.appendChild(s);
  }
  function loadExtras() {
    style("./minimal-v1.css?v=2", "cw-minimal-style");
    style("./profile-sync-v2.css?v=3", "cw-profile-style");
    style("./itinerary-live-v1.css?v=1", "cw-itinerary-style");
    style("./daily-card-v1.css?v=2", "cw-daily-style");
    style("./travel-assist-v1.css?v=1", "cw-travel-assist-style");
    style("./social-v1.css?v=2", "cw-social-style");
    style("./driver-fun-v2.css?v=1", "cw-driver-fun-style");
    style("./avatar-interactions-v1.css?v=1", "cw-avatar-play-style");
    style("./trip-stage-v2.css?v=1", "cw-trip-stage-style");
    style("./ledger-v2.css?v=1", "cw-ledger-v2-style");
    script("./time-compat-v1.js?v=1", "cw-time-compat");
    script("./minimal-v1.js?v=3", "cw-minimal");
    script("./profile-sync-v2.js?v=4", "cw-profile");
    script("./admin-switch-v1.js?v=1", "cw-admin-switch");
    script("./ledger-ack-v1.js?v=1", "cw-ledger-ack");
    script("./itinerary-live-v1.js?v=2", "cw-itinerary");
    script("./daily-card-v1.js?v=3", "cw-daily");
    script("./travel-assist-v1.js?v=1", "cw-travel-assist");
    script("./travel-assist-dayfix-v1.js?v=1", "cw-travel-assist-dayfix");
    script("./map-state-guard-v1.js?v=1", "cw-map-state-guard");
    if (window.CWSession?.qa) {
      script("./social-qa-mock-v1.js?v=2", "cw-social-qa");
      script("./avatar-interactions-qa-mock-v1.js?v=1", "cw-avatar-play-qa");
    }
    script("./social-v1.js?v=2", "cw-social");
    script("./driver-fun-v2.js?v=1", "cw-driver-fun");
    script("./avatar-interactions-v1.js?v=1", "cw-avatar-play");
    script("./trip-stage-v2.js?v=1", "cw-trip-stage");
    script("./itinerary-header-sync-v1.js?v=1", "cw-itinerary-heading");
    script("./ledger-v2.js?v=1", "cw-ledger-v2");
  }
  if (document.readyState === "complete") setTimeout(loadExtras, 40);
  else
    window.addEventListener("load", () => setTimeout(loadExtras, 40), { once: true });
})();