(() => {
  "use strict";
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest?.("#openMapBtn,#quickMapBtn")) return;
      setTimeout(() => {
        const root = document.querySelector("#fullMap");
        if (!root || root.dataset.mapState !== "loading") return;
        root.dataset.mapState = "fallback";
        document.querySelector("#cwMapFallback")?.classList.add("show");
        const status = document.querySelector("#fullMapStatus");
        if (status)
          status.textContent = "地图加载较慢，已自动切换备用底图；定位仍可使用";
      }, 2400);
    },
    true,
  );
})();
