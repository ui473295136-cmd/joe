(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const profileMap = new Map();
  const textTemplate = new WeakMap();
  const textRendered = new WeakMap();
  const attrTemplate = new WeakMap();
  const ATTRS = ["aria-label", "title", "alt"];
  const hasPerson = (s) => TEAM.some((p) => String(s || "").includes(p));
  const label = (p) => profileMap.get(p)?.nickname || window.CWProfiles?.get?.(p)?.nickname || p;
  const renderString = (s) => {
    let out = String(s ?? "");
    for (const p of TEAM) out = out.split(p).join(label(p));
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
  }
  function scan(root = document) {
    if (root.nodeType === Node.TEXT_NODE) renderText(root);
    if (root instanceof Element) renderAttrs(root);
    const base = root.nodeType === Node.DOCUMENT_NODE ? document.documentElement : root;
    if (base?.nodeType === Node.ELEMENT_NODE) {
      const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) renderText(n);
      renderAttrs(base);
      base.querySelectorAll?.("[aria-label],[title],[alt]").forEach((el) => renderAttrs(el));
    }
    paintKnownAvatars(root.nodeType === Node.DOCUMENT_NODE ? document : root);
  }
  function rerender() {
    scan(document);
    for (const p of TEAM) {
      document.querySelectorAll(`.avatar[data-person="${p}"],[data-profile-avatar="${p}"]`).forEach((el) =>
        window.CWProfiles?.paintAvatar?.(el, p),
      );
    }
  }
  window.addEventListener("cw:profiles", (e) => {
    for (const p of e.detail?.profiles || []) if (TEAM.includes(p.person)) profileMap.set(p.person, p);
    rerender();
    window.dispatchEvent(
      new CustomEvent("cw:profile-display", {
        detail: { profiles: TEAM.map((p) => profileMap.get(p)).filter(Boolean) },
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  else scan(document);
  window.CWProfileDisplay = { label, rerender };
})();
