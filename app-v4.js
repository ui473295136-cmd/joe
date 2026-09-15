(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ROLE = {
    瑞子: "酒店 / 账本",
    普子: "攻略 / 路况",
    航子: "机票 / 航班",
    辉子: "租车 / 车务",
  };
  const FN = "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-sync",
    TRIP = "chuanxi2026";
  const qs = new URLSearchParams(location.search);
  const ME = qs.get("person") || localStorage.getItem("cw-person") || "瑞子";
  if (!TEAM.includes(ME)) {
    location.replace("./");
    return;
  }
  localStorage.setItem("cw-person", ME);
  document.title = `${ME}的川西自驾｜2026`;
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)],
    money = (n) =>
      "¥" +
      Number(n || 0).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  const when = (t) =>
    t
      ? new Date(t).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—";
  const ALT = {
    天府国际机场: 500,
    雅安: 600,
    泸定: 1300,
    康定: 2560,
    折多山: 4298,
    新都桥: 3460,
    塔公: 3730,
    八美: 3500,
    丹巴: 1900,
    中路藏寨: 2100,
    小金: 2350,
    双桥沟: 3850,
    四姑娘山镇: 3180,
    卧龙: 2000,
    映秀: 900,
    都江堰: 700,
    还车点: 500,
  };
  const DAYS = [
    {
      date: "2026-10-02",
      route: "天府机场 → 雅安",
      km: "185–195km",
      drive: "3.5–4小时",
      hotel: "雅安空山云宿城市民宿",
      wear: "薄外套即可，夜间到雅安后注意温差。",
      risk: "第一天重点是取车验车、补给和睡眠，不安排赶景点。",
      points: [
        ["16:00", "天府国际机场", 30.312, 104.441, "落地 / 取行李"],
        ["17:15", "天府国际机场", 30.312, 104.441, "取车完成 / 出发"],
        ["19:00", "服务区", 30.16, 103.65, "休息 10–15 分钟"],
        ["21:00", "雅安", 29.98, 103, "晚餐 / 补给 / 入住"],
      ],
    },
    {
      date: "2026-10-03",
      route: "雅安 → 泸定 → 康定 → 折多山 → 新都桥",
      km: "270–290km",
      drive: "6.5–8小时",
      hotel: "上喜民宿（新都桥店）",
      wear: "速干层 + 抓绒/薄羽绒 + 防风防水外层，折多山加帽子手套。",
      risk: "折多山约4298m，停留要短，减少剧烈运动；康定/新都桥及时加油。",
      points: [
        ["06:00", "雅安", 29.98, 103, "出发"],
        ["08:30", "泸定", 29.92, 102.23, "短停"],
        ["10:30", "康定", 30.05, 101.96, "午饭 / 补给"],
        ["13:00", "折多山", 30.06, 101.8, "高海拔短停"],
        ["15:00", "新都桥", 30.04, 101.49, "外围拍摄"],
        ["18:00", "新都桥", 30.04, 101.49, "入住"],
      ],
    },
    {
      date: "2026-10-04",
      route: "新都桥 → 塔公 → 八美 → 丹巴中路藏寨",
      km: "150–170km",
      drive: "4–5小时",
      hotel: "谷道山居（中路藏寨店）",
      wear: "早晚保暖层，白天防风外套；高原紫外线强，墨镜和防晒要带。",
      risk: "沿途边走边玩，正规停车区停车，不要在弯道和主路临停。",
      points: [
        ["07:00", "新都桥", 30.04, 101.49, "晨景"],
        ["09:30", "塔公", 30.32, 101.54, "草原 / 人文"],
        ["11:45", "八美", 30.55, 101.5, "午饭 / 补给"],
        ["16:00", "丹巴", 30.88, 101.89, "抵达"],
        ["17:00", "中路藏寨", 30.89, 101.92, "入住"],
      ],
    },
    {
      date: "2026-10-05",
      route: "丹巴 → 小金 → 四姑娘山双桥沟",
      km: "110–130km",
      drive: "3–4小时",
      hotel: "四姑娘山景区住宿（待定）",
      wear: "三层穿法，景区深处更冷；带帽子、手套、防晒和备用保暖层。",
      risk: "双桥沟深处3800m+，不要每站都下车，按身体状态控制步行量。",
      points: [
        ["06:30", "丹巴", 30.88, 101.89, "出发"],
        ["07:45", "小金", 30.99, 102.36, "早餐 / 加油"],
        ["09:45", "双桥沟", 31.09, 102.84, "进入景区"],
        ["13:30", "双桥沟", 31.13, 102.8, "午餐 / 拍照"],
        ["16:30", "双桥沟", 31.09, 102.84, "出景区"],
        ["17:00", "四姑娘山镇", 31.1, 102.89, "入住"],
      ],
    },
    {
      date: "2026-10-06",
      route: "四姑娘山 → 卧龙 → 映秀 → 都江堰 → 天府机场",
      km: "270–300km",
      drive: "8–10小时",
      hotel: "天府云朵酒店（天府国际机场店）",
      wear: "清晨高原保暖，下降到都江堰后可逐层减衣。",
      risk: "返程优先级最高；都江堰到机场预留2–3小时拥堵缓冲，延误就取消停留。",
      points: [
        ["05:30", "四姑娘山镇", 31.1, 102.89, "必须早走"],
        ["08:30", "卧龙", 31.04, 103.18, "休息"],
        ["10:00", "映秀", 31.06, 103.48, "经过"],
        ["11:00", "都江堰", 31, 103.62, "午饭 / 加油"],
        ["16:00", "天府国际机场", 30.312, 104.441, "机场附近入住"],
      ],
    },
    {
      date: "2026-10-07",
      route: "机场酒店 → 还车 → 航站楼",
      km: "5–20km",
      drive: "20–40分钟",
      hotel: "返程",
      wear: "按成都当天气温穿着，保暖层放进行李即可。",
      risk: "05:40前退房，完成补油和还车；07:00前进入机场。",
      points: [
        ["05:15", "机场酒店", 30.3, 104.44, "起床"],
        ["05:40", "机场酒店", 30.3, 104.44, "退房"],
        ["06:10", "还车点", 30.31, 104.43, "补油 / 还车"],
        ["06:40", "天府国际机场", 30.312, 104.441, "进入航站楼"],
      ],
    },
  ];
  let S = {
    expenses: [],
    repayments: [],
    profiles: [],
    logs: [],
    memories: [],
    bookings: [],
    person_positions: [],
    ledger_acks: [],
    emergency_contacts: [],
  };
  let live = null,
    lastUpload = 0,
    currentWx = null,
    logScope = "mine",
    logCat = "全部",
    ledgerView = "mine",
    routeWxCache = new Map(),
    mapObj = null,
    mapMarkers = {},
    mapRoute = null,
    mapStops = [],
    roadRoutes = null,
    mapLibPromise = null;
  const validAmount = (n) =>
    Number.isFinite(n) &&
    n > 0 &&
    n <= 100000000 &&
    Math.abs(n * 100 - Math.round(n * 100)) < 0.00001;
  function api(action, payload = {}, timeout = 9000) {
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), timeout);
    return fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_slug: TRIP, action, payload }),
      signal: c.signal,
    })
      .then(async (r) => {
        const j = await r.json();
        clearTimeout(t);
        if (!r.ok || j.ok === false) throw new Error(j.error || "同步失败");
        return j;
      })
      .catch((e) => {
        clearTimeout(t);
        throw e;
      });
  }
  function profile(p) {
    if (window.CWProfiles) return window.CWProfiles.get(p);
    return (
      (S.profiles || []).find((x) => x.person === p) || {
        person: p,
        nickname: p,
        role: ROLE[p],
        last_seen: null,
        avatar_url: null,
      }
    );
  }
  function name(p) {
    return profile(p).nickname || p;
  }
  function online(p) {
    const t = profile(p).last_seen;
    return !!t && Date.now() - new Date(t).getTime() < 120000;
  }
  function avatarUrl(p) {
    if (window.CWProfiles) return window.CWProfiles.imageUrl(p);
    const u = profile(p).avatar_url;
    if (u) return u;
    const el =
      $$(`.avatar[data-person="${p}"]`)[0] ||
      $$(".avatar").find((x) => (x.textContent || "").trim().startsWith(p[0]));
    if (!el) return "";
    const bg =
        getComputedStyle(el).backgroundImage || el.style.backgroundImage || "",
      m = bg.match(/url\(["']?(.*?)["']?\)/);
    return m ? m[1] : "";
  }
  function setAvatar(el, p) {
    if (!el) return;
    el.dataset.person = p;
    el.textContent = p[0];
    const u = avatarUrl(p);
    if (u) {
      el.style.backgroundImage = `url("${u}")`;
      el.style.color = "transparent";
    } else {
      el.style.backgroundImage = "";
      el.style.color = "";
    }
  }
  function paidExpenses() {
    return (S.expenses || []).filter((e) => e.status !== "budget");
  }
  function balances() {
    const b = Object.fromEntries(TEAM.map((p) => [p, 0]));
    for (const e of paidExpenses()) {
      const ps = e.participants?.length ? e.participants : TEAM,
        share = Number(e.amount || 0) / ps.length;
      b[e.payer] += Number(e.amount || 0);
      ps.forEach((p) => (b[p] -= share));
    }
    for (const r of S.repayments || []) {
      b[r.from_person] += Number(r.amount || 0);
      b[r.to_person] -= Number(r.amount || 0);
    }
    return b;
  }
  function plan() {
    const b = balances(),
      d = TEAM.filter((p) => b[p] < -0.005)
        .map((p) => ({ p, v: -b[p] }))
        .sort((a, b) => b.v - a.v),
      c = TEAM.filter((p) => b[p] > 0.005)
        .map((p) => ({ p, v: b[p] }))
        .sort((a, b) => b.v - a.v),
      o = [];
    let i = 0,
      j = 0;
    while (i < d.length && j < c.length) {
      const a = Math.min(d[i].v, c[j].v);
      o.push({ from: d[i].p, to: c[j].p, amount: Math.round(a * 100) / 100 });
      d[i].v -= a;
      c[j].v -= a;
      if (d[i].v < 0.005) i++;
      if (c[j].v < 0.005) j++;
    }
    return o;
  }
  function summary(p) {
    const ex = paidExpenses(),
      paid = ex
        .filter((e) => e.payer === p)
        .reduce((s, e) => s + Number(e.amount || 0), 0),
      share = ex.reduce((s, e) => {
        const ps = e.participants?.length ? e.participants : TEAM;
        return s + (ps.includes(p) ? Number(e.amount || 0) / ps.length : 0);
      }, 0),
      sent = (S.repayments || [])
        .filter((r) => r.from_person === p)
        .reduce((s, r) => s + Number(r.amount || 0), 0),
      recv = (S.repayments || [])
        .filter((r) => r.to_person === p)
        .reduce((s, r) => s + Number(r.amount || 0), 0),
      pl = plan(),
      gets = pl.filter((x) => x.to === p),
      owes = pl.filter((x) => x.from === p);
    return {
      paid,
      share,
      outflow: paid + sent - recv,
      gets,
      owes,
      getTotal: gets.reduce((s, x) => s + x.amount, 0),
      oweTotal: owes.reduce((s, x) => s + x.amount, 0),
    };
  }
  function ackSet(id) {
    return new Set(
      (S.ledger_acks || [])
        .filter((a) => a.item_type === "expense" && a.item_id === id)
        .map((a) => a.person),
    );
  }
  function needsAck(e, p = ME) {
    return (
      e.status !== "budget" &&
      e.payer !== p &&
      (e.participants || []).includes(p) &&
      !ackSet(e.id).has(p)
    );
  }
  function pending() {
    return (S.expenses || []).filter((e) => needsAck(e));
  }
  function dayIndex() {
    const d = new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Shanghai",
      }),
      i = DAYS.findIndex((x) => x.date === d);
    if (i >= 0) return i;
    return new Date() < new Date("2026-10-02T00:00:00+08:00") ? 0 : 5;
  }
  function today() {
    return DAYS[dayIndex()];
  }
  function toast(msg) {
    const e = $("#toast");
    e.textContent = msg;
    e.classList.add("show");
    clearTimeout(e._t);
    e._t = setTimeout(() => e.classList.remove("show"), 2600);
  }
  function placeFrom(lat, lon) {
    if (lat > 39.3 && lat < 41.2 && lon > 115.6 && lon < 117.6) return "北京市";
    if (lat > 30.3 && lat < 31.3 && lon > 103.5 && lon < 105.2)
      return "成都市周边";
    if (lat > 29.7 && lat < 30.3 && lon > 101.6 && lon < 102.2)
      return "康定 / 新都桥一带";
    if (lat > 30.6 && lat < 31.05 && lon > 101.6 && lon < 102.2)
      return "丹巴一带";
    if (lat > 30.8 && lat < 31.3 && lon > 102.5 && lon < 103.2)
      return "四姑娘山一带";
    return "实时位置";
  }
  function wgsToGcj(lat, lon) {
    const PI = Math.PI,
      a = 6378245,
      ee = 0.00669342162296594323;
    if (lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271)
      return [lat, lon];
    const tf = (x, y) =>
        -100 +
        2 * x +
        3 * y +
        0.2 * y * y +
        0.1 * x * y +
        0.2 * Math.sqrt(Math.abs(x)) +
        ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3 +
        ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3 +
        ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) /
          3,
      tg = (x, y) =>
        300 +
        x +
        2 * y +
        0.1 * x * x +
        0.1 * x * y +
        0.1 * Math.sqrt(Math.abs(x)) +
        ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3 +
        ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3 +
        ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) /
          3;
    let dLat = tf(lon - 105, lat - 35),
      dLon = tg(lon - 105, lat - 35),
      r = (lat / 180) * PI,
      m = 1 - ee * Math.sin(r) ** 2,
      s = Math.sqrt(m);
    dLat = (dLat * 180) / (((a * (1 - ee)) / (m * s)) * PI);
    dLon = (dLon * 180) / ((a / s) * Math.cos(r) * PI);
    return [lat + dLat, lon + dLon];
  }
  function amapMarker(lat, lon, label = "当前位置") {
    const [a, b] = wgsToGcj(lat, lon);
    return `https://uri.amap.com/marker?position=${b.toFixed(6)},${a.toFixed(6)}&name=${encodeURIComponent(label)}&coordinate=gaode&callnative=1`;
  }
  function amapSearch(q) {
    if (!live)
      return `https://uri.amap.com/search?keyword=${encodeURIComponent(q)}&callnative=1`;
    const [a, b] = wgsToGcj(live.lat, live.lon);
    return `https://uri.amap.com/search?keyword=${encodeURIComponent(q)}&center=${b.toFixed(6)},${a.toFixed(6)}&callnative=1`;
  }
  function moneyCards(el, p) {
    const m = summary(p);
    el.innerHTML = `<div><span>我已花</span><b>${money(m.outflow)}</b></div><div><span>我的消费</span><b>${money(m.share)}</b></div><div class="recv"><span>我该收</span><b>${money(m.getTotal)}</b></div><div class="pay"><span>我该付</span><b>${money(m.oweTotal)}</b></div>`;
  }
  function renderTeam() {
    const el = $("#teamStrip");
    el.innerHTML = TEAM.map(
      (p) =>
        `<div class="team-one"><div class="avatar" data-person="${p}">${p[0]}</div><div><b>${esc(name(p))}</b><small><i class="dot ${online(p) ? "on" : ""}"></i>${online(p) ? "在线" : "离线"} · ${esc(profile(p).role || ROLE[p])}</small></div></div>`,
    ).join("");
    setTimeout(
      () =>
        TEAM.forEach((p) => {
          const a = el.querySelector(`.avatar[data-person="${p}"]`);
          setAvatar(a, p);
        }),
      0,
    );
  }
  function renderHome() {
    setAvatar($("#homeAvatar"), ME);
    setAvatar($("#miniAvatar"), ME);
    $("#helloName").textContent = `${name(ME)}，今天先看这些`;
    $("#helloRole").textContent = profile(ME).role || ROLE[ME];
    $("#todayTag").textContent = new Date().toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    moneyCards($("#homeMoney"), ME);
    renderTeam();
    const d = today(),
      m = summary(ME);
    $("#personalTips").innerHTML =
      `<div class="tip"><i>¥</i><div><b>账本</b><p>${m.getTotal ? `你当前应收 ${money(m.getTotal)}` : m.oweTotal ? `你当前应付 ${money(m.oweTotal)}` : "当前无需转账"}${pending().length ? `；另有 ${pending().length} 笔共同支出待确认` : ""}</p></div></div><div class="tip"><i>✓</i><div><b>你的职责</b><p>${esc(personTask())}</p></div></div><div class="tip"><i>衣</i><div><b>穿着</b><p>${esc(d.wear)}</p></div></div><div class="tip"><i>!</i><div><b>注意事项</b><p>${esc(d.risk)}</p></div></div>`;
  }
  function personTask() {
    const i = dayIndex(),
      T = {
        瑞子: [
          "确认雅安酒店和晚到信息",
          "留意大家高反状态与酒店入住",
          "确认中路藏寨停车和入住",
          "确认四姑娘山住宿最终订单",
          "安全到机场优先，账本晚点处理",
          "核对退房和最终账本",
        ],
        普子: [
          "盯机场到雅安拥堵",
          "复核泸定—康定—折多山管制和天气",
          "复核塔公—八美—丹巴道路",
          "确认双桥沟开放和预约",
          "盯导航拥堵，延误就取消停留",
          "确认还车点到航站楼动线",
        ],
        航子: [
          "确认四个人行李齐全",
          "提醒补水保暖和控制活动强度",
          "帮看天气、证件和设备电量",
          "景区准备水和充电宝",
          "关注返程航班动态",
          "确认值机和航班",
        ],
        辉子: [
          "取车验车并拍照",
          "康定/新都桥及时加油",
          "看油量胎压，每2小时休息",
          "丹巴/小金补油",
          "05:30准时出发并补油",
          "按规则还车拍照",
        ],
      };
    return T[ME]?.[i] || ROLE[ME];
  }
  function renderToday() {
    const d = today();
    $("#todayTitle").textContent =
      `${d.date.slice(5).replace("-", "月")}日 · 今日行程`;
    $("#todayRoute").textContent = `${d.route}｜${d.km}｜约${d.drive}`;
    const high = Math.max(...d.points.map((p) => ALT[p[1]] || 0)),
      low = Math.min(...d.points.map((p) => ALT[p[1]] || 9999));
    $("#riskGrid").innerHTML =
      `<div class="risk"><span>最高海拔</span><b>${high}m</b></div><div class="risk"><span>海拔爬升</span><b>约 ${Math.max(0, high - low)}m</b></div><div class="risk"><span>驾驶距离</span><b>${d.km}</b></div><div class="risk"><span>今日重点</span><b>${high >= 3800 ? "高反 / 保暖" : "拥堵 / 节奏"}</b></div>`;
    $("#timeline").innerHTML = d.points
      .map(
        (p) =>
          `<div class="time-row"><time>${p[0]}</time><i class="t-dot"></i><div><b>${esc(p[1])}</b><p>${esc(p[4])}</p></div><a target="_blank" href="${amapMarker(p[2], p[3], p[1])}">高德</a></div>`,
      )
      .join("");
    renderAltitude();
    if ($("#view-today").classList.contains("on")) loadRouteWeather(false);
  }
  function renderAltitude() {
    const d = today(),
      vals = d.points.map((p) => ALT[p[1]] || 0),
      min = Math.min(...vals),
      max = Math.max(...vals),
      w = 600,
      h = 140,
      pad = 18,
      pts = vals.map((v, i) => [
        pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1),
        h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2),
      ]);
    let marker = "";
    if (live) {
      let bi = 0,
        bd = Infinity;
      d.points.forEach((p, i) => {
        const dd = (p[2] - live.lat) ** 2 + (p[3] - live.lon) ** 2;
        if (dd < bd) {
          bd = dd;
          bi = i;
        }
      });
      const q = pts[bi];
      marker = `<circle cx="${q[0]}" cy="${q[1]}" r="6" fill="#1677ff" stroke="white" stroke-width="3"/>`;
    }
    $("#altChart").innerHTML =
      `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#167d70" stroke-width="4" vector-effect="non-scaling-stroke"/><polygon points="${pad},${h - pad} ${pts.map((p) => p.join(",")).join(" ")} ${w - pad},${h - pad}" fill="#2f94771a"/>${marker}</svg>`;
    const high = Math.max(...vals),
      hi = d.points[vals.indexOf(high)]?.[1] || "最高点";
    $("#altSummary").innerHTML =
      `<span>当前 ${live?.altitude ? Math.round(live.altitude) + "m" : "等待GPS海拔"}</span><span>今日最高 ${hi} ${high}m</span><span>${high >= 3800 ? "建议：减少剧烈运动 / 提前保暖" : "海拔风险较低"}</span>`;
  }
  const WXNAME = {
    0: "晴",
    1: "大致晴",
    2: "多云",
    3: "阴",
    45: "雾",
    51: "毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "阵雨",
    81: "阵雨",
    82: "强阵雨",
    95: "雷暴",
  };
  async function weatherAt(lat, lon) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`,
      hit = routeWxCache.get(key);
    if (hit && Date.now() - hit.t < 1800000) return hit.j;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=Asia%2FShanghai&forecast_days=1`;
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), 6500);
    try {
      const j = await fetch(url, { signal: c.signal }).then((r) => r.json());
      clearTimeout(t);
      routeWxCache.set(key, { t: Date.now(), j });
      return j;
    } catch (e) {
      clearTimeout(t);
      return null;
    }
  }
  async function loadCurrentWeather() {
    if (!live) return;
    const j = await weatherAt(live.lat, live.lon);
    if (!j) return;
    if (!j.current) return;
    currentWx = { ...j.current, loadedAt: Date.now() };
    $("#nowWeather").textContent =
      `${Math.round(j.current.temperature_2m)}℃ ${WXNAME[j.current.weather_code] || "天气"}`;
  }
  async function loadRouteWeather(force) {
    const d = today(),
      el = $("#routeWeather");
    if (!force && (el.dataset.loaded === "1" || el.dataset.loading === "1"))
      return;
    el.dataset.loading = "1";
    el.innerHTML = '<div class="empty">正在加载沿途分段天气…</div>';
    const picks = d.points
        .filter(
          (p, i, a) =>
            i === 0 ||
            i === a.length - 1 ||
            i % Math.max(1, Math.floor(a.length / 4)) === 0,
        )
        .slice(0, 5),
      res = await Promise.all(picks.map((p) => weatherAt(p[2], p[3])));
    el.dataset.loaded = res.some((j) => j?.current) ? "1" : "";
    delete el.dataset.loading;
    el.innerHTML = picks
      .map((p, i) => {
        const j = res[i],
          c = j?.current;
        return `<div class="wx-row"><div><b>${esc(p[1])}</b><span>${ALT[p[1]] ? ALT[p[1]] + "m · " : ""}${esc(p[0])}</span></div><div class="wx-right"><b>${c ? Math.round(c.temperature_2m) + "℃" : "—"}</b><span>${c ? (WXNAME[c.weather_code] || "天气") + " · 风" + Math.round(c.wind_speed_10m) + "km/h" : "暂不可用"}</span></div></div>`;
      })
      .join("");
  }
  function renderMiniMap() {
    if (!live) return;
    const [lat, lon] = wgsToGcj(live.lat, live.lon),
      z = 16,
      n = 2 ** z,
      x = ((lon + 180) / 360) * n,
      y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
      tx = Math.floor(x),
      ty = Math.floor(y),
      fx = x - tx,
      fy = y - ty;
    let html = "";
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = tx + dx,
          yy = ty + dy,
          s = ((xx + yy) % 4) + 1;
        html += `<img loading="lazy" referrerpolicy="no-referrer" src="https://webrd0${s}.is.autonavi.com/appmaptile?style=7&x=${xx}&y=${yy}&z=${z}" onerror="this.style.visibility='hidden'">`;
      }
    const g = $("#tileGrid");
    g.innerHTML = html;
    g.style.transform = `translate(calc(-50% + ${128 - fx * 256}px),calc(-50% + ${128 - fy * 256}px))`;
    $("#miniMapShade").classList.add("hide");
  }
  function startGps() {
    if (!navigator.geolocation || !isSecureContext) {
      $("#gpsStatus").textContent = "浏览器不支持定位";
      return;
    }
    navigator.geolocation.watchPosition(
      (p) => {
        const c = p.coords;
        live = {
          lat: c.latitude,
          lon: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude,
          speed: c.speed,
          heading: c.heading,
          time: Date.now(),
        };
        localStorage.setItem("cw-lastpos-v4", JSON.stringify(live));
        $("#gpsStatus").textContent = "实时定位中";
        $("#nowPlace").textContent = placeFrom(live.lat, live.lon);
        $("#nowAccuracy").textContent = `±${Math.round(live.accuracy || 0)}米`;
        $("#nowAlt").textContent = Number.isFinite(live.altitude)
          ? `${Math.round(live.altitude)}m`
          : "设备未提供";
        renderMiniMap();
        renderAltitude();
        if (Date.now() - lastUpload > 12000) {
          lastUpload = Date.now();
          api("update_person_position", {
            person: ME,
            lat: live.lat,
            lon: live.lon,
            accuracy: live.accuracy,
            altitude: live.altitude,
            speed: live.speed,
            heading: live.heading,
            status: "在线",
          }).catch(() => {});
        }
        if (!currentWx || Date.now() - (currentWx.loadedAt || 0) > 600000)
          loadCurrentWeather();
        if (mapObj) updateMapPeople();
      },
      (e) => {
        $("#gpsStatus").textContent =
          e.code === 1 ? "请允许“精确位置”" : "定位暂不可用";
        let old = null;
        try {
          old = JSON.parse(localStorage.getItem("cw-lastpos-v4") || "null");
        } catch {}
        if (old && Date.now() - old.time < 600000) {
          live = old;
          $("#nowPlace").textContent = placeFrom(live.lat, live.lon);
          $("#nowAccuracy").textContent = "最近一次位置";
          renderMiniMap();
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }
  function renderLogs() {
    const cats = ["全部", "账本", "相册", "资料", "预订", "位置", "设置"];
    $("#logCats").innerHTML = cats
      .map(
        (c) =>
          `<button class="chip ${logCat === c ? "on" : ""}" data-logcat="${c}">${c}</button>`,
      )
      .join("");
    let rows = S.logs || [];
    if (logScope === "mine") rows = rows.filter((x) => x.person === ME);
    if (logCat !== "全部") rows = rows.filter((x) => x.category === logCat);
    const ico = {
      账本: "¥",
      相册: "▣",
      资料: "●",
      预订: "票",
      位置: "⌖",
      设置: "⚙",
    };
    $("#logs").innerHTML =
      rows
        .slice(0, 100)
        .map(
          (x) =>
            `<div class="log"><div class="log-icon">${ico[x.category] || "•"}</div><div><b>${esc(name(x.person))} · ${esc(x.action)}</b><p>${esc(x.detail || "")}</p></div><time>${when(x.created_at)}</time></div>`,
        )
        .join("") || '<div class="empty">暂无记录</div>';
  }
  function renderGallery() {
    const el = $("#gallery");
    el.innerHTML =
      (S.memories || [])
        .map(
          (x) =>
            `<div class="photo"><img loading="lazy" src="${x.url || ""}" alt="旅行照片">${x.uploaded_by === ME ? `<button class="photo-del" data-photo-del="${x.id}">删除</button>` : ""}<div class="photo-meta"><b>${esc(x.caption || "川西记忆")}</b><span>${esc(name(x.uploaded_by || ""))} 上传 · ${when(x.created_at)}</span></div></div>`,
        )
        .join("") || '<div class="empty">还没有共享照片</div>';
  }
  function renderBookings() {
    const el = $("#bookings");
    el.innerHTML =
      (S.bookings || [])
        .map(
          (x) =>
            `<div class="booking"><b>${esc(x.kind)} · ${esc(x.title)}</b><p>${esc(x.details || "")} ${x.booking_date ? "· " + esc(x.booking_date) : ""} ${x.uploaded_by ? "· " + esc(name(x.uploaded_by)) + "添加" : ""}</p></div>`,
        )
        .join("") || '<div class="empty">暂无预订记录</div>';
  }
  function renderTrip() {
    renderLogs();
    renderGallery();
    renderBookings();
  }
  function ackChips(e) {
    if (e.status === "budget") return '<span class="ack">预算项</span>';
    const a = ackSet(e.id);
    return (e.participants || [])
      .map((p) =>
        p === e.payer
          ? `<span class="ack ok">${esc(name(p))} · 付款人</span>`
          : `<span class="ack ${a.has(p) ? "ok" : "wait"}">${esc(name(p))} · ${a.has(p) ? "已知晓" : "待确认"}</span>`,
      )
      .join("");
  }
  function renderMe() {
    const p = profile(ME);
    setAvatar($("#profileAvatar"), ME);
    if (
      $("#nicknameInput").dataset.dirty !== "1" &&
      document.activeElement !== $("#nicknameInput")
    )
      $("#nicknameInput").value = p.nickname || ME;
    if (
      $("#roleInput").dataset.dirty !== "1" &&
      document.activeElement !== $("#roleInput")
    )
      $("#roleInput").value = p.role || ROLE[ME];
    moneyCards($("#meMoney"), ME);
    const pl = plan(),
      mine = summary(ME);
    $("#settlementLines").innerHTML =
      [
        ...mine.gets.map(
          (x) =>
            `<div class="settle-line"><span>${esc(name(x.from))} 应付给我</span><b>${money(x.amount)}</b></div>`,
        ),
        ...mine.owes.map(
          (x) =>
            `<div class="settle-line"><span>我应付给 ${esc(name(x.to))}</span><b>${money(x.amount)}</b></div>`,
        ),
      ].join("") ||
      '<div class="settle-line"><span>当前无需结算</span><b>✓</b></div>';
    const pc = pending().length;
    $("#pendingBadge").textContent = `${pc}笔待确认`;
    $("#navBadge").textContent = pc;
    $("#navBadge").classList.toggle("show", pc > 0);
    const ex = (S.expenses || []).filter(
        (e) =>
          ledgerView === "all" ||
          e.payer === ME ||
          (e.participants || []).includes(ME),
      ),
      rp = (S.repayments || []).filter(
        (r) =>
          ledgerView === "all" || r.from_person === ME || r.to_person === ME,
      );
    $("#ledgerList").innerHTML =
      `<button class="primary" data-ledger="add-repay">＋ 记录收付款</button>${ex
        .slice()
        .reverse()
        .map(
          (e) =>
            `<div class="ledger-item"><div class="ledger-top"><div><b>${esc(e.category || "其他")}</b><div class="ledger-meta">付款人：${esc(name(e.payer))} · ${when(e.created_at)}<br>${esc(e.note || "无备注")}</div></div><b class="ledger-amt">${money(e.amount)}</b></div><div class="ack-row">${ackChips(e)}</div><div class="ledger-actions">${needsAck(e) ? `<button class="ack" data-ledger="ack" data-id="${e.id}">我已知晓</button>` : ""}<button data-ledger="edit-exp" data-id="${e.id}">修改</button><button class="danger" data-ledger="del-exp" data-id="${e.id}">删除</button></div></div>`,
        )
        .join("")}${rp
        .slice()
        .reverse()
        .map(
          (r) =>
            `<div class="ledger-item"><div class="ledger-top"><div><b>${esc(name(r.from_person))} → ${esc(name(r.to_person))}</b><div class="ledger-meta">${when(r.created_at)} · ${esc(r.note || "收付款")}</div></div><b class="ledger-amt">${money(r.amount)}</b></div><div class="ledger-actions"><button data-ledger="edit-repay" data-id="${r.id}">修改金额 / 收款人</button><button class="danger" data-ledger="del-repay" data-id="${r.id}">删除</button></div></div>`,
        )
        .join("")}`;
  }
  function renderEmergency() {
    const pos = live
      ? `${placeFrom(live.lat, live.lon)}<br>纬度 ${live.lat.toFixed(6)} · 经度 ${live.lon.toFixed(6)}${live.altitude ? ` · 海拔约${Math.round(live.altitude)}m` : ""}`
      : "尚未获得定位，请先允许浏览器定位";
    $("#sosLocation").innerHTML = pos;
    $("#emergencyList").innerHTML =
      (S.emergency_contacts || [])
        .map(
          (x) =>
            `<div class="emergency"><span><b>${esc(x.label)}</b><br>${esc(x.note || x.kind || "")}</span><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></div>`,
        )
        .join("") || '<div class="empty">租车救援/保险电话还未录入</div>';
  }
  function renderAll() {
    renderHome();
    renderToday();
    renderTrip();
    renderMe();
    renderEmergency();
    $("#tripLogTitle").textContent = `${name(ME)}的旅途记录`;
    $("#topSub").textContent =
      `${name(ME)} · ${profile(ME).role || ROLE[ME]} · ${TEAM.filter(online).length}/4在线`;
  }
  let stateRequest = null;
  function refreshState(showError = false) {
    if (stateRequest) return stateRequest;
    stateRequest = (async () => {
      try {
        const j = await api("get_state");
        S = { ...S, ...j };
        renderAll();
        window.dispatchEvent(
          new CustomEvent("cw:state", { detail: { state: S } }),
        );
      } catch (e) {
        if (showError) toast("云同步暂不可用，已保留当前内容");
      } finally {
        stateRequest = null;
      }
    })();
    return stateRequest;
  }

  const viewScroll = {};
  let activeView = "now";
  function openView(v, historyNavigation = false) {
    if (v === "map") {
      openMap();
      return;
    }
    if (!["now", "today", "trip", "me"].includes(v)) v = "now";
    viewScroll[activeView] = window.scrollY;
    activeView = v;
    $$(".view").forEach((x) => x.classList.toggle("on", x.id === `view-${v}`));
    $$("#bottomNav button").forEach((b) => {
      const selected = b.dataset.view === v;
      b.classList.toggle("on", selected);
      if (selected) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (!historyNavigation && location.hash !== `#${v}`)
      history.pushState({ view: v }, "", `#${v}`);
    window.scrollTo({ top: viewScroll[v] || 0, behavior: "instant" });
    if (v === "today") loadRouteWeather(false);
    if (v === "trip") renderTrip();
    if (v === "me") renderMe();
  }
  window.addEventListener("popstate", () =>
    openView(location.hash.slice(1) || "now", true),
  );
  window.addEventListener("cw:profiles", (e) => {
    for (const p of e.detail.profiles || []) {
      const i = S.profiles.findIndex((x) => x.person === p.person);
      if (i >= 0) S.profiles[i] = { ...S.profiles[i], ...p };
      else S.profiles.push(p);
    }
    renderHome();
  });

  function showOverlay(id) {
    const e = $(id);
    e.classList.add("show");
    e.setAttribute("aria-hidden", "false");
  }
  function hideOverlay(id) {
    const e = $(id);
    e.classList.remove("show");
    e.setAttribute("aria-hidden", "true");
  }
  function loadCss(href) {
    if ($(`link[href="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (window.L) return res();
      const s = document.createElement("script");
      let done = false,
        t = setTimeout(() => {
          if (!done) {
            done = true;
            rej(new Error("地图组件加载超时"));
          }
        }, 8000);
      s.src = src;
      s.async = true;
      s.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          res();
        }
      };
      s.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          rej(new Error("地图组件加载失败"));
        }
      };
      document.head.appendChild(s);
    });
  }
  async function ensureMapLib() {
    if (window.L) return;
    if (!mapLibPromise) {
      loadCss("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css");
      mapLibPromise = loadScript(
        "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
      );
    }
    return mapLibPromise;
  }
  async function openMap() {
    showOverlay("#mapOverlay");
    $("#mapLoader").classList.remove("hide");
    $("#mapLoader").innerHTML =
      "<b>正在打开地图</b><span>只在地图页面加载交互组件</span>";
    try {
      await ensureMapLib();
      if (!mapObj) {
        mapObj = L.map("fullMap", {
          zoomControl: false,
          preferCanvas: true,
        }).setView([39.9042, 116.4074], 12);
        let bad = 0,
          tile = L.tileLayer(
            "https://webrd0{s}.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}",
            {
              subdomains: ["1", "2", "3", "4"],
              maxZoom: 19,
              minZoom: 3,
              attribution: "高德地图",
            },
          ).addTo(mapObj);
        tile.on("tileerror", () => {
          bad++;
          if (bad === 6) {
            try {
              mapObj.removeLayer(tile);
              tile = L.tileLayer(
                "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}",
                { maxZoom: 18, attribution: "中文地图" },
              ).addTo(mapObj);
            } catch (e) {}
          }
        });
      }
      $("#mapLoader").classList.add("hide");
      setTimeout(() => {
        mapObj.invalidateSize();
        updateMapPeople();
        centerMapMe();
      }, 80);
    } catch (e) {
      $("#mapLoader").innerHTML =
        `<b>地图组件暂未加载</b><span>不会影响网页其他功能。你可以直接在高德地图打开当前位置。</span><button class="primary" id="mapFallbackAmap" style="margin-top:10px">用高德地图打开</button>`;
      setTimeout(
        () =>
          $("#mapFallbackAmap")?.addEventListener("click", () => {
            if (live)
              window.open(
                amapMarker(live.lat, live.lon, name(ME) + "的位置"),
                "_blank",
              );
            else window.open("https://uri.amap.com/", "_blank");
          }),
        0,
      );
    }
  }
  function mapIcon(p, isMe) {
    const u = avatarUrl(p),
      on = online(p) || isMe,
      html = `<div style="width:${isMe ? 48 : 42}px;height:${isMe ? 48 : 42}px;border-radius:50%;border:3px solid white;background:#0b6078;color:white;display:grid;place-items:center;box-shadow:${isMe ? "0 0 0 4px #1677ff44,0 5px 16px #001e2d66" : "0 4px 14px #001e2d55"};position:relative;overflow:visible;font-weight:900">${u ? `<img src="${u}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : p[0]}<i style="position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:${on ? "#29b36b" : "#aab5b9"};border:2px solid white"></i><span style="position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);white-space:nowrap;background:#173f50e8;color:white;border-radius:999px;padding:3px 7px;font-size:9px">${esc(name(p))}${isMe ? " · 我" : ""}</span></div>`;
    return L.divIcon({
      className: "",
      html,
      iconSize: [isMe ? 48 : 42, isMe ? 64 : 58],
      iconAnchor: [isMe ? 24 : 21, isMe ? 24 : 21],
    });
  }
  function updateMapPeople() {
    if (!mapObj) return;
    const pos = S.person_positions || [];
    for (const p of TEAM) {
      let q = pos.find((x) => x.person === p);
      if (p === ME && live)
        q = {
          lat: live.lat,
          lon: live.lon,
          accuracy: live.accuracy,
          altitude: live.altitude,
        };
      if (!q) continue;
      const ll = wgsToGcj(+q.lat, +q.lon),
        ic = mapIcon(p, p === ME);
      if (!mapMarkers[p])
        mapMarkers[p] = L.marker(ll, {
          icon: ic,
          zIndexOffset: p === ME ? 1000 : 500,
        }).addTo(mapObj);
      else {
        mapMarkers[p].setLatLng(ll);
        mapMarkers[p].setIcon(ic);
      }
      mapMarkers[p].bindPopup(
        `<b>${esc(name(p))}</b><br>${p === ME || online(p) ? "在线" : "离线"}${q.accuracy ? `<br>定位精度 ±${Math.round(q.accuracy)}m` : ""}`,
      );
    }
  }
  function centerMapMe() {
    if (!mapObj) return;
    if (live) {
      mapObj.setView(wgsToGcj(live.lat, live.lon), 17);
    } else {
      const q = (S.person_positions || []).find((x) => x.person === ME);
      if (q) mapObj.setView(wgsToGcj(+q.lat, +q.lon), 16);
    }
  }
  function fitTeam() {
    if (!mapObj) return;
    const pts = [];
    (S.person_positions || []).forEach((q) => {
      if (Number.isFinite(+q.lat) && Number.isFinite(+q.lon))
        pts.push(wgsToGcj(+q.lat, +q.lon));
    });
    if (live) pts.push(wgsToGcj(live.lat, live.lon));
    if (pts.length === 1) mapObj.setView(pts[0], 16);
    else if (pts.length > 1) mapObj.fitBounds(L.latLngBounds(pts).pad(0.3));
    else centerMapMe();
  }
  async function showRoute() {
    if (!mapObj) return;
    if (mapRoute) {
      mapObj.fitBounds(mapRoute.getBounds().pad(0.08));
      return;
    }
    const loader = $("#fullMapStatus");
    loader.textContent = "正在加载今日道路…";
    try {
      if (!roadRoutes)
        roadRoutes = await fetch("./road-routes.json", {
          cache: "force-cache",
        }).then((r) => r.json());
      const raw =
          roadRoutes?.[String(dayIndex())]?.coordinates ||
          today().points.map((p) => [p[3], p[2]]),
        pts = raw.map(([lon, lat]) => wgsToGcj(lat, lon));
      mapRoute = L.polyline(pts, {
        color: "#167d70",
        weight: 6,
        opacity: 0.88,
      }).addTo(mapObj);
      for (const p of today().points) {
        const ll = wgsToGcj(p[2], p[3]),
          m = L.circleMarker(ll, {
            radius: 4,
            weight: 2,
            color: "#0b6078",
            fillColor: "#fff",
            fillOpacity: 1,
          })
            .addTo(mapObj)
            .bindTooltip(p[1]);
        mapStops.push(m);
      }
      mapObj.fitBounds(mapRoute.getBounds().pad(0.08));
      loader.textContent = "今日路线已加载";
    } catch (e) {
      loader.textContent = "道路数据暂不可用，位置地图仍可使用";
    }
  }
  function fileToData(file, max = 1200, q = 0.8, square = false) {
    return new Promise((res, rej) => {
      if (file.type === "application/pdf") {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
        return;
      }
      const img = new Image(),
        u = URL.createObjectURL(file);
      img.onload = () => {
        let c = document.createElement("canvas"),
          ctx = c.getContext("2d");
        if (square) {
          const side = Math.min(img.width, img.height),
            sx = (img.width - side) / 2,
            sy = (img.height - side) / 2;
          c.width = c.height = 320;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, 320, 320);
        } else {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          c.width = Math.max(1, Math.round(img.width * s));
          c.height = Math.max(1, Math.round(img.height * s));
          ctx.drawImage(img, 0, 0, c.width, c.height);
        }
        URL.revokeObjectURL(u);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => {
        URL.revokeObjectURL(u);
        rej(new Error("图片读取失败，请使用JPG或PNG格式"));
      };
      img.src = u;
    });
  }
  function editOverlay(title, html) {
    $("#editTitle").textContent = title;
    $("#editBody").innerHTML = html;
    showOverlay("#editOverlay");
  }
  function editExpense(id) {
    const e = S.expenses.find((x) => x.id === id);
    if (!e) return;
    editOverlay(
      "修改支出账单",
      `<div class="edit-form"><label>分类<input id="eeCat" value="${esc(e.category || "其他")}"></label><label>金额<input id="eeAmt" type="number" min=".01" step=".01" value="${Number(e.amount)}"></label><label>付款人<select id="eePayer">${TEAM.map((p) => `<option ${p === e.payer ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>状态<select id="eeStatus"><option value="paid" ${e.status !== "budget" ? "selected" : ""}>已发生</option><option value="budget" ${e.status === "budget" ? "selected" : ""}>预算</option></select></label><label class="wide">备注<input id="eeNote" value="${esc(e.note || "")}"></label><label class="wide">参与分摊<div class="participants" id="eeParts">${TEAM.map((p) => `<label><input type="checkbox" value="${p}" ${(e.participants || []).includes(p) ? "checked" : ""}>${esc(name(p))}</label>`).join("")}</div></label></div><div class="edit-foot"><button class="ghost" data-close="edit">取消</button><button class="primary" id="eeSave">保存修改</button></div>`,
    );
    $("#eeSave").onclick = async () => {
      const save = $("#eeSave");
      if (save.disabled) return;
      const amount = Number($("#eeAmt").value),
        parts = $$("#eeParts input:checked").map((x) => x.value);
      if (!validAmount(amount) || !parts.length)
        return toast("请填写有效金额（最多两位小数）并选择参与人");
      save.disabled = true;
      try {
        await api("update_expense", {
          id,
          actor: ME,
          category: $("#eeCat").value.trim() || "其他",
          amount,
          payer: $("#eePayer").value,
          participants: parts,
          note: $("#eeNote").value.trim(),
          status: $("#eeStatus").value,
        });
        hideOverlay("#editOverlay");
        await refreshState();
        toast("账单已修改，相关人员需重新确认");
      } catch (err) {
        toast(err.message);
      } finally {
        save.disabled = false;
      }
    };
  }
  function editRepay(id = null) {
    const r = id ? (S.repayments || []).find((x) => x.id === id) : null;
    editOverlay(
      r ? "修改收付款" : "记录收付款",
      `<div class="edit-form"><label>付款人<select id="erFrom">${TEAM.map((p) => `<option ${p === (r?.from_person || ME) ? "selected" : ""}>${p}</option>`).join("")}</select></label><label>收款人<select id="erTo">${TEAM.map((p) => `<option ${p === (r?.to_person || TEAM.find((x) => x !== ME)) ? "selected" : ""}>${p}</option>`).join("")}</select></label><label class="wide">金额<input id="erAmt" type="number" min=".01" step=".01" value="${r ? Number(r.amount) : ""}"></label><label class="wide">备注<input id="erNote" value="${esc(r?.note || "")}"></label></div><div class="edit-foot"><button class="ghost" data-close="edit">取消</button><button class="primary" id="erSave">保存</button></div>`,
    );
    $("#erSave").onclick = async () => {
      const save = $("#erSave");
      if (save.disabled) return;
      const from = $("#erFrom").value,
        to = $("#erTo").value,
        amount = Number($("#erAmt").value);
      if (from === to || !validAmount(amount))
        return toast("请检查付款人、收款人和金额（最多两位小数）");
      save.disabled = true;
      try {
        if (r)
          await api("update_repayment", {
            id: r.id,
            actor: ME,
            from_person: from,
            to_person: to,
            amount,
            note: $("#erNote").value.trim(),
          });
        else
          await api("add_repayment", {
            from_person: from,
            to_person: to,
            amount,
            note: $("#erNote").value.trim() || "AA收付款",
            actor: ME,
          });
        hideOverlay("#editOverlay");
        await refreshState();
        toast("收付款记录已保存");
      } catch (err) {
        toast(err.message);
      } finally {
        save.disabled = false;
      }
    };
  }
  async function showDaily() {
    const key = `cw-daily-${ME}-${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })}`;
    if (localStorage.getItem(key) === "1") return;
    const d = today(),
      m = summary(ME);
    editOverlay(
      `${name(ME)}，今天先看这些`,
      `<div class="tips"><div class="tip"><i>¥</i><div><b>钱</b><p>${m.getTotal ? `该收 ${money(m.getTotal)}` : m.oweTotal ? `该付 ${money(m.oweTotal)}` : "当前无需转账"}${pending().length ? `；${pending().length}笔账待确认` : ""}</p></div></div><div class="tip"><i>✓</i><div><b>职责</b><p>${esc(personTask())}</p></div></div><div class="tip"><i>衣</i><div><b>穿什么</b><p>${esc(d.wear)}</p></div></div><div class="tip"><i>!</i><div><b>注意</b><p>${esc(d.risk)}</p></div></div></div><div class="edit-foot"><button class="primary" id="dailyOk">知道了，进入今天</button></div>`,
    );
    $("#dailyOk").onclick = () => {
      localStorage.setItem(key, "1");
      hideOverlay("#editOverlay");
    };
  }
  function bind() {
    ["nicknameInput", "roleInput"].forEach((id) =>
      $("#" + id).addEventListener(
        "input",
        (e) => (e.target.dataset.dirty = "1"),
      ),
    );
    $("#bottomNav").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-view]");
      if (b) openView(b.dataset.view);
    });
    $("#openMapBtn").onclick = openMap;
    $("#miniMap").onclick = (e) => {
      if (!e.target.closest("button")) openMap();
    };
    $("#closeMapBtn").onclick = () => hideOverlay("#mapOverlay");
    $("#mapOverlay").addEventListener("click", (e) => {
      if (e.target === $("#mapOverlay")) hideOverlay("#mapOverlay");
    });
    $("#mapOverlay").addEventListener("click", (e) => {
      const b = e.target.closest("[data-mapact]");
      if (!b) return;
      if (b.dataset.mapact === "me") centerMapMe();
      if (b.dataset.mapact === "team") fitTeam();
      if (b.dataset.mapact === "route") showRoute();
      if (b.dataset.mapact === "amap") {
        if (live)
          window.open(
            amapMarker(live.lat, live.lon, name(ME) + "的位置"),
            "_blank",
          );
        else toast("正在获取定位");
      }
    });
    $("#sosTop").onclick = () => {
      renderEmergency();
      showOverlay("#sosOverlay");
    };
    $("#sosOverlay").addEventListener("click", (e) => {
      if (
        e.target === $("#sosOverlay") ||
        e.target.closest('[data-close="sos"]')
      )
        hideOverlay("#sosOverlay");
    });
    $("#nearHospital").onclick = () =>
      window.open(amapSearch("医院"), "_blank");
    $("#nearRepair").onclick = () =>
      window.open(amapSearch("汽车维修"), "_blank");
    $("#editOverlay").addEventListener("click", (e) => {
      if (
        e.target === $("#editOverlay") ||
        e.target.closest('[data-close="edit"]')
      )
        hideOverlay("#editOverlay");
    });
    document.addEventListener("click", (e) => {
      const s = e.target.closest("[data-logscope]");
      if (s) {
        logScope = s.dataset.logscope;
        $$("[data-logscope]").forEach((x) => x.classList.toggle("on", x === s));
        renderLogs();
      }
      const c = e.target.closest("[data-logcat]");
      if (c) {
        logCat = c.dataset.logcat;
        renderLogs();
      }
      const l = e.target.closest("[data-ledgerview]");
      if (l) {
        ledgerView = l.dataset.ledgerview;
        $$("[data-ledgerview]").forEach((x) =>
          x.classList.toggle("on", x === l),
        );
        renderMe();
      }
      const a = e.target.closest("[data-ledger]");
      if (a) {
        const id = a.dataset.id,
          act = a.dataset.ledger;
        if (act === "edit-exp") editExpense(id);
        if (act === "edit-repay") editRepay(id);
        if (act === "add-repay") editRepay();
        if (act === "ack")
          api("acknowledge_expense", { expense_id: id, person: ME })
            .then(refreshState)
            .then(() => toast("已确认知晓"))
            .catch((x) => toast(x.message));
        if (
          act === "del-exp" &&
          confirm("确认删除这笔账单？删除后会重新计算AA。")
        )
          api("delete_expense", { id, actor: ME })
            .then(refreshState)
            .then(() => toast("账单已删除"))
            .catch((x) => toast(x.message));
        if (act === "del-repay" && confirm("确认删除这条收付款记录？"))
          api("delete_repayment", { id, actor: ME })
            .then(refreshState)
            .then(() => toast("记录已删除"))
            .catch((x) => toast(x.message));
      }
      const pd = e.target.closest("[data-photo-del]");
      if (pd && confirm("删除这张由你上传的照片？"))
        api("delete_photo", { person: ME, id: pd.dataset.photoDel })
          .then(refreshState)
          .then(() => toast("照片已删除"))
          .catch((x) => toast(x.message));
    });
    $("#refreshWx").onclick = () => {
      routeWxCache.clear();
      $("#routeWeather").dataset.loaded = "";
      loadRouteWeather(true);
    };
    $("#expenseForm").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target,
        save = form.querySelector("[type=submit]");
      if (save.disabled) return;
      const amount = Number($("#expAmount").value),
        parts = $$("#expParticipants input:checked").map((x) => x.value);
      if (!validAmount(amount) || !parts.length)
        return toast("请输入有效金额（最多两位小数）并选择参与人");
      save.disabled = true;
      const label = save.textContent;
      save.textContent = "正在保存…";
      try {
        const f = $("#receiptInput").files?.[0];
        if (f && f.size > 20 * 1024 * 1024)
          throw new Error("凭证不能超过20 MB");
        const receipt = f ? await fileToData(f) : null;
        const result = await api("add_expense", {
          category: $("#expCategory").value,
          amount,
          payer: $("#expPayer").value,
          participants: parts,
          note: $("#expNote").value.trim() || $("#expCategory").value,
          status: "paid",
          actor: ME,
        });
        let receiptFailed = false;
        if (f) {
          try {
            if (!result.row?.id) throw new Error("缺少账单编号");
            await api(
              "attach_receipt",
              {
                expense_id: result.row.id,
                person: ME,
                data_url: receipt,
                name: f.name,
              },
              15000,
            );
          } catch {
            receiptFailed = true;
          }
        }
        form.reset();
        buildExpenseForm();
        await refreshState();
        toast(
          receiptFailed
            ? "账单已保存，凭证未上传成功。请勿重复记账。"
            : "账单已保存",
        );
      } catch (err) {
        toast("保存失败，输入已保留：" + err.message);
      } finally {
        save.disabled = false;
        save.textContent = label;
      }
    };
    $("#uploadPhotos").onclick = async () => {
      const fs = [...($("#photoInput").files || [])];
      if (!fs.length) return toast("先选择照片");
      $("#uploadPhotos").disabled = true;
      try {
        for (const f of fs)
          await api(
            "upload_photo",
            {
              uploaded_by: ME,
              caption: $("#photoCaption").value.trim(),
              data_url: await fileToData(f, 1200, 0.78),
            },
            15000,
          );
        $("#photoInput").value = "";
        $("#photoCaption").value = "";
        await refreshState();
        toast("照片已同步");
      } catch (err) {
        toast(err.message);
      } finally {
        $("#uploadPhotos").disabled = false;
      }
    };
    $("#bookingForm").onsubmit = async (e) => {
      e.preventDefault();
      if (!$("#bookingTitle").value.trim()) return;
      try {
        await api("add_booking", {
          kind: $("#bookingKind").value,
          title: $("#bookingTitle").value.trim(),
          details: $("#bookingDetails").value.trim(),
          uploaded_by: ME,
          status: "已确认",
        });
        e.target.reset();
        await refreshState();
        toast("预订已添加");
      } catch (err) {
        toast(err.message);
      }
    };
    $("#saveProfile").onclick = async () => {
      const nickname = $("#nicknameInput").value.trim(),
        role = $("#roleInput").value.trim();
      if (!nickname) return toast("昵称不能为空");
      try {
        await api("update_profile", { person: ME, nickname, role });
        await refreshState();
        toast("资料已同步给所有人");
      } catch (err) {
        toast(err.message);
      }
    };
    $("#changeAvatar").onclick = () => $("#avatarInput").click();
    $("#avatarInput").onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      $("#avatarState").textContent = "正在压缩并同步头像…";
      try {
        const data = await fileToData(f, 320, 0.78, true);
        await api("upload_avatar", { person: ME, data_url: data }, 15000);
        e.target.value = "";
        await refreshState();
        setAvatar($("#profileAvatar"), ME);
        setAvatar($("#homeAvatar"), ME);
        setAvatar($("#miniAvatar"), ME);
        $("#avatarState").textContent = "头像已同步给所有人";
        toast("头像更换成功");
      } catch (err) {
        $("#avatarState").textContent = "上传失败：" + err.message;
      }
    };
    $("#switchIdentity").onclick = () => {
      localStorage.removeItem("cw-person");
      location.href = "./";
    };
  }
  function buildExpenseForm() {
    $("#expPayer").innerHTML = TEAM.map(
      (p) => `<option ${p === ME ? "selected" : ""}>${p}</option>`,
    ).join("");
    $("#expParticipants").innerHTML = TEAM.map(
      (p) =>
        `<label><input type="checkbox" value="${p}" checked> ${esc(name(p))}</label>`,
    ).join("");
  }
  async function init() {
    bind();
    buildExpenseForm();
    $("#app").hidden = false;
    $("#bottomNav").hidden = false;
    renderAll();
    openView(location.hash.slice(1) || "now", true);
    startGps();
    api("heartbeat", { person: ME }).catch(() => {});
    await refreshState(false);
    renderAll();
    setTimeout(() => $("#boot").classList.add("hide"), 100);
    setTimeout(showDaily, 450);
    setInterval(() => {
      if (!document.hidden) {
        api("heartbeat", { person: ME }).catch(() => {});
        refreshState(false);
      }
    }, 30000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshState(false);
        api("heartbeat", { person: ME }).catch(() => {});
      }
    });
  }
  init().catch((err) => {
    window.__cwErrors?.push(String(err.message || err));
    return (() => {
      $("#boot").classList.add("hide");
      $("#app").hidden = false;
      $("#bottomNav").hidden = false;
      toast("部分云数据暂未加载，基础页面仍可使用");
    })();
  });
})();
