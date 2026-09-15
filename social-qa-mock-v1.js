(() => {
  "use strict";
  if (window.CWSession?.qa !== true) return;
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME = new URLSearchParams(location.search).get("person") || "瑞子",
    now = new Date().toISOString();
  const prev = window.fetch.bind(window);
  const res = (o, s = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(o), {
        status: s,
        headers: { "Content-Type": "application/json" },
      }),
    );
  const svg = (p) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dcebec"/><text x="300" y="180" font-size="46" text-anchor="middle" fill="#0b6078">${p}</text><text x="300" y="235" font-size="24" text-anchor="middle" fill="#496975">拍照灵感</text></svg>`)}`;
  let state = {
    profiles: TEAM.map((p, i) => ({
      person: p,
      nickname: p + "昵称",
      role: ["酒店 / 账本", "攻略 / 路况", "机票 / 航班", "租车 / 车务"][i],
      last_seen: now,
      updated_at: now,
      avatar_url: svg(p),
    })),
    statuses: [
      {
        person: "普子",
        emoji: "🍜",
        label: "饿了",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        updated_at: now,
      },
    ],
    nudges: [],
    readiness: [],
    driver_sessions: [
      {
        id: "qa-driver",
        person: "辉子",
        started_at: new Date(Date.now() - 42 * 60000).toISOString(),
        ended_at: null,
      },
    ],
    expense_reactions: [],
    progress: [],
    inspirations: [
      {
        id: "qa-insp-1",
        day_date: "2026-10-03",
        place: "折多山",
        title: "男生背影 + 经幡",
        pose_tip: "人物占画面1/4，侧身，2X压缩背景。",
        tags: ["男生", "背影", "风景"],
        source_type: "开放图库",
        source_url: "https://example.com",
        image_url: svg("折多山"),
        sort_order: 10,
      },
      {
        id: "qa-insp-2",
        day_date: "2026-10-04",
        place: "塔公草原",
        title: "草原四人并排",
        pose_tip: "前后错开半步，视线方向不同。",
        tags: ["四人", "合影"],
        source_type: "开放图库",
        source_url: "https://example.com",
        image_url: svg("塔公草原"),
        sort_order: 20,
      },
      {
        id: "qa-insp-3",
        day_date: "2026-10-05",
        place: "双桥沟",
        title: "栈道走路抓拍",
        pose_tip: "保持4–6米距离，开启连拍。",
        tags: ["走路", "雪山"],
        source_type: "开放图库",
        source_url: "https://example.com",
        image_url: svg("双桥沟"),
        sort_order: 30,
      },
    ],
    votes: [],
  };
  window.fetch = async (input, init = {}) => {
    const u = String(typeof input === "string" ? input : input?.url || "");
    if (!u.includes("/functions/v1/trip-social")) return prev(input, init);
    let b = {};
    try {
      b = JSON.parse(init.body || "{}");
    } catch {}
    const a = b.action,
      p = b.payload || {};
    if (a === "state")
      return res({ ok: true, server_time: new Date().toISOString(), ...state });
    if (a === "set_status") {
      state.statuses = state.statuses.filter((x) => x.person !== ME);
      state.statuses.push({
        person: ME,
        emoji: p.emoji,
        label: p.label,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        updated_at: now,
      });
      return res({ ok: true });
    }
    if (a === "clear_status") {
      state.statuses = state.statuses.filter((x) => x.person !== ME);
      return res({ ok: true });
    }
    if (a === "nudge") {
      state.nudges.unshift({
        id: "n" + Date.now(),
        from_person: ME,
        to_person: p.to_person,
        kind: p.kind,
        message: p.message,
        created_at: new Date().toISOString(),
        seen_at: null,
      });
      return res({ ok: true });
    }
    if (a === "mark_nudges_seen") {
      state.nudges.forEach(
        (x) => (x.seen_at = x.seen_at || new Date().toISOString()),
      );
      return res({ ok: true });
    }
    if (a === "set_ready") {
      state.readiness = state.readiness.filter(
        (x) => !(x.checkpoint_key === p.checkpoint_key && x.person === ME),
      );
      state.readiness.push({
        checkpoint_key: p.checkpoint_key,
        checkpoint_label: p.checkpoint_label,
        person: ME,
        ready: !!p.ready,
        updated_at: new Date().toISOString(),
      });
      return res({ ok: true });
    }
    if (a === "take_wheel") {
      state.driver_sessions.forEach((x) => {
        if (!x.ended_at) x.ended_at = new Date().toISOString();
      });
      state.driver_sessions.unshift({
        id: "d" + Date.now(),
        person: ME,
        started_at: new Date().toISOString(),
        ended_at: null,
      });
      return res({ ok: true });
    }
    if (a === "stop_driving") {
      state.driver_sessions.forEach((x) => {
        if (x.person === ME && !x.ended_at)
          x.ended_at = new Date().toISOString();
      });
      return res({ ok: true });
    }
    if (a === "react_expense") {
      state.expense_reactions = state.expense_reactions.filter(
        (x) =>
          !(String(x.expense_id) === String(p.expense_id) && x.person === ME),
      );
      state.expense_reactions.push({
        expense_id: p.expense_id,
        person: ME,
        reaction: p.reaction,
        updated_at: new Date().toISOString(),
      });
      return res({ ok: true });
    }
    if (a === "vote_inspiration") {
      state.votes = state.votes.filter(
        (x) => !(x.inspiration_id === p.inspiration_id && x.person === ME),
      );
      state.votes.push({
        inspiration_id: p.inspiration_id,
        person: ME,
        vote: p.vote,
        updated_at: new Date().toISOString(),
      });
      return res({ ok: true });
    }
    if (a === "add_inspiration") {
      state.inspirations.push({
        id: "i" + Date.now(),
        day_date: p.day_date,
        place: p.place,
        title: p.title,
        pose_tip: p.pose_tip,
        tags: p.tags || [],
        source_type: "小红书/外部链接",
        source_url: p.source_url,
        image_url: p.data_url || svg(p.place),
        sort_order: 500,
      });
      return res({ ok: true });
    }
    return res({ ok: true });
  };
})();
