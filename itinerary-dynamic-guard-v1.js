(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let repaintTimer = null, bound = false;
  function style() {
    if ($("#cwItineraryLegacyGuard")) return;
    const s = document.createElement("style");
    s.id = "cwItineraryLegacyGuard";
    s.textContent = "#cwRoutePanel,#cwSelectedWeather{display:none!important}";
    document.head.appendChild(s);
  }
  function today() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  }
  function dateTitle(d, days) {
    const now = today(), first = days[0]?.day_date, last = days.at(-1)?.day_date;
    if (last && now > last) return "行程回顾";
    const md = String(d.day_date).slice(5).replace("-", "月") + "日";
    if (first && now < first) return `${md} · 行程计划`;
    if (d.day_date === now) return `${md} · 今日行程`;
    if (d.day_date > now) return `${md} · 后续行程`;
    return `${md} · 已完成行程`;
  }
  function header() {
    const api = window.CWItinerary, box = $("#simpleItinerary");
    if (!api || !box) return;
    const days = api.getDays?.() || [],
      i = Number(box.querySelector(".day-chip.on")?.dataset.day || 0),
      d = api.getDay(i);
    if (!d) return;
    const title = $("#view-today .page-title h1"), p = $("#view-today .page-title p");
    if (title) title.textContent = dateTitle(d, days);
    if (p) p.textContent = `${d.route_label}｜约 ${Number(d.distance_km || 0).toFixed(1)}km｜驾驶约 ${fmt(d.drive_minutes)}｜住宿：${d.hotel_name || "未设置"}`;
  }
  function fmt(m) { m = Math.max(0, Math.round(Number(m || 0))); return m < 60 ? `${m}分钟` : `${Math.floor(m / 60)}小时${m % 60 ? `${m % 60}分` : ""}`; }
  function repaint() {
    clearTimeout(repaintTimer);
    repaintTimer = setTimeout(() => {
      if (!window.CWItinerary || !$("#simpleItinerary")) return;
      window.CWItinerary.setDaysForTest(window.CWItinerary.getDays());
      header();
    }, 60);
  }
  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", (e) => {
      if (e.target.closest?.("#simpleItinerary [data-day]")) {
        e.stopImmediatePropagation();
        setTimeout(header, 80);
      }
    }, true);
    window.addEventListener("cw:itinerary", () => setTimeout(header, 40));
    new MutationObserver((muts) => {
      if (muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.("#cwRoutePanel,#cwSelectedWeather,#cwDailySummary") || n.querySelector?.("#cwRoutePanel,#cwSelectedWeather,#cwDailySummary"))))) repaint();
    }).observe(document.documentElement, {childList:true, subtree:true});
  }
  style();
  setTimeout(() => { bind(); header(); }, 320);
})();