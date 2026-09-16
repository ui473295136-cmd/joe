(() => {
  "use strict";
  const PEOPLE = ["瑞子", "普子", "航子", "辉子"],
    GUEST = "访客",
    IDENTITIES = [...PEOPLE, GUEST];
  const prefix = "cw-device-session-";
  const endpoint =
    "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-auth";
  const guestEndpoint =
    "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-guest";
  const read = (storage, key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (storage, key, value) => {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const remove = (storage, key) => {
    try {
      storage.removeItem(key);
    } catch {}
  };
  const isGuestRoute = () =>
    new URLSearchParams(location.search).get("guest") === "1";
  const valid = (s) =>
    s &&
    typeof s.token === "string" &&
    s.token.length >= 20 &&
    Number.isFinite(Date.parse(s.expires_at)) &&
    Date.parse(s.expires_at) > Date.now();
  function forget(person) {
    if (!IDENTITIES.includes(person)) return;
    remove(localStorage, prefix + person);
    remove(sessionStorage, `cw-auth-${person}`);
    remove(sessionStorage, `cw-auth-exp-${person}`);
  }
  function get(person) {
    if (!IDENTITIES.includes(person)) return null;
    const current = {
      token: read(sessionStorage, `cw-auth-${person}`),
      expires_at: read(sessionStorage, `cw-auth-exp-${person}`),
    };
    let remembered = null;
    if (person !== GUEST) {
      try {
        remembered = JSON.parse(read(localStorage, prefix + person) || "null");
      } catch {}
    }
    if (valid(current))
      return {
        ...current,
        remembered:
          person !== GUEST &&
          valid(remembered) &&
          current.token === remembered.token,
      };
    if (person !== GUEST && valid(remembered)) {
      write(sessionStorage, `cw-auth-${person}`, remembered.token);
      write(sessionStorage, `cw-auth-exp-${person}`, remembered.expires_at);
      return { ...remembered, remembered: true };
    }
    forget(person);
    return null;
  }
  function save(person, session, remember = true) {
    if (!IDENTITIES.includes(person) || !valid(session))
      throw new Error("登录凭证不完整，请重试");
    const record = { token: session.token, expires_at: session.expires_at };
    const tabSaved = write(sessionStorage, `cw-auth-${person}`, record.token);
    write(sessionStorage, `cw-auth-exp-${person}`, record.expires_at);
    const canRemember = person !== GUEST && remember;
    const saved =
      canRemember && write(localStorage, prefix + person, JSON.stringify(record));
    if (!canRemember) remove(localStorage, prefix + person);
    if (!tabSaved && !saved)
      throw new Error("浏览器禁止保存登录状态，请允许此网站使用存储后重试");
    if (person !== GUEST) write(localStorage, "cw-person", person);
    return !!saved;
  }
  async function request(action, payload, timeout = 9000) {
    const ctrl = new AbortController(),
      timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_slug: "chuanxi2026", action, payload }),
        signal: ctrl.signal,
      });
      const body = await r.json();
      if (!r.ok)
        throw Object.assign(new Error(body.error || "登录验证失败"), body, {
          status: r.status,
        });
      return body;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("连接超时，请重试");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async function validate(person) {
    const s = get(person);
    if (!s) return null;
    try {
      const result = await request("validate", { person, token: s.token });
      if (!result.valid) {
        forget(person);
        return null;
      }
      const next = { ...s, expires_at: result.expires_at || s.expires_at };
      if (person !== GUEST && s.remembered) save(person, next, true);
      else {
        write(sessionStorage, `cw-auth-${person}`, next.token);
        write(sessionStorage, `cw-auth-exp-${person}`, next.expires_at);
      }
      return next;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        forget(person);
        return null;
      }
      throw e;
    }
  }
  function activateGuestShadow(session) {
    if (!valid(session)) return false;
    if (read(sessionStorage, "cw-guest-shadow-active") !== "1") {
      const token = read(sessionStorage, "cw-auth-瑞子"),
        exp = read(sessionStorage, "cw-auth-exp-瑞子");
      write(sessionStorage, "cw-guest-backup-token", token == null ? "__NONE__" : token);
      write(sessionStorage, "cw-guest-backup-exp", exp == null ? "__NONE__" : exp);
      write(sessionStorage, "cw-guest-shadow-active", "1");
    }
    write(sessionStorage, "cw-auth-瑞子", session.token);
    write(sessionStorage, "cw-auth-exp-瑞子", session.expires_at);
    return true;
  }
  function restoreGuestShadow() {
    if (read(sessionStorage, "cw-guest-shadow-active") !== "1") return;
    const token = read(sessionStorage, "cw-guest-backup-token"),
      exp = read(sessionStorage, "cw-guest-backup-exp");
    if (token && token !== "__NONE__") write(sessionStorage, "cw-auth-瑞子", token);
    else remove(sessionStorage, "cw-auth-瑞子");
    if (exp && exp !== "__NONE__") write(sessionStorage, "cw-auth-exp-瑞子", exp);
    else remove(sessionStorage, "cw-auth-exp-瑞子");
    ["cw-guest-backup-token", "cw-guest-backup-exp", "cw-guest-shadow-active"].forEach((k) =>
      remove(sessionStorage, k),
    );
  }
  async function issueGuest() {
    const session = await request("guest", {});
    save(GUEST, session, false);
    activateGuestShadow(session);
    return session;
  }
  function activePerson() {
    if (isGuestRoute()) return GUEST;
    return (
      new URLSearchParams(location.search).get("person") ||
      read(localStorage, "cw-person") ||
      ""
    );
  }
  function activeSession() {
    return get(activePerson());
  }
  async function logoutAll() {
    const records = IDENTITIES.map((person) => ({ person, session: get(person) })).filter(
      (x) => x.session,
    );
    IDENTITIES.forEach(forget);
    restoreGuestShadow();
    remove(sessionStorage, "cw-admin");
    remove(localStorage, "cw-person");
    const result = await Promise.allSettled(
      records.map(({ person, session }) =>
        request("logout", { person, token: session.token }, 4000),
      ),
    );
    return result.every((x) => x.status === "fulfilled");
  }
  function guestReadRequest(name, action, body, session, raw, init) {
    const map = {
      "trip-sync:get_state": "sync_state",
      "trip-profile:list_profiles": "profiles",
      "trip-social:state": "social_state",
      "trip-assist:state": "assist_state",
      "trip-interaction:state": "interaction_state",
    };
    const guestAction = map[`${name}:${action}`];
    if (!guestAction)
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: "访客模式为只读，只能查看实时信息",
            code: "guest_read_only",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      );
    const payload = {
      token: session.token,
      ...(guestAction === "assist_state" && body.payload?.date
        ? { date: body.payload.date }
        : {}),
    };
    return raw(guestEndpoint, {
      ...init,
      method: "POST",
      headers: { ...(init.headers || {}), "Content-Type": "application/json" },
      body: JSON.stringify({
        trip_slug: body.trip_slug || "chuanxi2026",
        action: guestAction,
        payload,
      }),
    });
  }
  function installFetchAuth() {
    if (qa || window.__cwSignedFetch) return;
    window.__cwSignedFetch = true;
    const raw = window.fetch.bind(window);
    const allowed = new Set(["trip-sync", "trip-profile", "trip-trash"]);
    window.fetch = (input, init = {}) => {
      let url;
      try {
        url = new URL(
          typeof input === "string" ? input : input.url,
          location.href,
        );
      } catch {
        return raw(input, init);
      }
      const name = url.pathname.split("/").at(-1);
      if (
        url.origin !== "https://wpfqcztbxxarsrruuuce.supabase.co" ||
        typeof init.body !== "string"
      )
        return raw(input, init);
      let body;
      try {
        body = JSON.parse(init.body);
      } catch {
        return raw(input, init);
      }
      if (isGuestRoute()) {
        if (name === "trip-auth" || name === "trip-guest") return raw(input, init);
        const session = get(GUEST);
        if (!session)
          return Promise.resolve(
            new Response(JSON.stringify({ error: "访客会话已失效，请重新进入" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }),
          );
        return guestReadRequest(
          name,
          String(body.action || ""),
          body,
          session,
          raw,
          init,
        );
      }
      if (!allowed.has(name)) return raw(input, init);
      const person =
          new URLSearchParams(location.search).get("person") ||
          read(localStorage, "cw-person"),
        session = get(person);
      if (!session)
        return Promise.resolve(
          new Response(JSON.stringify({ error: "登录已失效，请重新进入" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        );
      return raw(input, {
        ...init,
        body: JSON.stringify({
          ...body,
          payload: {
            ...body.payload,
            session_person: person,
            session_token: session.token,
          },
        }),
      });
    };
  }
  const qa =
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
    new URLSearchParams(location.search).get("qa") === "1";
  if (!isGuestRoute()) restoreGuestShadow();
  window.CWSession = {
    PEOPLE,
    GUEST,
    IDENTITIES,
    get,
    save,
    forget,
    request,
    validate,
    issueGuest,
    activateGuestShadow,
    restoreGuestShadow,
    activePerson,
    activeSession,
    isGuest: isGuestRoute,
    logoutAll,
    installFetchAuth,
    qa,
  };
})();