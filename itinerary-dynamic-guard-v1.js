(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  function style() {
    if ($("#cwItineraryLegacyGuard")) return;
    const s = document.createElement("style");
    s.id = "cwItineraryLegacyGuard";
    s.textContent = "#cwRoutePanel,#cwSelectedWeather,.cw-daywx{display:none!important}";
    document.head.appendChild(s);
  }
  function purgeLegacy() {
    $("#cwRoutePanel")?.remove();
    $("#cwSelectedWeather")?.remove();
    document.querySelectorAll(".cw-daywx").forEach((n) => n.remove());
  }
  function init() {
    style();
    purgeLegacy();
    new MutationObserver((muts) => {
      if (muts.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.("#cwRoutePanel,#cwSelectedWeather,.cw-daywx") || n.querySelector?.("#cwRoutePanel,#cwSelectedWeather,.cw-daywx"))))) {
        queueMicrotask(purgeLegacy);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();