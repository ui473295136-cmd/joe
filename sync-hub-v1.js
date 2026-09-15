(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person") ||
    "";
  if (!TEAM.includes(ME)) return;
  const QA = window.CWSession?.qa === true;
  const TRIP = "chuanxi2026";
  const ORIGIN = "https://wpfqcztbxxarsrruuuce.supabase.co";
  const channelName = `cw-sync-${TRIP}`;
  const dateKey = () =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  const briefKey = () => `cw-daily-brief-${ME}-${dateKey()}`;
  const sigKey = () => `cw-daily-finance-sig-${ME}-${dateKey()}`;
  const normalizeParts = (arr) => {
    const src = Array.isArray(arr) && arr.length ? arr : TEAM;
    const set = new Set(src.filter((p) => TEAM.includes(p)));
    return TEAM.filter((p) => set.has(p));
  };
  const cents = (n) => Math.round(Number(n || 0) * 100);
  const moneyCt = (ct) =>
    "¥" +
    (Number(ct || 0) / 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  let latestState = null,
    lastSig = "",
    reopenBusy = false,
    dailyObserver = null,
    observedCard = null,
    wasCardOpen = false,
    channel = null;

  function financeSignature(state) {
    const ex = (state?.expenses || [])
      .map((e) => [
        String(e.id || ""),
        cents(e.amount),
        String(e.payer || ""),
        normalizeParts(e.participants).join(","),
        String(e.status || ""),
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const rp = (state?.repayments || [])
      .map((r) => [
        String(r.id || ""),
        String(r.expense_id || ""),
        String(r.from_person || ""),
        String(r.to_person || ""),
        cents(r.amount),
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return JSON.stringify([ex, rp]);
  }

  function pairSummary(state, person) {
    const debt = Object.fromEntries(TEAM.map((p) => [p, {}]));
    const add = (from, to, ct) => {
      if (!ct || from === to || !TEAM.includes(from) || !TEAM.includes(to)) return;
      debt[from][to] = (debt[from][to] || 0) + ct;
    };
    for (const e of state?.expenses || []) {
      if (e.status === "budget") continue;
      const ps = normalizeParts(e.participants),
        total = cents(e.amount);
      if (!ps.length || total <= 0 || !TEAM.includes(e.payer)) continue;
      const base = Math.floor(total / ps.length),
        rem = total % ps.length;
      ps.forEach((p, i) => {
        const share = base + (i < rem ? 1 : 0);
        if (p !== e.payer) add(p, e.payer, share);
      });
    }
    for (const r of state?.repayments || [])
      add(r.from_person, r.to_person, -cents(r.amount));
    const gets = [],
      owes = [];
    for (const other of TEAM) {
      if (other === person) continue;
      const oweMe = (debt[other]?.[person] || 0) - (debt[person]?.[other] || 0);
      if (oweMe > 0) gets.push({ from: other, cents: oweMe });
      else if (oweMe < 0) owes.push({ to: other, cents: -oweMe });
    }
    return {
      gets,
      owes,
      getCt: gets.reduce((s, x) => s + x.cents, 0),
      oweCt: owes.reduce((s, x) => s + x.cents, 0),
    };
  }

  function pendingUnread(state) {
    const seen = new Set(
      (state?.ledger_acks || [])
        .filter((a) => a.item_type === "expense" && a.person === ME)
        .map((a) => String(a.item_id)),
    );
    return (state?.expenses || []).filter(
      (e) =>
        e.status !== "budget" &&
        e.payer !== ME &&
        normalizeParts(e.participants).includes(ME) &&
        !seen.has(String(e.id)),
    ).length;
  }

  function patchLegacyDaily() {
    if (!latestState) return;
    const ov = document.querySelector("#editOverlay.show"),
      title = document.querySelector("#editTitle"),
      p = document.querySelector("#editBody .tips .tip:first-child p");
    if (!ov || !title || !p || !title.textContent.includes("今天先看这些")) return;
    const m = pairSummary(latestState, ME),
      unread = pendingUnread(latestState);
    p.textContent =
      (m.getCt
        ? `该收 ${moneyCt(m.getCt)}`
        : m.oweCt
          ? `该付 ${moneyCt(m.oweCt)}`
          : "当前无需转账") + (unread ? `；${unread}笔账待确认` : "");
  }

  function dailyBanner(text = "账本数据已更新，金额已重新计算") {
    const card = document.querySelector("#cwDailyCard");
    if (!card) return;
    let el = card.querySelector("#cwDailySyncNotice");
    if (!el) {
      el = document.createElement("div");
      el.id = "cwDailySyncNotice";
      el.style.cssText =
        "margin:8px 0 2px;padding:8px 10px;border-radius:10px;background:#eef7f5;color:#176c62;font-size:11px;font-weight:800;line-height:1.45";
      card.querySelector(".cw-daily-person")?.insertAdjacentElement("afterend", el);
    }
    el.textContent = text;
  }

  function saveDailySignature() {
    if (!latestState) return;
    const sig = financeSignature(latestState);
    try {
      localStorage.setItem(sigKey(), sig);
    } catch {}
    reopenBusy = false;
  }

  function watchDailyCard() {
    const card = document.querySelector("#cwDailyCard");
    if (!card || card === observedCard) return;
    dailyObserver?.disconnect?.();
    observedCard = card;
    wasCardOpen = card.classList.contains("show");
    dailyObserver = new MutationObserver(() => {
      const now = card.classList.contains("show");
      if (wasCardOpen && !now) saveDailySignature();
      wasCardOpen = now;
    });
    dailyObserver.observe(card, { attributes: true, attributeFilter: ["class"] });
  }

  function reopenDailyForChangedFinance(sig) {
    if (QA || reopenBusy) return;
    let seen = "",
      dismissed = false;
    try {
      seen = localStorage.getItem(sigKey()) || "";
      dismissed = localStorage.getItem(briefKey()) === "1";
    } catch {}
    const card = document.querySelector("#cwDailyCard");
    if (card?.classList.contains("show")) {
      if (lastSig && lastSig !== sig) dailyBanner("账本刚刚有变动，金额已实时更新");
      return;
    }
    if (!seen && dismissed) {
      try {
        localStorage.setItem(sigKey(), sig);
      } catch {}
      return;
    }
    if (!dismissed || !seen || seen === sig) return;
    reopenBusy = true;
    let tries = 0;
    const openWhenReady = () => {
      tries++;
      if (typeof window.__cwDailyTestOpen === "function") {
        window.__cwDailyTestOpen();
        setTimeout(() => {
          watchDailyCard();
          dailyBanner("账本数据有更新，以下金额已重新计算");
        }, 80);
        return;
      }
      if (tries < 20) setTimeout(openWhenReady, 150);
      else reopenBusy = false;
    };
    setTimeout(openWhenReady, 120);
  }

  function kick(reason = "sync") {
    if (document.hidden) return;
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(
        new CustomEvent("cw:sync-pulse", { detail: { reason, at: Date.now() } }),
      );
    } catch {}
  }

  function broadcast(reason) {
    const payload = { trip: TRIP, reason, at: Date.now(), from: ME };
    try {
      channel?.postMessage(payload);
    } catch {}
    try {
      localStorage.setItem("cw-sync-pulse", JSON.stringify(payload));
    } catch {}
  }

  function installNetworkWatcher() {
    if (QA || window.__cwSyncFetchWrapped) return;
    window.__cwSyncFetchWrapped = true;
    const raw = window.fetch.bind(window);
    const reads = new Set([
      "get_state",
      "state",
      "status",
      "heartbeat",
      "validate",
      "list_profiles",
      "list_trash",
      "list",
      "get",
    ]);
    window.fetch = async (input, init = {}) => {
      let action = "",
        isTripRequest = false;
      try {
        const url = new URL(
          typeof input === "string" ? input : input.url,
          location.href,
        );
        isTripRequest =
          url.origin === ORIGIN && url.pathname.includes("/functions/v1/trip-");
        if (isTripRequest && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          action = String(body.action || "");
        }
      } catch {}
      const response = await raw(input, init);
      if (
        isTripRequest &&
        response.ok &&
        action &&
        !reads.has(action) &&
        !action.startsWith("get_") &&
        !action.startsWith("list_")
      ) {
        broadcast(action);
        setTimeout(() => kick(`write:${action}`), 90);
      }
      return response;
    };
  }

  window.addEventListener("cw:state", (e) => {
    if (!e.detail?.state) return;
    latestState = e.detail.state;
    const sig = financeSignature(latestState);
    watchDailyCard();
    setTimeout(patchLegacyDaily, 30);
    reopenDailyForChangedFinance(sig);
    lastSig = sig;
  });
  window.addEventListener("cw:sync-now", (e) => {
    broadcast(e.detail?.reason || "manual");
    setTimeout(() => kick(e.detail?.reason || "manual"), 40);
  });
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest?.(".cw-daily-close,.cw-daily-ok")) saveDailySignature();
    },
    true,
  );

  if (!QA) {
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(channelName);
        channel.onmessage = (e) => {
          if (e.data?.trip === TRIP && e.data?.from !== ME)
            setTimeout(() => kick(`broadcast:${e.data?.reason || "change"}`), 20);
        };
      }
    } catch {}
    window.addEventListener("storage", (e) => {
      if (e.key === "cw-sync-pulse" && e.newValue) kick("storage");
    });
    window.addEventListener("focus", () => kick("focus"));
    window.addEventListener("pageshow", () => kick("pageshow"));
    window.addEventListener("online", () => kick("online"));
    setInterval(() => {
      if (!document.hidden) kick("poll");
    }, 10000);
  }
  installNetworkWatcher();
  new MutationObserver(watchDailyCard).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setTimeout(watchDailyCard, 400);
  window.CWSyncHub = { kick, financeSignature, saveDailySignature };
})();
