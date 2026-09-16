(() => {
  "use strict";
  const auth = window.CWSession,
    TEAM = auth.PEOPLE;
  const ROLE = {
    瑞子: "酒店 / 账本",
    航子: "机票 / 航班",
    普子: "攻略 / 路况",
    辉子: "租车 / 车务",
  };
  const $ = (s) => document.querySelector(s),
    overlay = $("#authOverlay"),
    msg = $("#authMsg"),
    title = $("#authTitle"),
    input = $("#pinInput");
  function ensureGuestEntry() {
    if ($("#guestMode")) return;
    const people = $(".people");
    if (!people) return;
    const style = document.createElement("style");
    style.textContent = `.guest-entry{width:100%;margin-top:12px;min-height:62px;border:1px solid rgba(165,241,212,.34);border-radius:16px;background:rgba(165,241,212,.09);color:#fff;text-align:left;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:14px}.guest-entry b{font-size:16px}.guest-entry span{display:block;margin-top:4px;color:#b9d5dd;font-size:11px;font-weight:600}.guest-entry em{font-style:normal;font-size:11px;font-weight:900;color:#a5f1d4;background:rgba(165,241,212,.1);border-radius:999px;padding:6px 9px;white-space:nowrap}.guest-entry:active{transform:scale(.99)}.guest-entry:disabled{opacity:.65}#guestState{min-height:16px;margin-top:6px;font-size:11px;color:#ffd9cc}`;
    document.head.appendChild(style);
    const wrap = document.createElement("div");
    wrap.innerHTML = `<button type="button" class="guest-entry" id="guestMode"><div><b>访客模式</b><span>查看四人实时信息 · 不能添加、修改或删除</span></div><em>只读浏览</em></button><div id="guestState"></div>`;
    people.insertAdjacentElement("afterend", wrap);
  }
  ensureGuestEntry();
  let person = "",
    mode = "verify",
    first = "",
    stage = 1,
    busy = false,
    lockTimer = null,
    sequence = 0;
  const message = (text, kind = "") => {
    msg.textContent = text;
    msg.className = "auth-msg" + (kind ? " " + kind : "");
  };
  const paint = () =>
    document
      .querySelectorAll(".dotpin")
      .forEach((d, i) => d.classList.toggle("on", i < input.value.length));
  const keys = (disabled) => {
    input.disabled = disabled;
    document
      .querySelectorAll("#keypad button[data-key]")
      .forEach((b) => (b.disabled = disabled));
  };
  const reset = () => {
    input.value = "";
    paint();
  };
  const entry = () => {
    keys(false);
    input.focus({ preventScroll: true });
  };
  function close() {
    if (busy) return;
    sequence++;
    clearInterval(lockTimer);
    lockTimer = null;
    first = "";
    reset();
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    $("#setupActions").classList.remove("show");
    document.querySelector(`[data-name="${person}"]`)?.focus();
    person = "";
  }
  function countdown(seconds) {
    const until = Date.now() + Math.max(1, seconds) * 1000;
    keys(true);
    $("#setupActions").classList.remove("show");
    clearInterval(lockTimer);
    const tick = () => {
      const s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (!s) {
        clearInterval(lockTimer);
        lockTimer = null;
        reset();
        entry();
        message("冷却结束，可以重新输入密码");
        return;
      }
      message(`已锁定，请 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} 后再试`, "lock");
    };
    lockTimer = setInterval(tick, 1000);
    tick();
  }
  function enter(session, remember) {
    auth.save(person, session, remember);
    sessionStorage.setItem("cw-admin", person === "瑞子" ? "1" : "0");
    reset();
    first = "";
    $("#loading").classList.add("show");
    location.replace("./app-v4.html?person=" + encodeURIComponent(person));
  }
  async function enterGuest() {
    if (busy) return;
    busy = true;
    const b = $("#guestMode");
    if (b) {
      b.disabled = true;
      b.querySelector("b").textContent = "正在进入访客模式…";
    }
    try {
      const session = await auth.issueGuest();
      auth.activateGuestShadow(session);
      sessionStorage.setItem("cw-admin", "0");
      $("#loading").classList.add("show");
      location.replace("./app-v4.html?person=%E7%91%9E%E5%AD%90&guest=1");
    } catch (e) {
      if (b) {
        b.disabled = false;
        b.querySelector("b").textContent = "访客模式";
      }
      const foot = $("#guestState");
      if (foot) foot.textContent = e.message || "暂时无法进入访客模式，请重试";
      busy = false;
    }
  }
  async function choose(p) {
    if (!TEAM.includes(p) || busy) return;
    person = p;
    stage = 1;
    first = "";
    reset();
    const seq = ++sequence;
    $("#setupActions").classList.remove("show");
    $("#setupConfirm").disabled = false;
    $("#authRetry").hidden = true;
    $("#authEyebrow").textContent = `${p} · ${ROLE[p]}`;
    title.textContent = "正在检查登录状态";
    message("请稍候…");
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    keys(true);
    busy = true;
    try {
      if (auth.get(p)) {
        const saved = await auth.validate(p);
        if (seq !== sequence) return;
        if (saved) {
          enter(saved, saved.remembered);
          return;
        }
      }
      const status = await auth.request("status", { person: p });
      if (seq !== sequence) return;
      mode = status.configured ? "verify" : "setup";
      input.autocomplete = mode === "verify" ? "current-password" : "new-password";
      if (status.locked) {
        title.textContent = "暂时无法进入";
        countdown(status.lock_seconds);
        return;
      }
      title.textContent = mode === "verify" ? "请输入 4 位密码" : "首次进入 · 设置密码";
      message(mode === "verify" ? `还有 ${status.remaining_attempts ?? 5} 次机会` : "请输入新的 4 位数字密码");
      entry();
    } catch (e) {
      message("登录服务暂时无法连接，登录记忆已保留", "error");
      $("#authRetry").hidden = false;
    } finally {
      busy = false;
    }
  }
  async function verify() {
    if (busy || input.value.length !== 4) return;
    busy = true;
    keys(true);
    message("正在验证…");
    const typed = input.value,
      remember = $("#rememberDevice").checked;
    reset();
    try {
      const s = await auth.request("verify", { person, pin: typed, remember_device: remember });
      enter(s, remember);
    } catch (e) {
      if (e.code === "locked") {
        title.textContent = "暂时无法进入";
        countdown(e.lock_seconds || 1200);
      } else if (e.code === "wrong_pin") {
        message(`密码错误，还剩 ${e.remaining_attempts ?? 0} 次机会`, "error");
        entry();
      } else if (e.code === "not_configured") {
        mode = "setup";
        input.autocomplete = "new-password";
        title.textContent = "首次进入 · 设置密码";
        message("请设置 4 位数字密码");
        entry();
      } else {
        message("连接失败，请重试；本次未确认密码结果", "error");
        entry();
      }
    } finally {
      busy = false;
    }
  }
  function complete() {
    if (busy || input.disabled || input.value.length !== 4) return;
    if (mode === "verify") return verify();
    if (stage === 1) {
      first = input.value;
      reset();
      stage = 2;
      title.textContent = "再次输入密码";
      message("请重复输入刚才的 4 位密码");
      return;
    }
    const matches = first === input.value;
    reset();
    if (!matches) {
      first = "";
      stage = 1;
      title.textContent = "首次进入 · 设置密码";
      message("两次密码不一致，请重新设置", "error");
      return;
    }
    keys(true);
    title.textContent = "确认设置密码";
    message("确认后保存密码，并按下方选择记住此设备。");
    $("#setupActions").classList.add("show");
    $("#setupConfirm").disabled = false;
    $("#setupConfirm").focus();
  }
  async function setup() {
    if (busy || !/^\d{4}$/.test(first) || stage !== 2) return;
    busy = true;
    $("#setupConfirm").disabled = true;
    message("正在安全保存…");
    const remember = $("#rememberDevice").checked;
    try {
      const s = await auth.request("setup", { person, pin: first, confirm_pin: first, remember_device: remember });
      enter(s, remember);
    } catch (e) {
      message(e.message || "保存失败，请重试", "error");
      $("#setupConfirm").disabled = false;
    } finally {
      busy = false;
    }
  }
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    paint();
    complete();
  });
  $("#keypad").onclick = (e) => {
    const b = e.target.closest("[data-key]");
    if (!b || b.disabled || busy) return;
    input.value = b.dataset.key === "del" ? input.value.slice(0, -1) : (input.value + b.dataset.key).slice(0, 4);
    paint();
    complete();
  };
  document.querySelectorAll("[data-name]").forEach((b) => (b.onclick = () => choose(b.dataset.name)));
  $("#guestMode")?.addEventListener("click", enterGuest);
  $("#authCancel").onclick = close;
  $("#setupCancel").onclick = close;
  $("#setupConfirm").onclick = setup;
  $("#authRetry").onclick = () => choose(person);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => {
    if (!overlay.classList.contains("show")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {
      const list = [...overlay.querySelectorAll("button,input,a[href]")].filter((x) => !x.disabled && !x.hidden && x.getClientRects().length);
      if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0]?.focus(); }
    }
  });
  const qs = new URLSearchParams(location.search),
    p = qs.get("person") || localStorage.getItem("cw-person");
  if (qs.has("logout")) message("此设备的登录记忆已清除");
  if (qs.get("guest") === "1") enterGuest();
  else if (TEAM.includes(p) && !qs.has("choose") && !qs.has("logout")) choose(p);
})();