(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let resetTimer = null;

  function ensureStyle() {
    if ($("#cwItinerarySaveTopStyle")) return;
    const style = document.createElement("style");
    style.id = "cwItinerarySaveTopStyle";
    style.textContent = `
.cw-itin-editor-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.cw-itin-save-top{border:0!important;background:#0b6078!important;color:#fff!important;border-radius:999px!important;width:auto!important;min-width:82px!important;height:38px!important;padding:0 14px!important;font-size:12px!important;font-weight:900!important;line-height:38px!important;white-space:nowrap;box-shadow:0 5px 16px rgba(11,96,120,.24)}
.cw-itin-save-top:active{transform:scale(.97)}
.cw-itin-save-top:disabled{opacity:.58;transform:none}
@media(max-width:620px){.cw-itin-editor-head{top:-16px!important;padding:10px 0!important}.cw-itin-editor-head>div:first-child{min-width:0}.cw-itin-editor-head h3{font-size:15px!important;line-height:1.25}.cw-itin-editor-head .cw-itin-admin-note{display:block;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cw-itin-save-top{min-width:72px!important;height:40px!important;padding:0 12px!important;font-size:12px!important;line-height:40px!important}}
`;
    document.head.appendChild(style);
  }

  function resetButton(button) {
    if (!button?.isConnected) return;
    button.disabled = false;
    button.textContent = "保存";
  }

  function proxySave(button, editor) {
    const real = editor?.querySelector("[data-itin-save]");
    if (!real || real.disabled) return;
    button.disabled = true;
    button.textContent = "保存中…";
    real.click();
    clearInterval(resetTimer);
    const started = Date.now();
    resetTimer = setInterval(() => {
      const overlay = $("#cwItineraryEditor");
      const current = overlay?.querySelector("[data-itin-save]");
      if (
        !overlay?.classList.contains("show") ||
        !current?.disabled ||
        Date.now() - started > 16000
      ) {
        clearInterval(resetTimer);
        resetTimer = null;
        resetButton(button);
      }
    }, 120);
  }

  function enhance() {
    ensureStyle();
    const editor = $("#cwItineraryEditor .cw-itin-editor");
    const head = editor?.querySelector(".cw-itin-editor-head");
    if (!editor || !head || head.querySelector(".cw-itin-save-top")) return;
    const close = head.querySelector("[data-itin-close]");
    const actions = document.createElement("div");
    actions.className = "cw-itin-editor-head-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "cw-itin-save-top";
    save.textContent = "保存";
    save.setAttribute("aria-label", "保存并同步行程");
    save.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      proxySave(save, editor);
    });
    if (close) {
      head.insertBefore(actions, close);
      actions.append(save, close);
    } else {
      actions.append(save);
      head.appendChild(actions);
    }
    document.documentElement.classList.add("cw-itinerary-save-top-ready");
  }

  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest?.("[data-itin-edit]")) setTimeout(enhance, 0);
    },
    true,
  );
  new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.type === "childList" ||
          record.target?.id === "cwItineraryEditor" ||
          record.target?.classList?.contains("cw-itin-editor-head"),
      )
    )
      queueMicrotask(enhance);
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  window.CWItinerarySaveTop = { enhance };
  ensureStyle();
  enhance();
})();