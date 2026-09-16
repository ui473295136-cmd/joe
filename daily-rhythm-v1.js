(() => {
  "use strict";
  const qs = new URLSearchParams(location.search);
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME = qs.get("person") || localStorage.getItem("cw-person") || "瑞子";
  if (!TEAM.includes(ME)) return;
  const IS_GUEST = qs.get("guest") === "1";
  const AUTH_PERSON = IS_GUEST ? "访客" : ME;
  const ENDPOINT =
    "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-day-summary";
  const TRIP = "chuanxi2026";
  const DAYS = [
    {
      date: "2026-10-02",
      route: "天府机场 → 雅安",
      km: 190,
      drive: "3小时45分",
      first: "16:00 落地后取车",
      risk: "第一天不要赶景点，重点是取车验车、补给和保证睡眠。",
    },
    {
      date: "2026-10-03",
      route: "雅安 → 泸定 → 康定 → 折多山 → 新都桥",
      km: 280,
      drive: "7小时15分",
      first: "06:00 从雅安出发",
      risk: "折多山海拔约4298m，短停、少剧烈运动；康定或新都桥及时补油。",
    },
    {
      date: "2026-10-04",
      route: "新都桥 → 塔公 → 八美 → 丹巴中路藏寨",
      km: 160,
      drive: "4小时30分",
      first: "07:00 新都桥出发",
      risk: "沿途边走边玩，只在正规停车区停车；注意高原紫外线和道路弯道。",
    },
    {
      date: "2026-10-05",
      route: "丹巴 → 小金 → 四姑娘山双桥沟",
      km: 120,
      drive: "3小时30分",
      first: "06:30 丹巴出发",
      risk: "双桥沟深处海拔高，不必每站都下车；按身体状态控制步行量并提前补油。",
    },
    {
      date: "2026-10-06",
      route: "四姑娘山 → 卧龙 → 映秀 → 都江堰 → 天府机场",
      km: 285,
      drive: "9小时",
      first: "05:30 必须出发",
      risk: "返程优先级最高；都江堰到机场预留2–3小时拥堵缓冲，延误就取消停留。",
    },
    {
      date: "2026-10-07",
      route: "机场酒店 → 还车 → 航站楼",
      km: 12,
      drive: "约30分钟",
      first: "05:15 起床，05:40退房",
      risk: "先补油再还车，保留还车照片；07:00前进入机场办理值机。",
    },
  ];
  const PERSONAL = {
    瑞子: [
      "确认今晚住宿和入住方式。",
      "关注大家状态并确认新都桥入住。",
      "确认中路藏寨停车与入住。",
      "确认四姑娘山住宿最终订单。",
      "确认机场酒店并同步返程安排。",
      "核对退房、票据和最终账本。",
    ],
    普子: [
      "盯机场到雅安路况。",
      "复核泸定—康定—折多山路况和天气。",
      "复核塔公—八美—丹巴道路。",
      "确认双桥沟开放和预约。",
      "盯导航拥堵，必要时建议取消停留。",
      "确认还车点到航站楼动线。",
    ],
    航子: [
      "确认四个人行李齐全。",
      "提醒补水保暖并关注设备电量。",
      "关注天气、证件和设备。",
      "景区准备水和充电宝。",
      "关注返程航班动态。",
      "确认值机和航班。",
    ],
    辉子: [
      "取车验车并拍照。",
      "关注油量、胎压并及时加油。",
      "每2小时确认油量胎压和休息。",
      "丹巴/小金及时补油。",
      "05:30准时出发并补油。",
      "按规则还车并留存照片。",
    ],
  };
  const $ = (s) => document.querySelector(s);
  let lastKey = "",
    currentRequest = 0,
    paintTimer = null;

  function cnDate() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  }
  function cnHM() {
    return new Date().toLocaleTimeString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  function fmtClock(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  function fmtMinutes(m) {
    const min = Math.max(0, Math.round(Number(m || 0)));
    if (min < 60) return `${min}分钟`;
    return `${Math.floor(min / 60)}小时${min % 60 ? `${min % 60}分` : ""}`;
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[m]);
  }
  function selectedIndex() {
    const v = Number($("#simpleItinerary .day-chip.on")?.dataset.day);
    if (Number.isInteger(v) && v >= 0 && v < DAYS.length) return v;
    const today = cnDate(), i = DAYS.findIndex((d) => d.date === today);
    if (i >= 0) return i;
    return today < DAYS[0].date ? 0 : DAYS.length - 1;
  }
  function modeFor(day) {
    const today = cnDate();
    if (day.date < today) return "summary";
    if (day.date > today) return "preview";
    const hm = cnHM();
    if (hm < "05:00") return "waiting";
    if (hm < "20:00") return "notice";
    return "summary";
  }
  function token() {
    return (
      window.CWSession?.get?.(AUTH_PERSON)?.token ||
      sessionStorage.getItem(`cw-auth-${AUTH_PERSON}`) ||
      ""
    );
  }
  function xhrSummary(date) {
    const tk = token();
    if (!tk) return Promise.reject(new Error("登录已失效"));
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.timeout = 10000;
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onload = () => {
        let body = {};
        try { body = JSON.parse(xhr.responseText || "{}"); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(body.summary || null);
        else reject(new Error(body.error || "总结加载失败"));
      };
      xhr.onerror = () => reject(new Error("网络暂不可用"));
      xhr.ontimeout = () => reject(new Error("总结加载超时"));
      xhr.send(JSON.stringify({
        trip_slug: TRIP,
        action: "state",
        payload: { person: AUTH_PERSON, token: tk, date },
      }));
    });
  }
  function ensureStyle() {
    if ($("#cwDailyRhythmStyle")) return;
    const s = document.createElement("style");
    s.id = "cwDailyRhythmStyle";
    s.textContent = `
#cwDailySummary.cw-rhythm{overflow:hidden}#cwDailySummary.cw-rhythm>summary{align-items:center}#cwDailySummary.cw-rhythm>summary div{display:grid;gap:2px}#cwDailySummary.cw-rhythm>summary b{font-size:14px}#cwDailySummary.cw-rhythm>summary span{font-size:10px;color:#71858d}
.cw-rhythm-body{display:grid;gap:9px;padding:12px 0 2px}.cw-rhythm-line{display:grid;grid-template-columns:82px 1fr;gap:10px;align-items:start;padding:10px 11px;border-radius:12px;background:#f7fafb}.cw-rhythm-line span{font-size:10px;color:#71858d}.cw-rhythm-line b{font-size:12px;color:#173f50;line-height:1.55}.cw-rhythm-line.warn{background:#fff4ef}.cw-rhythm-line.warn b{color:#9f432e}.cw-rhythm-line.ok{background:#eef7f5}.cw-rhythm-line.ok b{color:#176c62}.cw-rhythm-note{font-size:10px;line-height:1.55;color:#7a8c93;padding:2px 2px 5px}.cw-rhythm-badge{display:inline-flex!important;align-items:center;gap:5px;width:max-content;padding:4px 7px;border-radius:999px;background:#eaf4f7;color:#0b6078!important;font-size:9px!important;font-weight:900}.cw-rhythm-badge:before{content:"";width:6px;height:6px;border-radius:50%;background:#0b6078}.cw-rhythm-badge.summary{background:#eaf6ef;color:#176c62!important}.cw-rhythm-badge.summary:before{background:#2b927c}.cw-rhythm-loading{padding:14px 2px;color:#73868e;font-size:11px}
`;
    document.head.appendChild(s);
  }
  function extractBaseStats(card) {
    const out = {};
    card?.querySelectorAll?.(".cw-summary-body > div").forEach((row) => {
      const k = row.querySelector("span")?.textContent?.trim();
      const v = row.querySelector("b")?.textContent?.trim();
      if (k && v) out[k] = v;
    });
    return out;
  }
  function wrap(card, title, sub, cls = "") {
    card.classList.add("cw-rhythm");
    card.open = true;
    card.innerHTML = `<summary><div><b>${esc(title)}</b><span>${esc(sub)}</span></div><span class="cw-rhythm-badge ${cls}">${cls === "summary" ? "20:00 总结" : "05:00 提醒"}</span></summary><div class="cw-rhythm-body" id="cwRhythmBody"></div>`;
    return card.querySelector("#cwRhythmBody");
  }
  function renderNotice(card, day, di, preview = false) {
    const title = preview ? "出发前注意事项" : "今日注意事项";
    const sub = preview ? `${day.date} · 提前预览` : "每天 05:00 自动切换为当天提醒";
    const body = wrap(card, title, sub);
    const personal = IS_GUEST ? "访客只读查看，不需要执行成员操作。" : PERSONAL[ME]?.[di] || "";
    body.innerHTML = `
      <div class="cw-rhythm-line"><span>今日路线</span><b>${esc(day.route)}</b></div>
      <div class="cw-rhythm-line"><span>计划强度</span><b>约 ${day.km} km · 驾驶 ${esc(day.drive)}</b></div>
      <div class="cw-rhythm-line ok"><span>关键时间</span><b>${esc(day.first)}</b></div>
      <div class="cw-rhythm-line warn"><span>今天注意</span><b>${esc(day.risk)}</b></div>
      <div class="cw-rhythm-line"><span>${IS_GUEST ? "浏览说明" : "我的事项"}</span><b>${esc(personal)}</b></div>
      <div class="cw-rhythm-note">05:00 后显示当天注意事项；20:00 后同一位置会自动切换成当天总结。</div>`;
  }
  function renderWaiting(card, day) {
    const body = wrap(card, "今日注意事项", "05:00 自动更新当天事项");
    body.innerHTML = `<div class="cw-rhythm-line"><span>今天路线</span><b>${esc(day.route)}</b></div><div class="cw-rhythm-line ok"><span>自动切换</span><b>05:00 后显示今天的完整注意事项</b></div><div class="cw-rhythm-note">20:00 后会自动生成当天经过地点、里程和驾驶时长总结。</div>`;
  }
  async function renderSummary(card, day, baseStats) {
    const body = wrap(card, "今日总结", `${day.date} · 20:00 后自动生成`, "summary");
    body.innerHTML = '<div class="cw-rhythm-loading">正在汇总今天的路线、里程和驾驶时间…</div>';
    const id = ++currentRequest;
    try {
      const s = await xhrSummary(day.date);
      if (id !== currentRequest || !document.contains(card)) return;
      const places = s?.places?.length ? s.places.join(" → ") : "暂时没有足够的路线记录";
      const km = Number(s?.distance_km || 0);
      const drive = Number(s?.drive_minutes || 0);
      const source = s?.source === "GPS轨迹" ? "GPS轨迹自动统计" : "按已记录节点估算";
      const finance = baseStats["当天记账"] || "—";
      const photos = baseStats["上传照片"] || "—";
      body.innerHTML = `
        <div class="cw-rhythm-line ok"><span>今天经过</span><b>${esc(places)}</b></div>
        <div class="cw-rhythm-line"><span>行驶里程</span><b>${km > 0 ? `约 ${km.toFixed(1)} km` : "暂无有效里程"}</b></div>
        <div class="cw-rhythm-line"><span>驾驶时长</span><b>${drive > 0 ? fmtMinutes(drive) : "暂无有效驾驶时长"}</b></div>
        <div class="cw-rhythm-line"><span>移动时间</span><b>${fmtClock(s?.first_move_at)} → ${fmtClock(s?.last_move_at)}</b></div>
        <div class="cw-rhythm-line"><span>当天记账</span><b>${esc(finance)}</b></div>
        <div class="cw-rhythm-line"><span>上传照片</span><b>${esc(photos)}</b></div>
        <div class="cw-rhythm-note">${esc(source)} · GPS有效采样 ${Number(s?.gps_samples || 0)} 个。轨迹不足时不会冒充真实里程，会明确显示为节点估算。</div>`;
    } catch (e) {
      if (id !== currentRequest || !document.contains(card)) return;
      body.innerHTML = `<div class="cw-rhythm-line warn"><span>总结状态</span><b>${esc(e.message || "暂时无法生成")}</b></div><div class="cw-rhythm-note">网络恢复后会自动重新汇总，不影响原始行程记录。</div>`;
    }
  }
  function paint(force = false) {
    clearTimeout(paintTimer);
    paintTimer = setTimeout(() => {
      ensureStyle();
      const card = $("#cwDailySummary");
      if (!card) return;
      const di = selectedIndex(), day = DAYS[di], mode = modeFor(day);
      if (!day) return;
      const key = `${day.date}|${mode}`;
      if (!force && card.dataset.cwRhythmKey === key && card.querySelector("#cwRhythmBody")) return;
      const baseStats = extractBaseStats(card);
      card.dataset.cwRhythmKey = key;
      if (mode === "summary") renderSummary(card, day, baseStats);
      else if (mode === "waiting") renderWaiting(card, day);
      else renderNotice(card, day, di, mode === "preview");
    }, 80);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest?.("#simpleItinerary .day-chip")) {
      setTimeout(() => paint(true), 100);
      setTimeout(() => paint(true), 300);
    }
  });
  window.addEventListener("focus", () => paint(true));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) paint(true);
  });
  new MutationObserver(() => paint(false)).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setInterval(() => paint(true), 30000);
  paint(true);
})();