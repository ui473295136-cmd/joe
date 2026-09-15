(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    ME =
      new URLSearchParams(location.search).get("person") ||
      localStorage.getItem("cw-person");
  function toast(text) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3400);
  }
  window.CWUX = { toast };
  const selector =
    ".overlay,.avatar-crop-overlay,.cw-sheet,.cw-arrival,.cw-daily-overlay,.minimal-dialog";
  const previous = new WeakMap();
  let opened = [],
    scheduled = false;
  const focusables = (el) =>
    [
      ...el.querySelectorAll(
        'button,input,select,textarea,a[href],[tabindex="0"]',
      ),
    ].filter((x) => !x.disabled && !x.hidden && x.getClientRects().length);
  function sync() {
    scheduled = false;
    if (!document.body) return;
    const all = [...document.querySelectorAll(selector)];
    const next = all.filter((x) => x.classList.contains("show"));
    all.forEach((el) => {
      const visible = next.includes(el);
      el.setAttribute("aria-hidden", String(!visible));
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby"))
        el.setAttribute(
          "aria-label",
          el.querySelector("h2,h3,.crop-head b")?.textContent || "操作面板",
        );
      if (visible && !opened.includes(el)) {
        previous.set(el, document.activeElement);
        el.tabIndex = -1;
        (focusables(el)[0] || el).focus({ preventScroll: true });
      } else if (!visible && opened.includes(el)) {
        const target = previous.get(el);
        if (target?.isConnected) target.focus({ preventScroll: true });
      }
    });
    opened = next;
    document.body.classList.toggle("cw-modal-open", next.length > 0);
    for (const el of document.querySelectorAll("main,#bottomNav,.topbar"))
      el.inert = next.length > 0;
  }
  const schedule = () => {
    if (!document.body) return;
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(sync);
    }
  };
  new MutationObserver((records) => {
    if (
      records.some(
        (r) => r.type === "childList" || r.target.matches?.(selector),
      )
    )
      schedule();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  document.addEventListener("keydown", (e) => {
    const el = opened.at(-1);
    if (!el) return;
    if (e.key === "Escape") {
      const close = el.querySelector(
        "[data-crop-close],[data-sheet-close],[data-close],#closeMapBtn,#cwArrivalOk,[data-cancel-delete],.cw-daily-close",
      );
      if (close && !close.disabled) close.click();
      else if (!close) el.classList.remove("show");
      e.preventDefault();
    } else if (e.key === "Tab") {
      const items = focusables(el),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        el.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === el)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (
        img.tagName !== "IMG" ||
        !img.closest(".cw-member-face,.cw-arrival-faces") ||
        img.dataset.failed
      )
        return;
      img.dataset.failed = "1";
      const fallback = document.createElement("span");
      fallback.className = "fallback";
      fallback.textContent = (img.alt || "旅")[0];
      img.replaceWith(fallback);
    },
    true,
  );
  const banner = document.createElement("div");
  banner.id = "cwNetworkStatus";
  banner.className = "cw-network-status";
  banner.setAttribute("role", "status");
  banner.hidden = true;
  document.body.appendChild(banner);
  function network() {
    banner.hidden = navigator.onLine;
    banner.textContent = "当前离线 · 修改尚不能同步，网络恢复后请重试";
    if (navigator.onLine) document.dispatchEvent(new Event("visibilitychange"));
  }
  window.addEventListener("online", network);
  window.addEventListener("offline", network);
  if (!navigator.onLine) network();
  function paintSession() {
    if (window.CWSession.qa) {
      $("#rememberState").textContent = "本地测试数据";
      $("#rememberThisDevice").hidden = true;
      return;
    }
    const s = window.CWSession.get(ME),
      saved = !!s?.remembered;
    $("#rememberState").textContent = saved
      ? `此设备已记住登录 · 有效至 ${new Date(s.expires_at).toLocaleDateString("zh-CN")}`
      : "本次登录尚未记住，下次关闭浏览器后需要验证";
    $("#rememberThisDevice").hidden = saved;
  }
  $("#rememberThisDevice").onclick = async (e) => {
    const button = e.currentTarget,
      s = window.CWSession.get(ME);
    if (!s) return toast("登录已失效，请重新进入");
    button.disabled = true;
    try {
      const remembered = await window.CWSession.request("remember_device", {
        person: ME,
        token: s.token,
      });
      const saved = window.CWSession.save(ME, remembered, true);
      if (!saved) throw new Error("浏览器禁止保存，请允许网站使用存储");
      paintSession();
      toast("已记住此设备，下次可直接进入");
    } catch (err) {
      toast(err.message || "保存失败，请重试");
    } finally {
      button.disabled = false;
    }
  };
  $("#forgetDevice").onclick = async (e) => {
    e.currentTarget.disabled = true;
    await window.CWSession.logoutAll();
    location.replace("./?logout=1");
  };
  paintSession();
  sync();
})();
