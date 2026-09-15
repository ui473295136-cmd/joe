(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person") ||
    "瑞子";
  const profileMap = new Map();
  const aliases = new Map(TEAM.map((p) => [p, new Set([p])]));
  const textTemplate = new WeakMap();
  const textRendered = new WeakMap();
  const attrTemplate = new WeakMap();
  const ATTRS = ["aria-label", "title", "alt"];
  const allAliases = () =>
    [...aliases.entries()]
      .flatMap(([p, set]) => [...set].filter(Boolean).map((a) => [p, a]))
      .sort((a, b) => b[1].length - a[1].length);
  const hasPerson = (s) => {
    const v = String(s || "");
    return allAliases().some(([, a]) => v.includes(a));
  };
  const label = (p) =>
    profileMap.get(p)?.nickname || window.CWProfiles?.get?.(p)?.nickname || p;
  const renderString = (s) => {
    let out = String(s ?? "");
    const tokens = TEAM.map((_, i) => `\uE100CW${i}\uE101`);
    for (const [p, a] of allAliases()) {
      const i = TEAM.indexOf(p);
      if (i >= 0) out = out.split(a).join(tokens[i]);
    }
    TEAM.forEach((p, i) => {
      out = out.split(tokens[i]).join(label(p));
    });
    return out;
  };
  function excludedText(node) {
    const p = node?.parentElement;
    return !p || !!p.closest("script,style,textarea,input,select,option,[contenteditable=true],#nicknameInput,#roleInput");
  }
  function renderText(node, acceptExternal = false) {
    if (!node || node.nodeType !== Node.TEXT_NODE || excludedText(node)) return;
    const current = node.nodeValue || "";
    const last = textRendered.get(node);
    if (acceptExternal && last != null && current !== last) {
      if (hasPerson(current)) textTemplate.set(node, current);
      else {
        textTemplate.delete(node);
        textRendered.delete(node);
        return;
      }
    }
    if (!textTemplate.has(node)) {
      if (!hasPerson(current)) return;
      textTemplate.set(node, current);
    }
    const next = renderString(textTemplate.get(node));
    if (current !== next) node.nodeValue = next;
    textRendered.set(node, next);
  }
  function renderAttrs(el, acceptExternal = false) {
    if (!(el instanceof Element) || el.matches("input,textarea,select,option")) return;
    let map = attrTemplate.get(el);
    if (!map) {
      map = new Map();
      attrTemplate.set(el, map);
    }
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const current = el.getAttribute(attr) || "";
      const rec = map.get(attr);
      if (acceptExternal && rec && current !== rec.rendered) {
        if (hasPerson(current)) map.set(attr, { template: current, rendered: current });
        else {
          map.delete(attr);
          continue;
        }
      }
      if (!map.has(attr)) {
        if (!hasPerson(current)) continue;
        map.set(attr, { template: current, rendered: current });
      }
      const item = map.get(attr),
        next = renderString(item.template);
      if (current !== next) el.setAttribute(attr, next);
      item.rendered = next;
    }
  }
  function paintKnownAvatars(root = document) {
    const all = root.querySelectorAll?.(".avatar[data-person],[data-profile-avatar]") || [];
    for (const el of all) {
      const p = el.dataset.profileAvatar || el.dataset.person;
      if (TEAM.includes(p)) window.CWProfiles?.paintAvatar?.(el, p);
    }
    for (const p of TEAM) {
      const u = window.CWProfiles?.imageUrl?.(p);
      if (!u) continue;
      root.querySelectorAll?.(`[data-social-person="${p}"] .cw-member-face img`).forEach((img) => {
        if (img.src !== u) img.src = u;
        img.alt = label(p);
      });
    }
    const daily = document.querySelector("#cwDailyAvatar"),
      dailyUrl = window.CWProfiles?.imageUrl?.(ME);
    if (daily && dailyUrl) {
      daily.style.backgroundImage = `url(${JSON.stringify(dailyUrl)})`;
      daily.textContent = "";
    }
  }
  function syncSocialCache(profiles) {
    try {
      const key = `cw-social-cache-${ME}`,
        cached = JSON.parse(localStorage.getItem(key) || "null") || {
          saved: Date.now(),
          data: {},
        },
        data = cached.data || {},
        list = Array.isArray(data.profiles) ? [...data.profiles] : [];
      for (const p of profiles) {
        const i = list.findIndex((x) => x.person === p.person);
        if (i >= 0) list[i] = { ...list[i], ...p };
        else list.push(p);
      }
      data.profiles = list;
      localStorage.setItem(key, JSON.stringify({ saved: Date.now(), data }));
    } catch {}
  }
  function scan(root = document) {
    if (root.nodeType === Node.TEXT_NODE) renderText(root);
    if (root instanceof Element) renderAttrs(root);
    const base =
      root.nodeType === Node.DOCUMENT_NODE ? document.documentElement : root;
    if (base?.nodeType === Node.ELEMENT_NODE) {
      const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) renderText(n);
      renderAttrs(base);
      base
        .querySelectorAll?.("[aria-label],[title],[alt]")
        .forEach((el) => renderAttrs(el));
    }
    paintKnownAvatars(root.nodeType === Node.DOCUMENT_NODE ? document : root);
  }
  function rerender() {
    scan(document);
    paintKnownAvatars(document);
    const dailyName = document.querySelector("#cwDailyName");
    if (dailyName) dailyName.textContent = `${label(ME)}，今天注意这些`;
  }
  window.addEventListener("cw:profiles", (e) => {
    const incoming = e.detail?.profiles || [];
    for (const p of incoming) {
      if (!TEAM.includes(p.person)) continue;
      const old = profileMap.get(p.person);
      if (old?.nickname) aliases.get(p.person).add(old.nickname);
      if (p.nickname) aliases.get(p.person).add(p.nickname);
      profileMap.set(p.person, p);
    }
    syncSocialCache(incoming);
    rerender();
    window.dispatchEvent(
      new CustomEvent("cw:profile-display", {
        detail: {
          profiles: TEAM.map((p) => profileMap.get(p)).filter(Boolean),
        },
      }),
    );
  });
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") renderText(m.target, true);
      else if (m.type === "attributes") renderAttrs(m.target, true);
      else
        for (const n of m.addedNodes) {
          if (n.nodeType === Node.TEXT_NODE) renderText(n);
          else if (n.nodeType === Node.ELEMENT_NODE) scan(n);
        }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => scan(document), {
      once: true,
    });
  else scan(document);
  window.CWProfileDisplay = { label, rerender };
})();
