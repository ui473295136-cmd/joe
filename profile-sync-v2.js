(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ROLE = {
    瑞子: "酒店 / 账本",
    普子: "攻略 / 路况",
    航子: "机票 / 航班",
    辉子: "租车 / 车务",
  };
  const ME =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person");
  const endpoint =
    "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-profile";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  let profiles = [],
    limits = {
      daily_limit: 3,
      nickname_used: 0,
      nickname_remaining: 3,
      avatar_used: 0,
      avatar_remaining: 3,
    },
    busy = false,
    pending = null,
    crop = null,
    drag = null,
    refreshVersion = 0;
  const failures = new Set(),
    images = new Map();
  const channel =
    "BroadcastChannel" in window
      ? new BroadcastChannel("cw-profile-sync")
      : null;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const get = (p) =>
    profiles.find((x) => x.person === p) || {
      person: p,
      nickname: p,
      role: ROLE[p],
      avatar_url: "",
    };
  const label = (p) => get(p).nickname || p;
  function notify(text) {
    const el = $("#avatarState");
    if (el) el.textContent = text;
    window.CWUX?.toast(text);
  }
  async function api(action, payload = {}) {
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), 15000);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_slug: "chuanxi2026", action, payload }),
        signal: c.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) {
        const e = new Error(j.error || "同步失败");
        e.code = j.code || "";
        e.limits = j.limits || null;
        throw e;
      }
      return j;
    } finally {
      clearTimeout(t);
    }
  }
  function merge(p) {
    if (!p || !TEAM.includes(p.person)) return false;
    const i = profiles.findIndex((x) => x.person === p.person);
    if (i < 0) {
      profiles.push(p);
      return true;
    }
    const old = profiles[i],
      a = Date.parse(old.updated_at || 0) || 0,
      b = Date.parse(p.updated_at || 0) || 0;
    if (a && b && b < a) return false;
    const next = { ...old, ...p };
    const changed =
      old.nickname !== next.nickname ||
      old.role !== next.role ||
      old.avatar_url !== next.avatar_url ||
      old.updated_at !== next.updated_at ||
      old.last_seen !== next.last_seen;
    profiles[i] = next;
    return changed;
  }
  function imageUrl(p) {
    const u = get(p).avatar_url;
    return u && !failures.has(u) ? u : window.CHUANXI_AVATARS?.[p[0]] || "";
  }
  function paintAvatar(el, p) {
    if (!el) return;
    const u = imageUrl(p);
    el.dataset.person = p;
    el.setAttribute("aria-label", label(p));
    if (el.dataset.avatarSrc === u) return;
    el.dataset.avatarSrc = u;
    el.textContent = u ? "" : p[0];
    el.style.backgroundImage = u ? `url(${JSON.stringify(u)})` : "";
    el.style.color = u ? "transparent" : "";
    if (u && !images.has(u)) {
      const img = new Image();
      images.set(u, img);
      img.onerror = () => {
        failures.add(u);
        images.delete(u);
        paint();
      };
      img.src = u;
    }
  }
  function limitHint() {
    const host = $(".profile-fields");
    if (!host) return;
    let el = $("#profileChangeHint");
    if (!el) {
      el = document.createElement("div");
      el.id = "profileChangeHint";
      el.className = "profile-change-hint";
      const state = $("#avatarState");
      state?.insertAdjacentElement("beforebegin", el);
    }
    const n = Math.max(0, Number(limits.nickname_remaining ?? 3)),
      a = Math.max(0, Number(limits.avatar_remaining ?? 3));
    el.classList.toggle("limit-hit", n === 0 || a === 0);
    el.innerHTML = `<span>昵称今天还可改 <b>${n}</b> 次</span><i>·</i><span>头像还可换 <b>${a}</b> 次</span><small>每天各 3 次 · 次日 00:00 自动重置</small>`;
    const avatarBtn = $("#changeAvatar");
    if (avatarBtn && !busy) avatarBtn.disabled = a <= 0;
  }
  function applyLimits(next) {
    if (next) limits = { ...limits, ...next };
    limitHint();
  }
  function paint() {
    for (const p of TEAM)
      $$(`.avatar[data-person="${p}"],[data-profile-avatar="${p}"]`).forEach(
        (el) => paintAvatar(el, p),
      );
    for (const id of ["homeAvatar", "miniAvatar", "profileAvatar"])
      paintAvatar($("#" + id), ME);
    const me = get(ME);
    if ($("#helloName"))
      $("#helloName").textContent = `${me.nickname || ME}，今天先看这些`;
    if ($("#helloRole")) $("#helloRole").textContent = me.role || ROLE[ME];
    for (const [id, key, fallback] of [
      ["nicknameInput", "nickname", ME],
      ["roleInput", "role", ROLE[ME]],
    ]) {
      const el = $("#" + id);
      if (el && el.dataset.dirty !== "1" && document.activeElement !== el)
        el.value = me[key] || fallback;
    }
    const grid = $("#identityGrid");
    if (grid) {
      if (sessionStorage.getItem("cw-admin") !== "1")
        grid.closest("#identitySwitcher")?.remove();
      else {
        const html = TEAM.map(
          (p) =>
            `<button type="button" class="identity-item ${p === ME ? "on" : ""}" data-switch-person="${p}"><span class="identity-avatar" data-profile-avatar="${p}"></span><span><b>${esc(label(p))}</b><small>${esc(get(p).role || ROLE[p])}</small></span>${p === ME ? "<em>当前</em>" : ""}</button>`,
        ).join("");
        if (grid.dataset.content !== html) {
          grid.innerHTML = html;
          grid.dataset.content = html;
          TEAM.forEach((p) =>
            paintAvatar(grid.querySelector(`[data-profile-avatar="${p}"]`), p),
          );
        }
      }
    }
    limitHint();
    window.dispatchEvent(
      new CustomEvent("cw:profiles", {
        detail: { profiles: [...profiles], limits: { ...limits } },
      }),
    );
  }
  function refresh() {
    if (pending || busy) return pending || Promise.resolve();
    const version = refreshVersion;
    pending = api("list_profiles")
      .then((j) => {
        if (version !== refreshVersion || busy) return;
        let changed = false;
        (j.profiles || []).forEach((p) => (changed = merge(p) || changed));
        applyLimits(j.limits);
        if (changed || !document.documentElement.classList.contains("profile-live-painted")) {
          paint();
          document.documentElement.classList.add("profile-live-painted");
        }
      })
      .catch(() => {
        if (!profiles.length) notify("资料暂未同步，可稍后重试");
      })
      .finally(() => (pending = null));
    return pending;
  }
  function cropSize() {
    return (
      $("#cropStage").getBoundingClientRect().width ||
      $("#cropStage").clientWidth ||
      264
    );
  }
  function clamp() {
    if (!crop) return;
    const size = cropSize(),
      old = crop.size || size;
    crop.dx *= size / old;
    crop.dy *= size / old;
    crop.size = size;
    crop.scale = Math.max(size / crop.nw, size / crop.nh);
    const w = crop.nw * crop.scale * crop.zoom,
      h = crop.nh * crop.scale * crop.zoom;
    crop.dx = Math.max(-(w - size) / 2, Math.min((w - size) / 2, crop.dx));
    crop.dy = Math.max(-(h - size) / 2, Math.min((h - size) / 2, crop.dy));
    Object.assign($("#cropImage").style, {
      width: `${w}px`,
      height: `${h}px`,
      left: `${size / 2 + crop.dx - w / 2}px`,
      top: `${size / 2 + crop.dy - h / 2}px`,
    });
  }
  function closeCrop() {
    $("#avatarCropOverlay")?.classList.remove("show");
    if (crop?.url) URL.revokeObjectURL(crop.url);
    crop = null;
    drag = null;
    $("#avatarInput").value = "";
    $("#changeAvatar").focus({ preventScroll: true });
  }
  function ensureCrop() {
    const el = document.createElement("div");
    el.id = "avatarCropOverlay";
    el.className = "avatar-crop-overlay";
    el.innerHTML =
      '<div class="avatar-crop-card"><div class="crop-head"><div><b>调整头像</b><span>拖动照片或调整缩放，圆圈内就是最终头像</span></div><button type="button" aria-label="关闭头像裁剪" data-crop-close>×</button></div><div class="crop-stage" id="cropStage"><img id="cropImage" alt="头像裁剪预览" draggable="false"><div class="crop-mask"></div></div><label class="crop-zoom"><span>缩放</span><input id="cropZoom" type="range" min="1" max="3" step="0.01" value="1"></label><div class="crop-actions"><button type="button" data-crop-close>取消</button><button type="button" class="primary" id="cropConfirm">使用这个位置</button></div></div>';
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-crop-close]")) closeCrop();
    });
    const stage = $("#cropStage");
    stage.addEventListener("pointerdown", (e) => {
      if (!crop || e.button > 0) return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        dx: crop.dx,
        dy: crop.dy,
      };
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!crop || !drag || e.pointerId !== drag.id) return;
      crop.dx = drag.dx + e.clientX - drag.x;
      crop.dy = drag.dy + e.clientY - drag.y;
      clamp();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
      stage.addEventListener(type, () => (drag = null)),
    );
    $("#cropZoom").oninput = (e) => {
      if (crop) {
        crop.zoom = Number(e.target.value);
        clamp();
      }
    };
    window.addEventListener("resize", clamp);
    $("#cropConfirm").onclick = async () => {
      if (!crop || busy) return;
      if (Number(limits.avatar_remaining ?? 3) <= 0) {
        closeCrop();
        return notify("今天头像已经更换3次，明天可以继续更换");
      }
      const st = crop,
        scale = st.scale * st.zoom,
        side = st.size / scale;
      const sx = (st.nw - side) / 2 - st.dx / scale,
        sy = (st.nh - side) / 2 - st.dy / scale;
      let data;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 420;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 420, 420);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          $("#cropImage"),
          Math.max(0, sx),
          Math.max(0, sy),
          side,
          side,
          0,
          0,
          420,
          420,
        );
        data = canvas.toDataURL("image/jpeg", 0.84);
      } catch {
        notify("图片无法裁剪，请换一张 JPG 或 PNG 图片");
        return;
      }
      closeCrop();
      busy = true;
      refreshVersion++;
      $("#changeAvatar").disabled = true;
      notify("正在同步头像…");
      try {
        const j = await api("upload_avatar", { person: ME, data_url: data });
        if (!j.profile?.avatar_url) throw new Error("未收到保存结果，请重试");
        applyLimits(j.limits);
        merge(j.profile);
        paint();
        channel?.postMessage({ type: "profile", profile: j.profile });
        window.dispatchEvent(
          new CustomEvent("cw:sync-now", { detail: { reason: "profile-avatar" } }),
        );
        notify(`头像已同步给所有人 · 今天还可更换 ${limits.avatar_remaining} 次`);
      } catch (e) {
        applyLimits(e.limits);
        notify(
          (e.code === "avatar_limit" ? "" : "头像上传失败：") +
            (e.name === "AbortError" ? "连接超时，请重试" : e.message),
        );
      } finally {
        busy = false;
        $("#changeAvatar").disabled = Number(limits.avatar_remaining ?? 3) <= 0;
      }
    };
  }
  function bind() {
    ["nicknameInput", "roleInput"].forEach((id) =>
      $("#" + id).addEventListener(
        "input",
        (e) => (e.target.dataset.dirty = "1"),
      ),
    );
    $("#saveProfile").onclick = async () => {
      if (busy) return;
      const nick = $("#nicknameInput"),
        role = $("#roleInput"),
        nickname = nick.value.trim(),
        value = role.value.trim(),
        nicknameChanged = nickname !== (get(ME).nickname || ME);
      if (!nickname) return notify("昵称不能为空");
      if (nicknameChanged && Number(limits.nickname_remaining ?? 3) <= 0)
        return notify("今天昵称已经修改3次，明天可以继续修改；职责仍可单独修改");
      busy = true;
      refreshVersion++;
      $("#saveProfile").disabled = true;
      notify("正在同步资料…");
      try {
        const j = await api("update_profile", {
          person: ME,
          nickname,
          role: value,
        });
        if (!j.profile) throw new Error("未收到保存结果，请重试");
        applyLimits(j.limits);
        if (nick.value.trim() === nickname) delete nick.dataset.dirty;
        if (role.value.trim() === value) delete role.dataset.dirty;
        merge(j.profile);
        paint();
        channel?.postMessage({ type: "profile", profile: j.profile });
        window.dispatchEvent(
          new CustomEvent("cw:sync-now", { detail: { reason: "profile-update" } }),
        );
        notify(
          nicknameChanged
            ? `昵称已同步给所有场景 · 今天还可修改 ${limits.nickname_remaining} 次`
            : "个人资料已同步",
        );
      } catch (e) {
        applyLimits(e.limits);
        notify("保存失败，输入已保留：" + e.message);
      } finally {
        busy = false;
        $("#saveProfile").disabled = false;
      }
    };
    $("#changeAvatar").onclick = () => {
      if (busy) return;
      if (Number(limits.avatar_remaining ?? 3) <= 0)
        return notify("今天头像已经更换3次，明天可以继续更换");
      $("#avatarInput").value = "";
      $("#avatarInput").click();
    };
    $("#avatarInput").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f || busy) return;
      if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(f.type))
        return notify("请选择 JPG、PNG 或其他常见照片格式");
      if (f.size > 20 * 1024 * 1024)
        return notify("照片超过 20 MB，请先缩小后再上传");
      const url = URL.createObjectURL(f),
        img = $("#cropImage");
      img.onload = () => {
        crop = {
          url,
          nw: img.naturalWidth,
          nh: img.naturalHeight,
          zoom: 1,
          dx: 0,
          dy: 0,
        };
        $("#avatarCropOverlay").classList.add("show");
        $("#cropZoom").value = "1";
        clamp();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        notify("无法读取此照片，请转为 JPG 或 PNG 后重试");
      };
      img.src = url;
    };
    channel?.addEventListener("message", (e) => {
      if (e.data?.type === "profile") {
        refreshVersion++;
        if (merge(e.data.profile)) paint();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refresh();
    });
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
  }
  function init() {
    window.CWProfiles = {
      get,
      label,
      imageUrl,
      refresh,
      paintAvatar,
      limits: () => ({ ...limits }),
    };
    ensureCrop();
    bind();
    $("#switchIdentity")?.closest(".card")?.remove();
    limitHint();
    refresh();
    setInterval(() => {
      if (!document.hidden) refresh();
    }, 2500);
    document.documentElement.classList.add("profile-sync-ready");
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();