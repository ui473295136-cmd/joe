(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const qs = new URLSearchParams(location.search);
  if (qs.get("guest") === "1") return;
  const ME = qs.get("person") || localStorage.getItem("cw-person") || "";
  if (!TEAM.includes(ME)) return;
  const $ = (s) => document.querySelector(s);
  let paintTimer = null,
    jumpTimer = null;

  function ensureStyle() {
    if ($("#cwRelatedFocusStyle")) return;
    const style = document.createElement("style");
    style.id = "cwRelatedFocusStyle";
    style.textContent = `
#ledgerList .ledger-item.cw-ledger-unread{border-left:4px solid #dd6845!important;background:linear-gradient(90deg,#fff1eb 0%,#fff9f6 34%,#fff 100%)!important;box-shadow:0 6px 20px rgba(176,77,45,.11)!important}
#ledgerList .ledger-item.cw-ledger-unread .ledger-amt{color:#b94c2d!important}
.cw-related-unread-label{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 8px;border-radius:999px;background:#f7d9cf;color:#9f3e26;font-size:9px;font-weight:900;line-height:1}.cw-related-unread-label:before{content:"";width:6px;height:6px;border-radius:50%;background:#db5d3b;box-shadow:0 0 0 3px rgba(219,93,59,.13)}
#ledgerList .ledger-item.cw-related-jump{animation:cwRelatedJump 1.4s ease}
#ledgerList .ledger-item:not(.cw-ledger-unread) .cw-related-unread-label{display:none!important}
@keyframes cwRelatedJump{0%,100%{transform:translateZ(0)}28%{box-shadow:0 0 0 5px rgba(11,96,120,.16),0 8px 24px rgba(11,96,120,.12)}65%{box-shadow:0 0 0 2px rgba(11,96,120,.08),0 5px 16px rgba(11,96,120,.08)}}
`;
    document.head.appendChild(style);
  }

  function syncUnreadLabels() {
    const list = $("#ledgerList");
    if (!list) return;
    list.querySelectorAll(".ledger-item").forEach((item) => {
      const unread = item.classList.contains("cw-ledger-unread");
      let label = item.querySelector(".cw-related-unread-label");
      if (unread && !label) {
        label = document.createElement("span");
        label.className = "cw-related-unread-label";
        label.textContent = "与我有关 · 未读";
        const meta = item.querySelector(".ledger-meta");
        if (meta) meta.insertAdjacentElement("afterend", label);
        else item.querySelector(".ledger-top > div")?.appendChild(label);
      }
      if (!unread && label) label.remove();
      const ack = item.querySelector('button[data-ledger="ack"]');
      if (ack && unread && !ack.disabled) ack.textContent = "标记已读";
    });
  }

  function focusRelated() {
    clearTimeout(jumpTimer);
    jumpTimer = setTimeout(() => {
      syncUnreadLabels();
      const list = $("#ledgerList");
      if (!list) return;
      const target =
        list.querySelector(".ledger-item.cw-ledger-unread") ||
        list.querySelector(".ledger-item");
      if (!target) return;
      target.scrollIntoView?.({ behavior: "smooth", block: "center" });
      target.classList.remove("cw-related-jump");
      void target.offsetWidth;
      target.classList.add("cw-related-jump");
      setTimeout(() => target?.classList?.remove("cw-related-jump"), 1500);
    }, 180);
  }

  function schedulePaint() {
    clearTimeout(paintTimer);
    paintTimer = setTimeout(syncUnreadLabels, 50);
  }

  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest?.('[data-ledgerview="mine"]')) {
        setTimeout(focusRelated, 40);
        setTimeout(focusRelated, 240);
        return;
      }
      const ack = e.target.closest?.('button[data-ledger="ack"]');
      if (ack) {
        ack.textContent = "正在标记…";
        setTimeout(schedulePaint, 180);
        setTimeout(schedulePaint, 700);
      }
    },
    true,
  );

  window.addEventListener("cw:state", schedulePaint);
  new MutationObserver(schedulePaint).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden"],
  });
  ensureStyle();
  schedulePaint();
})();