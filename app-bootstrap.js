(() => {
  "use strict";
  let started = false;
  async function start() {
    if (started || !window.__CW_AUTH_OK) return;
    started = true;
    window.CWSession.installFetchAuth();
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
    scripts.push(
      "./geo-throttle.js?v=4",
      "./app-v4.js?v=4",
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