(() => {
  "use strict";
  const TEAM = ["瑞子", "普子", "航子", "辉子"];
  const ME =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person") ||
    "瑞子";
  if (!TEAM.includes(ME)) return;
  const QA = window.CWSession?.qa === true;
  const FN = "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-sync";
  const TRIP = "chuanxi2026";
  let state = null,
    loading = null,
    timer = 0,
    observer = null,
    observed = null,
    pollId = null,
    disposed = false;

  const cents = (n) => Math.round(Number(n || 0) * 100);
  const moneyCt = (ct) =>
    "¥" +
    (Number(ct || 0) / 100).toLocaleString("zh-CN", {
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

  function normalizeParts(arr) {
    const src = Array.isArray(arr) && arr.length ? arr : TEAM;
    const set = new Set(src.filter((p) => TEAM.includes(p)));
    return TEAM.filter((p) => set.has(p));
  }

  function shareMap(expense) {
    const ps = normalizeParts(expense?.participants),
      total = cents(expense?.amount),
      out = {};
    if (!ps.length || total <= 0) return out;
    const base = Math.floor(total / ps.length),
      remainder = total % ps.length;
    ps.forEach((p, i) => (out[p] = base + (i < remainder ? 1 : 0)));
    return out;
  }

  function pairNet(data, from, to) {
    let net = 0;
    for (const e of data?.expenses || []) {
      if (e.status === "budget") continue;
      const shares = shareMap(e);
      if (e.payer === to && from !== to && shares[from]) net += shares[from];
      if (e.payer === from && from !== to && shares[to]) net -= shares[to];
    }
    for (const r of data?.repayments || []) {
      const ct = cents(r.amount);
      if (ct <= 0) continue;
      if (r.from_person === from && r.to_person === to) net -= ct;
      else if (r.from_person === to && r.to_person === from) net += ct;
    }
    return net;
  }

  function pairwisePlan(data) {
    const out = [];
    for (let i = 0; i < TEAM.length; i++) {
      for (let j = i + 1; j < TEAM.length; j++) {
        const a = TEAM[i],
          b = TEAM[j],
          net = pairNet(data, a, b);
        if (net > 0) out.push({ from: a, to: b, ct: net });
        else if (net < 0) out.push({ from: b, to: a, ct: -net });
      }
    }
    return out;
  }

  function profileName(person) {
    try {
      const live = window.CWProfiles?.get?.(person)?.nickname;
      if (live) return live;
    } catch {}
    return (
      (state?.profiles || []).find((p) => p.person === person)?.nickname || person
    );
  }

  function rowsFor(person = ME) {
    if (!state) return [];
    const plan = pairwisePlan(state),
      rows = [];
    for (const x of plan.filter((x) => x.to === person))
      rows.push({
        kind: "get",
        person: x.from,
        ct: x.ct,
        text: `应收 ${profileName(x.from)} ${moneyCt(x.ct)}`,
      });
    for (const x of plan.filter((x) => x.from === person))
      rows.push({
        kind: "owe",
        person: x.to,
        ct: x.ct,
        text: `应付 ${profileName(x.to)} ${moneyCt(x.ct)}`,
      });
    return rows;
  }

  function signature(rows) {
    return rows
      .map((r) => `${r.kind}:${r.person}:${r.ct}:${profileName(r.person)}`)
      .join("|");
  }

  function patch() {
    clearTimeout(timer);
    if (disposed) return;
    const card = document.querySelector("#cwDailyCard"),
      body = document.querySelector("#cwDailyBody");
    if (!card || !body || !state) return;
    const rows = rowsFor(ME),
      sig = signature(rows),
      existing = [...body.querySelectorAll(".cw-daily-line.money")],
      ours = existing.filter((el) => el.dataset.cwPairwise === "1");
    if (
      body.dataset.cwFinancePairSig === sig &&
      existing.length === rows.length &&
      ours.length === rows.length
    )
      return;

    existing.forEach((el) => el.remove());
    const html = rows
      .map(
        (r) =>
          `<div class="cw-daily-line money" data-cw-pairwise="1" data-cw-finance-kind="${r.kind}" data-cw-finance-person="${esc(r.person)}"><i>¥</i><div><span>账本 · 单独结算</span><b>${esc(r.text)}</b><small>${esc(profileName(r.person))} 的金额单独计算，不与其他人合并</small></div></div>`,
      )
      .join("");
    if (html) body.insertAdjacentHTML("afterbegin", html);
    body.dataset.cwFinancePairSig = sig;
    card.dataset.cwFinanceMode = "pairwise";
  }

  function schedule() {
    if (disposed) return;
    clearTimeout(timer);
    timer = setTimeout(patch, 25);
  }

  async function refresh(force = false) {
    if (disposed) return state;
    if (loading && !force) return loading;
    loading = fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trip_slug: TRIP,
        action: "get_state",
        payload: {},
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("账本同步失败");
        state = await r.json();
        schedule();
        return state;
      })
      .catch(() => state)
      .finally(() => (loading = null));
    return loading;
  }

  function watchCard() {
    if (disposed) return;
    const card = document.querySelector("#cwDailyCard");
    if (!card || card === observed) return;
    observer?.disconnect();
    observed = card;
    observer = new MutationObserver(() => {
      if (disposed) return;
      if (card.classList.contains("show")) {
        if (!state) refresh();
        schedule();
      }
    });
    observer.observe(card, { childList: true, subtree: true, attributes: true });
    if (card.classList.contains("show")) refresh();
  }

  function cleanup() {
    disposed = true;
    clearTimeout(timer);
    if (pollId != null) clearInterval(pollId);
    observer?.disconnect();
  }

  window.addEventListener("cw:state", (e) => {
    if (!e.detail?.state) return;
    state = e.detail.state;
    schedule();
  });
  window.addEventListener("cw:profiles", schedule);
  window.addEventListener("cw:sync-pulse", () => {
    if (document.querySelector("#cwDailyCard.show")) refresh(true);
  });
  window.addEventListener("focus", () => {
    if (document.querySelector("#cwDailyCard.show")) refresh(true);
  });
  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("unload", cleanup, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && document.querySelector("#cwDailyCard.show")) refresh(true);
  });

  const rootObserver = new MutationObserver(watchCard);
  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener(
    "unload",
    () => rootObserver.disconnect(),
    { once: true },
  );
  if (!QA)
    pollId = setInterval(() => {
      if (!document.hidden && document.querySelector("#cwDailyCard.show"))
        refresh(true);
    }, 5000);
  watchCard();

  window.CWDailyFinance = {
    pairwisePlan: () => pairwisePlan(state),
    rowsFor: (p) => rowsFor(p || ME),
    refresh,
    patch,
    setStateForTest: (s) => {
      state = s;
      patch();
    },
  };
})();