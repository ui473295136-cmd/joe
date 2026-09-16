(() => {
  "use strict";
  const qs = new URLSearchParams(location.search);
  if (qs.get("guest") !== "1") return;
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  document.documentElement.classList.add("cw-guest-mode");
  window.CWGuest = { active: true, readOnly: true };

  try {
    const g = navigator.geolocation;
    if (g) {
      g.watchPosition = () => 0;
      g.getCurrentPosition = (_ok, fail) =>
        setTimeout(
          () =>
            fail?.({ code: 1, message: "访客模式不读取访客位置" }),
          0,
        );
      g.clearWatch = () => {};
    }
  } catch {}

  const style = document.createElement("style");
  style.id = "cwGuestStyle";
  style.textContent = `
html.cw-guest-mode body{padding-top:46px}
.cw-guest-banner{position:fixed;z-index:900;top:0;left:0;right:0;min-height:46px;padding:8px max(12px,env(safe-area-inset-left));display:flex;align-items:center;justify-content:center;gap:10px;background:#073b55;color:#fff;box-shadow:0 2px 12px rgba(0,24,36,.2);font-size:12px}
.cw-guest-banner b{font-size:13px}.cw-guest-banner span{color:#b9d5dd}.cw-guest-banner button{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:6px 10px;font-weight:800;font-size:11px}
.cw-guest-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;background:#e9f6f3;color:#176c62;font-size:10px;font-weight:900}
.cw-guest-pill:before{content:"";width:6px;height:6px;border-radius:50%;background:#2e9d84;box-shadow:0 0 0 3px rgba(46,157,132,.12)}
html.cw-guest-mode #expenseForm,
html.cw-guest-mode #bookingForm,
html.cw-guest-mode .upload-row,
html.cw-guest-mode .profile-card,
html.cw-guest-mode #sessionSettings,
html.cw-guest-mode #switchIdentity,
html.cw-guest-mode #pendingBadge,
html.cw-guest-mode #navBadge,
html.cw-guest-mode #cwAckAll,
html.cw-guest-mode .ledger-actions,
html.cw-guest-mode #cwMyStatus,
html.cw-guest-mode #cwReadyToggle,
html.cw-guest-mode #cwTakeWheel,
html.cw-guest-mode .cw-play-grid,
html.cw-guest-mode [data-nudge-to],
html.cw-guest-mode [data-play-response],
html.cw-guest-mode [data-progress-action],
html.cw-guest-mode [data-task-action],
html.cw-guest-mode [data-driver-edit],
html.cw-guest-mode [data-driver-delete],
html.cw-guest-mode #cwDailyCard,
html.cw-guest-mode #homeMoney,
html.cw-guest-mode #personalTips{display:none!important}
html.cw-guest-mode #settlementLines,html.cw-guest-mode #meMoney{display:none!important}
html.cw-guest-mode .ledger-item{cursor:default}
.cw-guest-money{display:grid;gap:8px;margin:10px 0}.cw-guest-money-row{display:grid;grid-template-columns:minmax(70px,1fr) repeat(2,minmax(82px,auto));gap:8px;align-items:center;padding:10px 11px;border:1px solid #dfe9eb;border-radius:12px;background:#fbfdfd}.cw-guest-money-row b{font-size:13px;color:#173f50}.cw-guest-money-row span{font-size:11px;color:#6d838c;text-align:right}.cw-guest-money-row strong{color:#0b6078;font-size:12px}
@media(max-width:420px){.cw-guest-banner{justify-content:space-between}.cw-guest-banner span{display:none}.cw-guest-money-row{grid-template-columns:1fr 1fr}.cw-guest-money-row b{grid-column:1/-1}.cw-guest-money-row span{text-align:left}}
`;
  document.head.appendChild(style);

  const mutatingSelector = [
    "#saveProfile",
    "#changeAvatar",
    "#uploadPhotos",
    "#cwMyStatus",
    "#cwReadyToggle",
    "#cwTakeWheel",
    "#cwAckAllBtn",
    "#cwApproveAllBtn",
    "[data-ledger]",
    "[data-photo-del]",
    "[data-play-to]",
    "[data-play-response]",
    "[data-nudge-to]",
    "[data-progress-action]",
    "[data-task-action]",
    "[data-driver-edit]",
    "[data-driver-delete]",
  ].join(",");
  let ledgerRetry = 0;

  function toast(text) {
    const t = document.querySelector("#toast");
    if (!t) return;
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(t._cwGuest);
    t._cwGuest = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function exitGuest() {
    try {
      window.CWSession?.forget?.(window.CWSession.GUEST);
      window.CWSession?.restoreGuestShadow?.();
    } catch {}
    location.href = "./?choose=1";
  }
  function ensureBanner() {
    if (document.querySelector("#cwGuestBanner")) return;
    const e = document.createElement("div");
    e.id = "cwGuestBanner";
    e.className = "cw-guest-banner";
    e.innerHTML =
      '<b>访客模式 · 只读浏览</b><span>与成员端同步更新，不能添加、修改或删除任何数据</span><button type="button" id="cwGuestExit">退出访客</button>';
    document.body.prepend(e);
    e.querySelector("#cwGuestExit").onclick = exitGuest;
  }
  function money(n) {
    return (
      "¥" +
      Number(n || 0).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  function name(p) {
    return window.CWProfiles?.get?.(p)?.nickname || p;
  }
  function renderMoneyOverview() {
    const title = [...document.querySelectorAll("#view-me h2")].find((x) =>
      /账本汇总|共享账本|四人账本概览/.test(x.textContent || ""),
    );
    const card = title?.closest(".card");
    if (!card || !window.CWLedgerV2?.summary) return;
    title.textContent = "四人账本概览";
    let host = card.querySelector("#cwGuestMoneyOverview");
    if (!host) {
      host = document.createElement("div");
      host.id = "cwGuestMoneyOverview";
      host.className = "cw-guest-money";
      card.appendChild(host);
    }
    host.innerHTML = TEAM.map((p) => {
      const s = window.CWLedgerV2.summary(p) || {};
      return `<div class="cw-guest-money-row"><b>${name(p)}</b><span>该收 <strong>${money(s.getTotal)}</strong></span><span>该付 <strong>${money(s.oweTotal)}</strong></span></div>`;
    }).join("");
  }
  function forceAllLedger() {
    const all = document.querySelector('[data-ledgerview="all"]');
    if (all?.classList.contains("on")) {
      ledgerRetry = 0;
      return true;
    }
    if (all) all.click();
    if (ledgerRetry < 30) {
      ledgerRetry++;
      setTimeout(forceAllLedger, 100);
    }
    return false;
  }
  function applyReadOnlyCopy() {
    ensureBanner();
    const h = document.querySelector("#helloName"),
      r = document.querySelector("#helloRole"),
      sub = document.querySelector("#topSub"),
      meTitle = document.querySelector("#view-me .page-title h1"),
      meP = document.querySelector("#view-me .page-title p"),
      nav = document.querySelector('#bottomNav button[data-view="me"]'),
      gps = document.querySelector("#gpsStatus"),
      place = document.querySelector("#nowPlace");
    if (h) h.textContent = "访客浏览 · 四人实时行程";
    if (r) r.innerHTML = '<span class="cw-guest-pill">实时只读</span>';
    if (sub) sub.textContent = "访客模式 · 四人实时数据";
    if (meTitle) meTitle.textContent = "共享账本";
    if (meP) meP.textContent = "只读查看全部账单与四人结算，不可新增、修改或删除";
    if (nav && !/账本/.test(nav.textContent || "")) nav.innerHTML = '<span>¥</span>账本';
    if (gps) gps.textContent = "访客只读";
    if (place && /等待定位|请允许/.test(place.textContent || ""))
      place.textContent = "查看成员实时信息";
    const personal = document.querySelector("#personalTips")?.closest("section.card");
    if (personal) personal.style.display = "none";
    const dailyLegacy = document.querySelector("#editOverlay.show #editTitle");
    if (dailyLegacy?.textContent.includes("今天先看这些"))
      document.querySelector("#editOverlay")?.classList.remove("show");
    forceAllLedger();
    renderMoneyOverview();
  }

  document.addEventListener(
    "submit",
    (e) => {
      if (!e.target.closest("form")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      toast("访客模式只能查看，不能新增或修改内容");
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target.closest?.(mutatingSelector);
      if (target) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast("访客模式只能查看，不能新增、修改、删除或确认");
        return;
      }
      if (e.target.closest?.('#bottomNav button[data-view="me"]')) {
        ledgerRetry = 0;
        setTimeout(forceAllLedger, 40);
      }
    },
    true,
  );
  window.addEventListener("cw:state", () => {
    ledgerRetry = 0;
    setTimeout(applyReadOnlyCopy, 20);
  });
  window.addEventListener("cw:profiles", () => setTimeout(applyReadOnlyCopy, 20));
  window.addEventListener("load", () => {
    ledgerRetry = 0;
    setTimeout(forceAllLedger, 120);
  });
  new MutationObserver(() => {
    clearTimeout(window.__cwGuestPaint);
    window.__cwGuestPaint = setTimeout(applyReadOnlyCopy, 25);
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", applyReadOnlyCopy, { once: true });
  else applyReadOnlyCopy();
  setInterval(() => {
    if (!document.hidden) {
      forceAllLedger();
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(
        new CustomEvent("cw:sync-pulse", {
          detail: { reason: "guest-live-refresh", at: Date.now() },
        }),
      );
    }
  }, 5000);
})();