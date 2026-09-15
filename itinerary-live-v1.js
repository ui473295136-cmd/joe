(() => {
  "use strict";
  const DAYS = [
    {
      date: "2026-10-02",
      label: "Day 1",
      route: "天府机场 → 雅安",
      driveMin: 225,
      weatherPoint: [29.98, 103.01],
      weatherName: "雅安",
      nodes: [
        { n: "天府机场", lat: 30.312, lon: 104.441 },
        { n: "服务区", f: 0.54 },
        { n: "雅安", lat: 29.981, lon: 103.003 },
      ],
    },
    {
      date: "2026-10-03",
      label: "Day 2",
      route: "雅安 → 泸定 → 康定 → 折多山 → 新都桥",
      driveMin: 435,
      weatherPoint: [30.05, 101.49],
      weatherName: "新都桥",
      nodes: [
        { n: "雅安", lat: 29.981, lon: 103.003 },
        { n: "泸定", lat: 29.914, lon: 102.235 },
        { n: "康定", lat: 30.05, lon: 101.956 },
        { n: "折多山", lat: 30.05, lon: 101.79 },
        { n: "新都桥", lat: 30.05, lon: 101.49 },
      ],
    },
    {
      date: "2026-10-04",
      label: "Day 3",
      route: "新都桥 → 塔公 → 八美 → 丹巴中路藏寨",
      driveMin: 270,
      weatherPoint: [30.88, 101.89],
      weatherName: "丹巴",
      nodes: [
        { n: "新都桥", lat: 30.05, lon: 101.49 },
        { n: "塔公", lat: 30.32, lon: 101.54 },
        { n: "八美", lat: 30.47, lon: 101.5 },
        { n: "丹巴", lat: 30.88, lon: 101.89 },
        { n: "中路藏寨", lat: 30.96, lon: 101.91 },
      ],
    },
    {
      date: "2026-10-05",
      label: "Day 4",
      route: "丹巴 → 小金 → 四姑娘山双桥沟",
      driveMin: 210,
      weatherPoint: [31.05, 102.84],
      weatherName: "四姑娘山",
      nodes: [
        { n: "丹巴", lat: 30.88, lon: 101.89 },
        { n: "小金", lat: 31.0, lon: 102.36 },
        { n: "双桥沟", lat: 31.05, lon: 102.84 },
        { n: "四姑娘山镇", lat: 31.0, lon: 102.85 },
      ],
    },
    {
      date: "2026-10-06",
      label: "Day 5",
      route: "四姑娘山 → 卧龙 → 映秀 → 都江堰 → 天府机场",
      driveMin: 540,
      weatherPoint: [30.31, 104.44],
      weatherName: "成都天府机场",
      nodes: [
        { n: "四姑娘山镇", lat: 31.0, lon: 102.85 },
        { n: "卧龙", lat: 31.04, lon: 103.17 },
        { n: "映秀", lat: 31.06, lon: 103.49 },
        { n: "都江堰", lat: 31.0, lon: 103.62 },
        { n: "天府机场", lat: 30.312, lon: 104.441 },
      ],
    },
    {
      date: "2026-10-07",
      label: "Day 6",
      route: "机场酒店 → 还车 → 航站楼",
      driveMin: 30,
      weatherPoint: [30.31, 104.44],
      weatherName: "成都天府机场",
      nodes: [
        { n: "机场酒店", f: 0 },
        { n: "还车点", f: 0.62 },
        { n: "航站楼", f: 1 },
      ],
    },
  ];
  const WX = {
    0: ["晴", "☀️"],
    1: ["大致晴", "🌤️"],
    2: ["多云", "⛅"],
    3: ["阴", "☁️"],
    45: ["雾", "🌫️"],
    48: ["雾", "🌫️"],
    51: ["毛毛雨", "🌦️"],
    53: ["毛毛雨", "🌦️"],
    55: ["毛毛雨", "🌦️"],
    61: ["小雨", "🌧️"],
    63: ["中雨", "🌧️"],
    65: ["大雨", "🌧️"],
    71: ["小雪", "🌨️"],
    73: ["中雪", "🌨️"],
    75: ["大雪", "🌨️"],
    80: ["阵雨", "🌦️"],
    81: ["阵雨", "🌦️"],
    82: ["强阵雨", "⛈️"],
    95: ["雷暴", "⛈️"],
  };
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  let routeData = null,
    routePromise = null,
    lastPos = null,
    weatherTimer = null;
  const qa = window.CWSession?.qa === true;
  function cnDate() {
    return new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Shanghai",
    });
  }
  function dateDiff(d) {
    const a = new Date(cnDate() + "T00:00:00+08:00"),
      b = new Date(d + "T00:00:00+08:00");
    return Math.round((b - a) / 86400000);
  }
  function h(a, b) {
    const R = 6371,
      p = Math.PI / 180,
      d1 = (b[1] - a[1]) * p,
      d2 = (b[0] - a[0]) * p,
      x =
        Math.sin(d1 / 2) ** 2 +
        Math.cos(a[1] * p) * Math.cos(b[1] * p) * Math.sin(d2 / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function fmtMin(m) {
    m = Math.max(5, Math.round(m / 5) * 5);
    return m < 60
      ? `约${m}分钟`
      : `约${Math.floor(m / 60)}小时${m % 60 ? (m % 60) + "分" : ""}`;
  }
  function currentDayIndex() {
    const d = cnDate(),
      i = DAYS.findIndex((x) => x.date === d);
    if (i >= 0) return i;
    if (d < DAYS[0].date) return 0;
    return DAYS.length - 1;
  }
  function routeStatus(i) {
    const d = cnDate();
    if (d < DAYS[i].date) return { ratio: 0, label: "未出发" };
    if (d > DAYS[i].date) return { ratio: 1, label: "计划日期已结束" };
    return { ratio: null, label: "进行中" };
  }
  function cachedPos() {
    try {
      const x = JSON.parse(localStorage.getItem("cw-lastpos-v4") || "null");
      if (x && Date.now() - (x.time || 0) < 86400000) return x;
    } catch (e) {}
    return null;
  }
  function watchPos() {
    const use = (p) => {
      lastPos = {
        lat: p.coords?.latitude ?? p.lat,
        lon: p.coords?.longitude ?? p.lon,
        accuracy: p.coords?.accuracy ?? p.accuracy,
        altitude: p.coords?.altitude ?? p.altitude,
        time: p.timestamp || p.time || Date.now(),
      };
      renderCurrentWeather();
      const sel = Number(
        $("#simpleItinerary .day-chip.on")?.dataset.day ?? currentDayIndex(),
      );
      if (Number.isFinite(sel)) enhanceItinerary(sel);
    };
    const c = cachedPos();
    if (c) use(c);
    if (navigator.geolocation)
      navigator.geolocation.watchPosition(use, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 8000,
        timeout: 12000,
      });
  }
  function ensureWeatherCard() {
    if ($("#cwCurrentWeather")) return;
    const now = $(".now-card");
    if (!now) return;
    const card = document.createElement("section");
    card.id = "cwCurrentWeather";
    card.className = "card cw-current-weather";
    card.innerHTML =
      '<div class="cw-wx-head"><div><span>实时天气</span><h2 id="cwWxPlace">等待定位</h2></div><small id="cwWxUpdated">—</small></div><div class="cw-wx-main"><b id="cwWxTemp">—</b><div><strong id="cwWxText">正在获取天气</strong><span id="cwWxFeel">—</span></div></div><div class="cw-wx-dress"><span>穿衣建议</span><b id="cwWxDress">定位后自动更新</b></div><p class="cw-wx-source">GPS坐标 + Open-Meteo 自动匹配最佳模型</p>';
    now.insertAdjacentElement("afterend", card);
  }
  function dress(t, feel, precip, wind) {
    const x = Math.min(t, feel);
    let s =
      x <= 0
        ? "羽绒服 + 保暖层"
        : x <= 8
          ? "厚外套/薄羽绒 + 长裤"
          : x <= 15
            ? "外套 + 长袖，早晚加一层"
            : x <= 22
              ? "长袖或薄外套"
              : "短袖为主，随身带薄外套";
    if (precip > 0) s += "，带防水外层/雨具";
    if (wind >= 30) s += "，注意防风";
    return s;
  }
  function weatherCacheKey(lat, lon) {
    return `cw-wx-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  }
  async function getCurrentWeather(lat, lon) {
    if (qa)
      return {
        temperature_2m: 25,
        apparent_temperature: 25,
        weather_code: 0,
        precipitation: 0,
        wind_speed_10m: 8,
        time: new Date().toISOString(),
      };
    const key = weatherCacheKey(lat, lon);
    try {
      const c = JSON.parse(localStorage.getItem(key) || "null");
      if (c && Date.now() - c.saved < 10 * 60 * 1000) return c.data;
    } catch (e) {}
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&timezone=auto`;
    const ac = new AbortController(),
      tm = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(u, { signal: ac.signal });
      if (!r.ok) throw new Error("weather");
      const j = await r.json(),
        data = j.current;
      localStorage.setItem(key, JSON.stringify({ saved: Date.now(), data }));
      return data;
    } finally {
      clearTimeout(tm);
    }
  }
  async function renderCurrentWeather() {
    ensureWeatherCard();
    if (!lastPos) return;
    const place = $("#nowPlace")?.textContent?.trim() || "当前位置";
    $("#cwWxPlace").textContent = place === "等待定位" ? "当前位置" : place;
    const token = `${lastPos.lat.toFixed(3)},${lastPos.lon.toFixed(3)}`;
    if (
      $("#cwCurrentWeather").dataset.token === token &&
      weatherTimer &&
      Date.now() - weatherTimer < 5 * 60 * 1000
    )
      return;
    $("#cwCurrentWeather").dataset.token = token;
    try {
      const w = await getCurrentWeather(lastPos.lat, lastPos.lon);
      weatherTimer = Date.now();
      const [txt, ico] = WX[w.weather_code] || ["天气", "🌤️"];
      $("#cwWxTemp").textContent = `${Math.round(w.temperature_2m)}°`;
      $("#cwWxText").textContent = `${ico} ${txt}`;
      $("#cwWxFeel").textContent =
        `体感 ${Math.round(w.apparent_temperature)}° · 风 ${Math.round(w.wind_speed_10m || 0)}km/h`;
      $("#cwWxDress").textContent = dress(
        w.temperature_2m,
        w.apparent_temperature,
        w.precipitation || 0,
        w.wind_speed_10m || 0,
      );
      $("#cwWxUpdated").textContent =
        `${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })} 更新`;
    } catch (e) {
      try {
        const vals = JSON.parse(
          localStorage.getItem(weatherCacheKey(lastPos.lat, lastPos.lon)) ||
            "null",
        );
        if (vals) {
          const w = vals.data,
            [txt, ico] = WX[w.weather_code] || ["天气", "🌤️"];
          $("#cwWxTemp").textContent = `${Math.round(w.temperature_2m)}°`;
          $("#cwWxText").textContent = `${ico} ${txt}`;
          $("#cwWxFeel").textContent = "离线缓存";
          $("#cwWxDress").textContent = dress(
            w.temperature_2m,
            w.apparent_temperature,
            w.precipitation || 0,
            w.wind_speed_10m || 0,
          );
          $("#cwWxUpdated").textContent = "最近缓存";
        } else $("#cwWxText").textContent = "天气暂时无法更新";
      } catch (_) {}
    }
  }
  async function getTripWeather(i) {
    const d = DAYS[i],
      diff = dateDiff(d.date);
    if (diff > 16) return { future: true, diff };
    if (diff < 0) return { past: true };
    const key = `cw-tripwx-${d.date}`;
    try {
      const c = JSON.parse(localStorage.getItem(key) || "null");
      if (c && Date.now() - c.saved < 3 * 60 * 60 * 1000) return c.data;
    } catch (e) {}
    if (qa)
      return {
        weather_code: 2,
        temperature_2m_max: 12 + i,
        temperature_2m_min: 4 + i,
        precipitation_probability_max: 20,
        wind_speed_10m_max: 18,
      };
    const [lat, lon] = d.weatherPoint;
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FShanghai&start_date=${d.date}&end_date=${d.date}`;
    const ac = new AbortController(),
      tm = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(u, { signal: ac.signal });
      if (!r.ok) throw new Error("weather");
      const j = await r.json();
      if (!j.daily?.time?.length) return { future: true, diff };
      const data = {
        weather_code: j.daily.weather_code[0],
        temperature_2m_max: j.daily.temperature_2m_max[0],
        temperature_2m_min: j.daily.temperature_2m_min[0],
        precipitation_probability_max: j.daily.precipitation_probability_max[0],
        wind_speed_10m_max: j.daily.wind_speed_10m_max[0],
      };
      localStorage.setItem(key, JSON.stringify({ saved: Date.now(), data }));
      return data;
    } catch (e) {
      try {
        const c = JSON.parse(localStorage.getItem(key) || "null");
        if (c) return { ...c.data, cached: true };
      } catch (_) {}
      return { error: true };
    } finally {
      clearTimeout(tm);
    }
  }
  function weatherText(i, w) {
    if (w.future) return `距出发${w.diff}天 · 尚未进入16天预报`;
    if (w.past) return "行程已结束";
    if (w.error) return "天气暂时无法更新";
    const [txt, ico] = WX[w.weather_code] || ["天气", "🌤️"];
    return `${ico} ${txt} ${Math.round(w.temperature_2m_min)}–${Math.round(w.temperature_2m_max)}℃ · 降水${Math.round(w.precipitation_probability_max || 0)}%`;
  }
  async function paintDayWeathers() {
    const chips = $$("#simpleItinerary [data-day]");
    chips.forEach((b, i) => {
      let s = b.querySelector(".cw-daywx");
      if (!s) {
        s = document.createElement("small");
        s.className = "cw-daywx";
        b.appendChild(s);
      }
      s.textContent = "天气…";
      getTripWeather(i)
        .then((w) => {
          s.textContent = weatherText(i, w);
        })
        .catch(() => {
          s.textContent = "天气暂不可用";
        });
    });
  }
  async function ensureRoutes() {
    if (routeData) return routeData;
    if (routePromise) return routePromise;
    routePromise = fetch("./road-routes.json")
      .then((r) => {
        if (!r.ok) throw new Error("route");
        return r.json();
      })
      .then((j) => ((routeData = j), j))
      .catch(() => null);
    return routePromise;
  }
  function cumulative(coords) {
    const c = [0];
    for (let i = 1; i < coords.length; i++)
      c[i] = c[i - 1] + h(coords[i - 1], coords[i]);
    return c;
  }
  function nearestIndex(coords, node, start = 0) {
    if (Number.isFinite(node.f))
      return Math.min(
        coords.length - 1,
        Math.max(start, Math.round(node.f * (coords.length - 1))),
      );
    let bi = start,
      bd = Infinity;
    for (
      let i = start;
      i < coords.length;
      i += Math.max(1, Math.floor(coords.length / 1200))
    ) {
      const d = h(coords[i], [node.lon, node.lat]);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    const lo = Math.max(start, bi - 30),
      hi = Math.min(coords.length - 1, bi + 30);
    for (let i = lo; i <= hi; i++) {
      const d = h(coords[i], [node.lon, node.lat]);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi;
  }
  function closestRouteIndex(coords, pos) {
    let bi = 0,
      bd = Infinity;
    for (
      let i = 0;
      i < coords.length;
      i += Math.max(1, Math.floor(coords.length / 1000))
    ) {
      const d = h(coords[i], [pos.lon, pos.lat]);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return { index: bi, km: bd };
  }
  function congestion(i, seg) {
    const names = DAYS[i].nodes;
    const b = names[seg]?.n || "",
      e = names[seg + 1]?.n || "";
    if (i === 0) return seg === 0 ? "高" : "中";
    if (i === 1) {
      if (/康定|折多山/.test(b + e)) return "高";
      return seg < 2 ? "中高" : "中";
    }
    if (i === 2) return /塔公|八美/.test(b + e) ? "中高" : "中";
    if (i === 3) return /双桥沟/.test(b + e) ? "高" : "中";
    if (i === 4) return /都江堰|天府/.test(b + e) ? "高" : "中";
    return "中";
  }
  function riskClass(x) {
    return x === "高" ? "high" : x === "中高" ? "medhigh" : "med";
  }
  function project(coords, w = 680, hg = 230, pad = 18) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    coords.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    const sx = (w - pad * 2) / Math.max(0.00001, maxX - minX),
      sy = (hg - pad * 2) / Math.max(0.00001, maxY - minY),
      s = Math.min(sx, sy),
      ox = (w - (maxX - minX) * s) / 2,
      oy = (hg - (maxY - minY) * s) / 2;
    return coords.map(([x, y]) => [
      ox + (x - minX) * s,
      hg - (oy + (y - minY) * s),
    ]);
  }
  function makePath(pts) {
    return pts
      .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
      .join(" ");
  }
  async function renderRoutePanel(i) {
    const host = $("#simpleItinerary .itinerary-card");
    if (!host) return;
    let panel = $("#cwRoutePanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "cwRoutePanel";
      panel.className = "cw-route-panel";
      host.appendChild(panel);
    }
    panel.innerHTML =
      '<div class="cw-route-loading">正在读取当天真实道路路线…</div>';
    const all = await ensureRoutes();
    if (
      !panel.isConnected ||
      Number($("#simpleItinerary [data-day].on")?.dataset.day) !== i
    )
      return;
    const raw = all?.[String(i)]?.coordinates || [];
    if (raw.length < 2) {
      panel.innerHTML =
        '<div class="cw-route-loading">这一天暂时没有路线数据</div>';
      return;
    }
    const cum = cumulative(raw),
      total = cum[cum.length - 1];
    const status = routeStatus(i);
    let ratio = status.ratio,
      label = status.label;
    if (ratio === null) {
      const near = lastPos ? closestRouteIndex(raw, lastPos) : null;
      if (near && near.km < 35) {
        ratio = near.index / (raw.length - 1);
        label = `已完成约 ${Math.round(ratio * 100)}%`;
      } else {
        ratio = 0;
        label = "今天尚未进入规划路线";
      }
    }
    const sampled = [],
      step = Math.max(1, Math.ceil(raw.length / 500));
    for (let x = 0; x < raw.length; x += step) sampled.push(raw[x]);
    if (sampled[sampled.length - 1] !== raw[raw.length - 1])
      sampled.push(raw[raw.length - 1]);
    const pts = project(sampled);
    const cut = Math.max(
      0,
      Math.min(pts.length - 1, Math.round(ratio * (pts.length - 1))),
    );
    const done = pts.slice(0, cut + 1),
      left = pts.slice(Math.max(0, cut), pts.length);
    let nodeIdx = [],
      prev = 0;
    DAYS[i].nodes.forEach((n) => {
      const ix = nearestIndex(raw, n, prev);
      nodeIdx.push(ix);
      prev = ix;
    });
    const markers = nodeIdx
      .map((ix, k) => {
        const si = Math.min(
            pts.length - 1,
            Math.round((ix / (raw.length - 1)) * (pts.length - 1)),
          ),
          p = pts[si],
          n = DAYS[i].nodes[k];
        return `<g><circle cx="${p[0]}" cy="${p[1]}" r="6"/><text x="${p[0] + 8}" y="${p[1] - 8}">${n.n}</text></g>`;
      })
      .join("");
    let current = "";
    if (cnDate() === DAYS[i].date && lastPos && ratio > 0 && ratio < 1) {
      const p = pts[cut];
      current = `<g class="cw-current-dot"><circle cx="${p[0]}" cy="${p[1]}" r="9"/><circle cx="${p[0]}" cy="${p[1]}" r="3"/></g>`;
    }
    const segs = [];
    for (let k = 0; k < nodeIdx.length - 1; k++) {
      const km = Math.max(0.5, cum[nodeIdx[k + 1]] - cum[nodeIdx[k]]),
        mins = (km / Math.max(1, total)) * DAYS[i].driveMin,
        risk = congestion(i, k);
      segs.push(
        `<div class="cw-seg"><div><b>${DAYS[i].nodes[k].n} → ${DAYS[i].nodes[k + 1].n}</b><span>约 ${Math.round(km)} km · ${fmtMin(mins)}</span></div><em class="${riskClass(risk)}">国庆拥堵风险 ${risk}</em></div>`,
      );
    }
    panel.innerHTML = `<div class="cw-route-head"><div><span>路线进度图</span><h3>${DAYS[i].route}</h3></div><b>${label}</b></div><div class="cw-route-legend"><span><i class="done"></i>已走</span><span><i class="left"></i>未走</span><small>基于规划道路轨迹；拥堵为国庆预判，不是实时路况</small></div><svg class="cw-route-svg" viewBox="0 0 680 230" preserveAspectRatio="xMidYMid meet"><path class="cw-route-left" d="${makePath(left)}"/><path class="cw-route-done" d="${makePath(done)}"/><g class="cw-route-markers">${markers}</g>${current}</svg><div class="cw-segments">${segs.join("")}</div>`;
  }
  async function renderSelectedWeather(i) {
    const host = $("#simpleItinerary .itinerary-card");
    if (!host) return;
    let box = $("#cwSelectedWeather");
    if (!box) {
      box = document.createElement("section");
      box.id = "cwSelectedWeather";
      box.className = "cw-selected-weather";
      host.insertBefore(box, $("#cwRoutePanel") || null);
    }
    box.innerHTML = "<span>当天目的地天气</span><b>正在更新…</b>";
    const w = await getTripWeather(i);
    if (
      !box.isConnected ||
      Number($("#simpleItinerary [data-day].on")?.dataset.day) !== i
    )
      return;
    box.innerHTML = `<span>${DAYS[i].weatherName} · ${DAYS[i].date}</span><b>${weatherText(i, w)}</b><small>${w.future ? "预报窗口开放后自动更新" : "天气数据每3小时刷新一次"}</small>`;
  }
  async function enhanceItinerary(i) {
    if (!$("#simpleItinerary")) return;
    await Promise.resolve();
    paintDayWeathers();
    renderSelectedWeather(i);
    renderRoutePanel(i);
  }
  function bind() {
    document.addEventListener(
      "click",
      (e) => {
        const d = e.target.closest("[data-day]");
        if (d) setTimeout(() => enhanceItinerary(Number(d.dataset.day)), 30);
        const nav = e.target.closest('#bottomNav button[data-view="today"]');
        if (nav)
          setTimeout(
            () =>
              enhanceItinerary(
                Number(
                  $("#simpleItinerary .day-chip.on")?.dataset.day ??
                    currentDayIndex(),
                ),
              ),
            80,
          );
      },
      true,
    );
  }
  function init() {
    ensureWeatherCard();
    bind();
    watchPos();
    const wait = () => {
      if ($("#simpleItinerary")) {
        enhanceItinerary(currentDayIndex());
        renderCurrentWeather();
      } else setTimeout(wait, 80);
    };
    wait();
    setInterval(renderCurrentWeather, 10 * 60 * 1000);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 120), {
      once: true,
    });
  else setTimeout(init, 120);
})();
