(() => {
  "use strict";
  let started = false;
  function suppressPhotoInspiration() {
    if (!document.getElementById("cwPhotoInspirationOff")) {
      const style = document.createElement("style");
      style.id = "cwPhotoInspirationOff";
      style.textContent = "#cwInspiration{display:none!important}";
      document.head.appendChild(style);
    }
    const remove = () => document.getElementById("cwInspiration")?.remove();
    remove();
    const observer = new MutationObserver(remove);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  async function start() {
    if (started || !window.__CW_AUTH_OK) return;
    started = true;
    window.CWSession.installFetchAuth();
    suppressPhotoInspiration();
    window.__cwErrors = [];
    addEventListener("error", (e) =>
      window.__cwErrors.push(String(e.message || "资源加载失败")),
    );
    addEventListener("unhandledrejection", (e) =>
      window.__cwErrors.push(String(e.reason?.message || e.reason)),
    );
    if (!window.CWSession.qa && "serviceWorker" in navigator)
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    const scripts = ["./offline-v1.js?v=1", "./avatars.js?v=7"];
    if (window.CWSession.qa) scripts.push("./qa-mock.js?v=3");
    scripts.push("./geo-throttle.js?v=6");
    if (window.CWSession.isGuest?.()) scripts.push("./guest-mode-v1.js?v=2");
    scripts.push(
      "./app-v4.js?v=4",
      "./ledger-detail-v3.js?v=1",
      "./ledger-settlement-v4.js?v=1",
      "./sync-hub-v1.js?v=1",
      "./profile-display-v1.js?v=1",
      "./ledger-related-focus-v1.js?v=1",
      "./daily-rhythm-v1.js?v=1",
      "./structured-clone-compat-v1.js?v=1",
      "./itinerary-admin-v1.js?v=1",
      "./itinerary-dynamic-guard-v1.js?v=2",
      "./map-open-watchdog-v1.js?v=1",
      "./map-v5.js?v=2",
      "./interaction-ux.js?v=1",
    );
    if (window.CWSession.qa && new URLSearchParams(location.search).has("probe"))
      scripts.push("./qa-probe.js?v=2");
    try {
      for (const src of scripts)
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = false;
          script.onload = resolve;
          script.onerror = () => reject(new Error("页面组件加载失败"));
          document.body.appendChild(script);
        });
    } catch {
      const boot = document.getElementById("boot");
      boot.classList.remove("hide");
      boot.innerHTML =
        '<b>页面组件暂未加载完成</b><span>请检查网络后重试</span><button class="primary" type="button" id="bootRetry">重新加载</button>';
      document.getElementById("bootRetry").onclick = () => location.reload();
    }
  }
  if (window.__CW_AUTH_OK) start();
  else window.addEventListener("cw-auth-ready", start, { once: true });
})();