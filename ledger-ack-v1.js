(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person") ||
    "";
  if (!TEAM.includes(ME)) return;
  const QA = window.CWSession?.qa === true;
  const ENDPOINT =
      "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-ledger",
    SYNC = "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-sync",
    TRIP = "chuanxi2026";
  const $ = (s) => document.querySelector(s);
  let busy = "",
    state = null,
    priming = null;
  const cents = (n) => Math.round(Number(n || 0) * 100);
  const moneyCt = (ct) =>
    "¥" +
    (Number(ct || 0) / 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  function token() {
    if (QA) return "qa-token-abcdefghijklmnopqrstuvwxyz";
    return (
      window.CWSession?.get?.(ME)?.token ||
      sessionStorage.getItem(`cw-auth-${ME}`) ||
      ""
    );
  }
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._cwBulk);
    t._cwBulk = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function normalizeParts(arr) {
    const src = Array.isArray(arr) && arr.length ? arr : TEAM;
    const set = new Set(src.filter((p) => TEAM.includes(p)));
    return TEAM.filter((p) => set.has(p));
  }
  function shareMap(e) {
    const ps = normalizeParts(e.participants),
      total = cents(e.amount),
      out = {};
    if (!ps.length || total <= 0) return out;
    const base = Math.floor(total / ps.length),
      rem = total % ps.length;
    ps.forEach((p, i) => (out[p] = base + (i < rem ? 1 : 0)));
    return out;
  }
  function ackSet() {
    return new Set(
      (state?.ledger_acks || [])
        .filter((a) => a.item_type === "expense" && a.person === ME)
        .map((a) => String(a.item_id)),
    );
  }
  function unreadExpenses() {
    if (!state) return [];
    const seen = ackSet();
    return (state.expenses || []).filter(
      (e) =>
        e.status !== "budget" &&
        e.payer !== ME &&
        normalizeParts(e.participants).includes(ME) &&
        !seen.has(String(e.id)),
    );
  }
  function unreadIds() {
    return new Set(unreadExpenses().map((e) => String(e.id)));
  }
  function pendingUnread() {
    if (!state) {
      const m = String($("#pendingBadge")?.textContent || "").match(/(\d+)/);
      return m ? Number(m[1]) : 0;
    }
    return unreadExpenses().length;
  }
  function linked(e, debtor) {
    return (state?.repayments || []).some(
      (r) =>
        String(r.expense_id || "") === String(e.id) &&
        r.from_person === debtor &&
        r.to_person === ME,
    );
  }
  function pendingApproval(expenseId = "") {
    const rows = [];
    for (const e of state?.expenses || []) {
      if (
        e.status === "budget" ||
        e.payer !== ME ||
        (expenseId && String(e.id) !== String(expenseId))
      )
        continue;
      const shares = shareMap(e);
      for (const p of normalizeParts(e.participants)) {
        if (p === ME || !shares[p] || linked(e, p)) continue;
        rows.push({ expense: e, debtor: p, cents: shares[p] });
      }
    }
    return {
      rows,
      count: rows.length,
      totalCt: rows.reduce((s, x) => s + x.cents, 0),
      expenseCount: new Set(rows.map((x) => String(x.expense.id))).size,
    };
  }
  async function request(action, extra = {}) {
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), 10000);
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_slug: TRIP,
          action,
          payload: { person: ME, token: token(), ...extra },
        }),
        signal: c.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          window.CWSession?.forget?.(ME);
          location.replace(`./?person=${encodeURIComponent(ME)}`);
          throw new Error("登录已失效");
        }
        throw new Error(j.error || "操作失败");
      }
      return j;
    } finally {
      clearTimeout(t);
    }
  }
  async function primeState() {
    if (state || priming) return priming;
    priming = (async () => {
      try {
        const r = await fetch(SYNC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_slug: TRIP,
            action: "get_state",
            payload: {},
          }),
        });
        if (!r.ok) return;
        state = await r.json();
        paint();
      } catch {}
      finally {
        priming = null;
      }
    })();
    return priming;
  }
  function style() {
    if ($("#cwAckAllStyle")) return;
    const s = document.createElement("style");
    s.id = "cwAckAllStyle";
    s.textContent = `
.cw-ack-all{display:grid;gap:9px;margin:0 0 12px;padding:12px 13px;border:1px solid #d9e5e7;background:linear-gradient(135deg,#f8fbfb,#fff);border-radius:14px}.cw-ack-all[hidden]{display:none}.cw-ack-copy{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.cw-ack-copy div{display:grid;gap:2px}.cw-ack-copy b{font-size:12px;color:#173f50}.cw-ack-copy span{font-size:9px;color:#73878f;line-height:1.45}.cw-ack-summary{font-size:9px;font-weight:900;color:#0b6078;background:#eef6f5;border-radius:999px;padding:5px 8px;white-space:nowrap}.cw-ack-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cw-ack-actions button{min-height:42px;padding:0 12px;border-radius:12px;font-weight:900;font-size:12px}.cw-ack-actions button:disabled{opacity:.55}.cw-ack-read{border:1px solid #efc5b7;background:#fff5f0;color:#9b432d}.cw-ack-approve{border:0;background:#0b6078;color:#fff}#pendingBadge.cw-clickable{cursor:pointer;box-shadow:0 0 0 3px #fce7e2}#pendingBadge.cw-has-unread{background:#fff0e9!important;color:#a8452c!important;border-color:#efc5b7!important;font-weight:900}.cw-ledger-unread{position:relative;border-color:#efb39e!important;background:linear-gradient(135deg,#fff7f3 0%,#fff 70%)!important;box-shadow:0 4px 16px rgba(170,72,42,.08)}.cw-ledger-unread .ledger-top>div>b,.cw-ledger-unread .ledger-amt{color:#a8452c!important}.cw-ledger-unread .ledger-meta{color:#72534b!important}.cw-unread-flag{display:inline-flex;align-items:center;gap:4px;margin:7px 0 0;padding:4px 7px;border-radius:999px;background:#fbe3da;color:#9b432d;font-size:9px;font-weight:900;line-height:1}.cw-unread-flag:before{content:"";width:6px;height:6px;border-radius:50%;background:#d95f3a;box-shadow:0 0 0 3px rgba(217,95,58,.12)}.cw-unread-focus{animation:cwUnreadPulse 1.25s ease}.cw-ledger-unread .ack.wait{background:#fbe3da!important;color:#9b432d!important;border-color:#efc5b7!important}@keyframes cwUnreadPulse{0%,100%{transform:translateZ(0)}30%{box-shadow:0 0 0 5px rgba(217,95,58,.16),0 6px 20px rgba(170,72,42,.14)}65%{box-shadow:0 0 0 2px rgba(217,95,58,.08),0 4px 16px rgba(170,72,42,.08)}}@media(max-width:420px){.cw-ack-actions{grid-template-columns:1fr}.cw-ack-copy{align-items:center}}
`;
    document.head.appendChild(s);
  }
  function decorateUnread() {
    const list = $("#ledgerList");
    if (!list || !state) return;
    const ids = unreadIds();
    list.querySelectorAll(".ledger-item").forEach((item) => {
      const ack = item.querySelector('button[data-ledger="ack"][data-id]'),
        id = ack ? String(ack.dataset.id || "") : "",
        isUnread = !!id && ids.has(id);
      item.classList.toggle("cw-ledger-unread", isUnread);
      item.dataset.cwUnread = isUnread ? "1" : "0";
      let flag = item.querySelector(".cw-unread-flag");
      if (isUnread && !flag) {
        flag = document.createElement("span");
        flag.className = "cw-unread-flag";
        flag.textContent = "未读";
        const meta = item.querySelector(".ledger-meta");
        if (meta) meta.insertAdjacentElement("afterend", flag);
        else item.querySelector(".ledger-top > div")?.appendChild(flag);
      } else if (!isUnread && flag) flag.remove();
      if (ack) ack.hidden = !isUnread;
    });
  }
  function focusUnread(expenseId = "") {
    document.querySelector('#bottomNav button[data-view="me"]')?.click();
    setTimeout(() => {
      decorateUnread();
      const ids = unreadIds();
      let target = null;
      for (const item of document.querySelectorAll("#ledgerList .ledger-item")) {
        const ack = item.querySelector('button[data-ledger="ack"][data-id]'),
          id = ack ? String(ack.dataset.id || "") : "";
        if (!id || !ids.has(id)) continue;
        if (!expenseId || id === String(expenseId)) {
          target = item;
          break;
        }
      }
      if (!target) target = $("#cwAckAll");
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      if (target?.classList?.contains("ledger-item")) {
        target.classList.remove("cw-unread-focus");
        void target.offsetWidth;
        target.classList.add("cw-unread-focus");
        setTimeout(() => target?.classList?.remove("cw-unread-focus"), 1500);
      }
    }, 140);
  }
  function bindJump(el) {
    if (!el || el.dataset.cwUnreadJump === "1") return;
    el.dataset.cwUnreadJump = "1";
    el.classList.add("cw-clickable");
    el.addEventListener("click", () => focusUnread());
  }
  function ensure() {
    style();
    const list = $("#ledgerList");
    if (!list) return null;
    let box = $("#cwAckAll");
    if (!box) {
      box = document.createElement("div");
      box.id = "cwAckAll";
      box.className = "cw-ack-all";
      box.innerHTML =
        '<div class="cw-ack-copy"><div><b>消息与账本处理</b><span id="cwAckAllText">未读账单会用醒目颜色标出</span></div><strong class="cw-ack-summary" id="cwAckSummary">0项待处理</strong></div><div class="cw-ack-actions"><button type="button" class="cw-ack-read" id="cwAckAllBtn">全部已读</button><button type="button" class="cw-ack-approve" id="cwApproveAllBtn">一键审批</button></div>';
      list.parentElement?.insertBefore(box, list);
      $("#cwAckAllBtn").onclick = ackAll;
      $("#cwApproveAllBtn").onclick = approveAll;
    }
    bindJump($("#pendingBadge"));
    bindJump($("#navBadge"));
    return box;
  }
  function paint() {
    const box = ensure();
    if (!box) return;
    const unread = pendingUnread(),
      approval = pendingApproval(),
      total = unread + approval.count;
    box.hidden = false;
    $("#cwAckAllText").textContent = [
      unread ? `${unread}笔账单未读，点击未读提示可直接定位` : "账单消息已全部读完",
      approval.count
        ? `${approval.count}项AA款待${ME}确认收款`
        : "没有待审批AA款",
    ].join(" · ");
    $("#cwAckSummary").textContent = total > 0 ? `${total}项待处理` : "全部处理完成";
    const read = $("#cwAckAllBtn"),
      approve = $("#cwApproveAllBtn"),
      badge = $("#pendingBadge");
    if (badge) {
      const txt = unread > 0 ? `${unread}笔未读` : "全部已读";
      if (badge.textContent !== txt) badge.textContent = txt;
      badge.classList.toggle("cw-has-unread", unread > 0);
      badge.setAttribute("aria-label", unread > 0 ? `${unread}笔未读账单，点击查看` : "账单消息已全部读完");
    }
    read.disabled = !!busy || unread <= 0;
    approve.disabled = !!busy || approval.count <= 0;
    read.textContent = unread > 0 ? `全部已读 ${unread}笔` : "已全部读完";
    approve.textContent =
      approval.count > 0
        ? `一键审批 ${approval.count}项 · ${moneyCt(approval.totalCt)}`
        : "无需审批";
    decorateUnread();
  }
  function refreshEverywhere(reason) {
    if (!QA)
      window.dispatchEvent(
        new CustomEvent("cw:sync-now", { detail: { reason: reason || "ledger" } }),
      );
    document.dispatchEvent(new Event("visibilitychange"));
  }
  async function ackAll() {
    if (busy) return;
    const unread = unreadExpenses(),
      n = unread.length;
    if (!n) return;
    busy = "read";
    paint();
    const b = $("#cwAckAllBtn");
    if (b) b.textContent = "正在全部标记…";
    try {
      const j = await request("ack_all");
      if (state && unread.length) {
        const seen = ackSet(),
          now = new Date().toISOString(),
          added = unread
            .filter((e) => !seen.has(String(e.id)))
            .map((e) => ({
              trip_slug: TRIP,
              item_type: "expense",
              item_id: e.id,
              person: ME,
              acked_at: now,
            }));
        if (added.length) {
          state = {
            ...state,
            ledger_acks: [...(state.ledger_acks || []), ...added],
          };
          window.dispatchEvent(
            new CustomEvent("cw:state", { detail: { state } }),
          );
        }
      }
      paint();
      toast(`已全部读完 ${j.count ?? n} 笔账单`);
      refreshEverywhere("ledger-read-all");
    } catch (e) {
      toast(e.message || "全部已读失败");
    } finally {
      busy = "";
      setTimeout(paint, 180);
    }
  }
  async function approveAll() {
    if (busy) return;
    const a = pendingApproval();
    if (!a.count) return;
    if (
      !confirm(
        `确认一键审批？\n将由 ${ME} 确认已收到 ${a.count} 项AA款，共 ${moneyCt(a.totalCt)}。`,
      )
    )
      return;
    busy = "approve";
    paint();
    const b = $("#cwApproveAllBtn");
    if (b) b.textContent = "正在同步审批…";
    try {
      const j = await request("settle_all");
      if (state && Array.isArray(j.rows) && j.rows.length) {
        state = {
          ...state,
          repayments: [...(state.repayments || []), ...j.rows],
        };
        window.dispatchEvent(
          new CustomEvent("cw:state", { detail: { state } }),
        );
      }
      toast(
        j.count
          ? `已审批 ${j.count} 项，共 ${Number(j.amount || 0).toFixed(2)} 元`
          : "没有新的待审批款项",
      );
      refreshEverywhere("ledger-approve-all");
    } catch (e) {
      toast(e.message || "一键审批失败");
    } finally {
      busy = "";
      setTimeout(paint, 180);
    }
  }
  function init() {
    paint();
    primeState();
    const badge = $("#pendingBadge"),
      list = $("#ledgerList");
    if ("MutationObserver" in window) {
      if (badge)
        new MutationObserver(() => setTimeout(paint, 0)).observe(badge, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      if (list)
        new MutationObserver(() => setTimeout(paint, 0)).observe(list, {
          childList: true,
          subtree: true,
        });
    }
    if (!QA)
      setInterval(() => {
        if (!document.hidden) paint();
      }, 5000);
  }
  window.addEventListener("cw:state", (e) => {
    if (e.detail?.state) state = e.detail.state;
    setTimeout(paint, 0);
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 180), {
      once: true,
    });
  else setTimeout(init, 180);

  window.CWLedgerUnread = {
    focusUnread,
    pendingUnread,
    decorate: decorateUnread,
  };
})();
