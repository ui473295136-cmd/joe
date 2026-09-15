(() => {
  "use strict";

  if (window.CWOffline?.installed) return;

  const DB_NAME = "cw-offline-v1";
  const DB_VERSION = 1;
  const TRIP = "chuanxi2026";
  const API_ORIGIN = "https://wpfqcztbxxarsrruuuce.supabase.co";
  const API_NAMES = new Set(["trip-sync", "trip-profile", "trip-trash"]);
  const rawFetch = window.fetch.bind(window);
  const nowIso = () => new Date().toISOString();
  const uid = (prefix = "local") =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  let dbPromise;
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function kvGet(key) {
    try {
      const d = await db();
      return await new Promise((resolve, reject) => {
        const tx = d.transaction("kv", "readonly");
        const req = tx.objectStore("kv").get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return undefined;
    }
  }

  async function kvSet(key, value) {
    try {
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction("kv", "readwrite");
        tx.objectStore("kv").put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  function blankState() {
    return {
      expenses: [],
      repayments: [],
      person_positions: [],
      trip_state: null,
      milestones: [],
      memories: [],
      parking: null,
      bookings: [],
      emergency_contacts: [],
      preferences: null,
      profiles: [],
      logs: [],
      ledger_acks: [],
    };
  }

  function normalizeState(value) {
    return { ...blankState(), ...(value || {}) };
  }

  async function getState() {
    return normalizeState(await kvGet("state"));
  }

  async function setState(value) {
    await kvSet("state", normalizeState(value));
  }

  async function getQueue() {
    const q = await kvGet("queue");
    return Array.isArray(q) ? q : [];
  }

  async function setQueue(q) {
    await kvSet("queue", q);
  }

  function person() {
    return (
      new URLSearchParams(location.search).get("person") ||
      localStorage.getItem("cw-person") ||
      "瑞子"
    );
  }

  function addLocalLog(state, category, action, detail, who = person()) {
    state.logs = state.logs || [];
    state.logs.unshift({
      id: uid("log"),
      person: who,
      category,
      action,
      detail: detail || "离线保存，联网后自动同步",
      created_at: nowIso(),
      _offline: true,
    });
    state.logs = state.logs.slice(0, 250);
  }

  function upsertBy(list, key, value) {
    const arr = Array.isArray(list) ? list.slice() : [];
    const i = arr.findIndex((x) => String(x?.[key]) === String(value?.[key]));
    if (i >= 0) arr[i] = { ...arr[i], ...value };
    else arr.push(value);
    return arr;
  }

  function response(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  function parseCall(input, init = {}) {
    let url;
    try {
      url = new URL(typeof input === "string" ? input : input.url, location.href);
    } catch {
      return null;
    }
    const name = url.pathname.split("/").at(-1);
    if (
      url.origin !== API_ORIGIN ||
      !API_NAMES.has(name) ||
      String(init.method || (typeof input !== "string" ? input.method : "GET")).toUpperCase() !== "POST" ||
      typeof init.body !== "string"
    )
      return null;
    try {
      const body = JSON.parse(init.body);
      return {
        name,
        action: String(body.action || ""),
        payload: body.payload || {},
        trip_slug: body.trip_slug || TRIP,
      };
    } catch {
      return null;
    }
  }

  async function enqueue(action, payload, meta = {}) {
    if (["heartbeat"].includes(action)) return;
    let q = await getQueue();
    if (action === "update_person_position") {
      q = q.filter(
        (x) =>
          !(
            x.action === "update_person_position" &&
            x.payload?.person === payload?.person
          ),
      );
    }
    q.push({
      id: uid("q"),
      action,
      payload,
      created_at: Date.now(),
      ...meta,
    });
    await setQueue(q);
  }

  function optimistic(state, action, payload) {
    const p = payload || {};
    const ts = nowIso();
    let row = null;
    let tempId = null;

    switch (action) {
      case "heartbeat": {
        state.profiles = upsertBy(state.profiles, "person", {
          person: p.person || person(),
          last_seen: ts,
        });
        break;
      }
      case "update_person_position": {
        row = {
          ...p,
          id: p.id || uid("pos"),
          updated_at: ts,
          captured_at: ts,
        };
        const current = (state.person_positions || []).filter(
          (x) => x.person !== p.person,
        );
        current.push(row);
        state.person_positions = current;
        break;
      }
      case "update_profile": {
        row = {
          ...(state.profiles || []).find((x) => x.person === p.person),
          person: p.person || person(),
          nickname: p.nickname || p.person || person(),
          role: p.role,
          last_seen: ts,
          updated_at: ts,
        };
        state.profiles = upsertBy(state.profiles, "person", row);
        addLocalLog(state, "资料", "修改个人资料", "已离线保存个人资料", p.person);
        break;
      }
      case "upload_avatar": {
        const who = p.person || person();
        row = {
          ...(state.profiles || []).find((x) => x.person === who),
          person: who,
          avatar_url: p.data_url || null,
          last_seen: ts,
          updated_at: ts,
        };
        state.profiles = upsertBy(state.profiles, "person", row);
        addLocalLog(state, "资料", "更新头像", "头像已离线保存", who);
        break;
      }
      case "add_expense": {
        tempId = uid("expense");
        row = {
          id: tempId,
          category: p.category || "其他",
          amount: Number(p.amount || 0),
          note: p.note || "",
          payer: p.payer,
          participants: Array.isArray(p.participants) ? p.participants : [],
          settled: !!p.settled,
          status: p.status || "paid",
          created_at: ts,
          _offline: true,
        };
        state.expenses = [...(state.expenses || []), row];
        addLocalLog(
          state,
          "账本",
          "新增花销",
          `${row.category} ${row.amount.toFixed(2)} 元 · 离线保存`,
          p.actor || p.payer,
        );
        break;
      }
      case "update_expense": {
        state.expenses = (state.expenses || []).map((x) =>
          String(x.id) === String(p.id)
            ? {
                ...x,
                ...p,
                amount: p.amount == null ? x.amount : Number(p.amount),
                updated_at: ts,
                _offline: true,
              }
            : x,
        );
        state.ledger_acks = (state.ledger_acks || []).filter(
          (x) => String(x.item_id) !== String(p.id),
        );
        addLocalLog(state, "账本", "修改账单", "账单修改已离线保存", p.actor);
        row = (state.expenses || []).find((x) => String(x.id) === String(p.id));
        break;
      }
      case "delete_expense": {
        state.expenses = (state.expenses || []).filter(
          (x) => String(x.id) !== String(p.id),
        );
        state.ledger_acks = (state.ledger_acks || []).filter(
          (x) => String(x.item_id) !== String(p.id),
        );
        addLocalLog(state, "账本", "删除账单", "删除操作已离线保存", p.actor);
        break;
      }
      case "acknowledge_expense": {
        row = {
          id: uid("ack"),
          item_type: "expense",
          item_id: p.expense_id,
          person: p.person || person(),
          acked_at: ts,
          _offline: true,
        };
        state.ledger_acks = [
          ...(state.ledger_acks || []).filter(
            (x) =>
              !(
                String(x.item_id) === String(p.expense_id) &&
                x.person === row.person
              ),
          ),
          row,
        ];
        addLocalLog(state, "账本", "确认账单", "已离线确认该笔共同支出", row.person);
        break;
      }
      case "add_repayment": {
        tempId = uid("repayment");
        row = {
          id: tempId,
          from_person: p.from_person,
          to_person: p.to_person,
          amount: Number(p.amount || 0),
          note: p.note || "收付款",
          created_at: ts,
          _offline: true,
        };
        state.repayments = [...(state.repayments || []), row];
        addLocalLog(state, "账本", "记录收付款", "收付款已离线保存", p.actor || p.from_person);
        break;
      }
      case "update_repayment": {
        state.repayments = (state.repayments || []).map((x) =>
          String(x.id) === String(p.id)
            ? { ...x, ...p, amount: Number(p.amount ?? x.amount), updated_at: ts, _offline: true }
            : x,
        );
        row = (state.repayments || []).find((x) => String(x.id) === String(p.id));
        addLocalLog(state, "账本", "修改收付款", "修改已离线保存", p.actor);
        break;
      }
      case "delete_repayment": {
        state.repayments = (state.repayments || []).filter(
          (x) => String(x.id) !== String(p.id),
        );
        addLocalLog(state, "账本", "删除收付款", "删除操作已离线保存", p.actor);
        break;
      }
      case "attach_receipt": {
        state.expenses = (state.expenses || []).map((x) =>
          String(x.id) === String(p.expense_id)
            ? { ...x, receipt_url: p.data_url || x.receipt_url, _offline: true }
            : x,
        );
        row = { id: p.expense_id };
        break;
      }
      case "add_booking": {
        tempId = uid("booking");
        row = {
          id: tempId,
          kind: p.kind || "其他",
          title: p.title || "",
          details: p.details || "",
          uploaded_by: p.uploaded_by || person(),
          status: p.status || "已确认",
          booking_date: p.booking_date || null,
          created_at: ts,
          _offline: true,
        };
        state.bookings = [...(state.bookings || []), row];
        addLocalLog(state, "预订", "新增预订", `${row.kind} · ${row.title} · 离线保存`, row.uploaded_by);
        break;
      }
      case "upload_photo": {
        tempId = uid("memory");
        row = {
          id: tempId,
          uploaded_by: p.uploaded_by || person(),
          caption: p.caption || "川西记忆",
          url: p.data_url || "",
          created_at: ts,
          _offline: true,
        };
        state.memories = [row, ...(state.memories || [])];
        addLocalLog(state, "相册", "上传照片", `${row.caption} · 离线保存`, row.uploaded_by);
        break;
      }
      case "delete_photo": {
        state.memories = (state.memories || []).filter(
          (x) => String(x.id) !== String(p.id),
        );
        addLocalLog(state, "相册", "删除照片", "删除操作已离线保存", p.person);
        break;
      }
      case "save_parking": {
        row = { ...p, id: p.id || uid("parking"), updated_at: ts, _offline: true };
        state.parking = row;
        addLocalLog(state, "位置", "保存停车位置", p.note || "停车位置已离线保存", p.saved_by);
        break;
      }
      case "update_preferences": {
        row = { ...(state.preferences || {}), ...p, updated_at: ts, _offline: true };
        state.preferences = row;
        addLocalLog(state, "设置", "更新旅行设置", "设置已离线保存", p.updated_by);
        break;
      }
      case "upsert_emergency_contact": {
        row = { ...p, id: p.id || uid("emergency"), updated_at: ts, _offline: true };
        state.emergency_contacts = upsertBy(state.emergency_contacts, "id", row);
        break;
      }
      default:
        break;
    }

    return { state, row, tempId };
  }

  async function offlineCall(action, payload) {
    if (action === "get_state") return response(await getState());

    const state = await getState();
    const result = optimistic(state, action, payload);
    await setState(result.state);
    await enqueue(action, payload, result.tempId ? { tempId: result.tempId } : {});
    window.dispatchEvent(
      new CustomEvent("cw:offline-write", { detail: { action, pending: true } }),
    );
    return response({ ok: true, offline: true, row: result.row || null });
  }

  function remapPayload(payload, idMap) {
    const p = { ...(payload || {}) };
    for (const key of ["id", "expense_id", "item_id"]) {
      if (p[key] != null && idMap[p[key]]) p[key] = idMap[p[key]];
    }
    return p;
  }

  let flushing = false;
  async function flushQueue() {
    if (flushing || !navigator.onLine) return false;
    flushing = true;
    try {
      let q = await getQueue();
      if (!q.length) return true;
      const idMap = (await kvGet("idMap")) || {};
      const remaining = [];
      for (let i = 0; i < q.length; i++) {
        const item = q[i];
        const payload = remapPayload(item.payload, idMap);
        try {
          const r = await rawFetch(`${API_ORIGIN}/functions/v1/trip-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip_slug: TRIP, action: item.action, payload }),
          });
          const body = await r.clone().json().catch(() => ({}));
          if (!r.ok || body.ok === false) {
            remaining.push(...q.slice(i));
            break;
          }
          if (item.tempId && body.row?.id) {
            idMap[item.tempId] = body.row.id;
            await kvSet("idMap", idMap);
          }
        } catch {
          remaining.push(...q.slice(i));
          break;
        }
      }
      await setQueue(remaining);
      if (!remaining.length) {
        try {
          const r = await rawFetch(`${API_ORIGIN}/functions/v1/trip-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip_slug: TRIP, action: "get_state", payload: {} }),
          });
          if (r.ok) {
            const body = await r.json();
            await setState(body);
          }
        } catch {}
        window.dispatchEvent(new Event("cw:offline-synced"));
      }
      return !remaining.length;
    } finally {
      flushing = false;
    }
  }

  window.fetch = async (input, init = {}) => {
    const call = parseCall(input, init);
    if (!call || call.name !== "trip-sync") return rawFetch(input, init);

    if (!navigator.onLine) return offlineCall(call.action, call.payload);

    try {
      const r = await rawFetch(input, init);
      if (r.ok && call.action === "get_state") {
        r.clone()
          .json()
          .then(setState)
          .catch(() => {});
      }
      return r;
    } catch (error) {
      return offlineCall(call.action, call.payload);
    }
  };

  function removePhotoInspiration() {
    const headings = [...document.querySelectorAll("h1,h2,h3,.section-title,.title")];
    for (const h of headings) {
      if ((h.textContent || "").trim() !== "拍照灵感") continue;
      const target = h.closest(".card,section,article") || h.parentElement;
      target?.remove();
    }
  }

  function startCleanup() {
    removePhotoInspiration();
    const ob = new MutationObserver(removePhotoInspiration);
    ob.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => ob.disconnect(), 15000);
  }

  addEventListener("online", () => {
    flushQueue().catch(() => {});
  });
  addEventListener("DOMContentLoaded", startCleanup, { once: true });
  if (document.readyState !== "loading") startCleanup();

  if (navigator.onLine) setTimeout(() => flushQueue().catch(() => {}), 1200);

  window.CWOffline = {
    installed: true,
    flush: flushQueue,
    getState,
    pending: async () => (await getQueue()).length,
  };
})();