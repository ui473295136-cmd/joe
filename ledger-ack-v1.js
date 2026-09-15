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
    TRIP = "chuanxi2026";
  const $ = (s) => document.querySelector(s);
  let busy = "",
    state = null;
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
  function pendingUnread() {
    if (!state) {
      const m = String($("#pendingBadge")?.textContent || "").match(/(\d+)/);
      return m ? Number(m[1]) : 0;
    }
    const seen = ackSet();
    return (state.expenses || []).filter(
      (e) =>
        e.status !== "budget" &&
        e.payer !== ME &&
        normalizeParts(e.participants).includes(ME) &&
        !seen.has(String(e.id)),
    ).length;
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
  function style() {
    if ($("#cwAckAllStyle")) return;
    const s = document.createElement("style");
    s.id = "cwAckAllStyle";
    s.textContent = `
.cw-ack-all{display:grid;gap:9px;margin:0 0 12px;padding:12px 13px;border:1px solid #d9e5e7;background:linear-gradient(135deg,#f8fbfb,#fff);border-radius:14px}.cw-ack-all[hidden]{display:none}.cw-ack-copy{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.cw-ack-copy div{display:grid;gap:2px}.cw-ack-copy b{font-size:12px;color:#173f50}.cw-ack-copy span{font-size:9px;color:#73878f;line-height:1.45}.cw-ack-summary{font-size:9px;font-weight:900;color:#0b6078;background:#eef6f5;border-radius:999px;padding:5px 8px;white-space:nowrap}.cw-ack-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cw-ack-actions button{min-height:42px;padding:0 12px;border-radius:12px;font-weight:900;font-size:12px}.cw-ack-actions button:disabled{opacity:.5}.cw-ack-read{border:1px solid #f1d8cf;background:#fff7f3;color:#a14f37}.cw-ack-approve{border:0;background:#0b6078;color:#fff}#pendingBadge.cw-clickable{cursor:pointer;box-shadow:0 0 0 3px #fce7e2}@media(max-width:420px){.cw-ack-actions{grid-template-columns:1fr}.cw-ack-copy{align-items:center}}
`;
    document.head.appendChild(s);
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
        '<div class="cw-ack-copy"><div><b>批量处理账本</b><span id="cwAckAllText">一次处理，不用逐条点击</span></div><strong class="cw-ack-summary" id="cwAckSummary">0项待处理</strong></div><div class="cw-ack-actions"><button type="button" class="cw-ack-read" id="cwAckAllBtn">一键已读</button><button type="button" class="cw-ack-approve" id="cwApproveAllBtn">一键审批</button></div>';
      list.parentElement?.insertBefore(box, list);
      $("#cwAckAllBtn").onclick = ackAll;
      $("#cwApproveAllBtn").onclick = approveAll;
      const badge = $("#pendingBadge");
      if (badge) {
        badge.classList.add("cw-clickable");
        badge.addEventListener("click", () => {
          document.querySelector('#bottomNav button[data-view="me"]')?.click();
          setTimeout(
            () => box.scrollIntoView({ behavior: "smooth", block: "center" }),
            120,
          );
        });
      }
    }
    return box;
  }
  function paint() {
    const box = ensure();
    if (!box) return;
    const unread = pendingUnread(),
      approval = pendingApproval(),
      total = unread + approval.count;
    box.hidden = total <= 0;
    $("#cwAckAllText").textContent = [
      unread ? `${unread}笔账单未读` : "账单已全部读完",
      approval.count
        ? `${approval.count}项AA款待${ME}确认收款`
        : "没有待审批AA款",
    ].join(" · ");
    $("#cwAckSummary").textContent = `${total}项待处理`;
    const read = $("#cwAckAllBtn"),
      approve = $("#cwApproveAllBtn");
    read.disabled = !!busy || unread <= 0;
    approve.disabled = !!busy || approval.count <= 0;
    read.textContent = unread > 0 ? `一键已读 ${unread}笔` : "已全部读完";
    approve.textContent =
      approval.count > 0
        ? `一键审批 ${approval.count}项 · ${moneyCt(approval.totalCt)}`
        : "无需审批";
  }
  function refreshEverywhere(reason) {
    window.dispatchEvent(
      new CustomEvent("cw:sync-now", { detail: { reason: reason || "ledger" } }),
    );
    document.dispatchEvent(new Event("visibilitychange"));
  }
  async function ackAll() {
    if (busy) return;
    const n = pendingUnread();
    if (!n) return;
    busy = "read";
    paint();
    const b = $("#cwAckAllBtn");
    if (b) b.textContent = "正在全部标记…";
    try {
      const j = await request("ack_all");
      toast(`已一键读完 ${j.count ?? n} 笔账单`);
      refreshEverywhere("ledger-read-all");
    } catch (e) {
      toast(e.message || "一键已读失败");
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
    const badge = $("#pendingBadge"),
      list = $("#ledgerList");
    if ("MutationObserver" in window) {
      if (badge)
        new MutationObserver(paint).observe(badge, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      if (list)
        new MutationObserver(() => setTimeout(paint, 0)).observe(list, {
          childList: true,
        });
    }
    setTimeout(() => document.dispatchEvent(new Event("visibilitychange")), 40);
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
})();
