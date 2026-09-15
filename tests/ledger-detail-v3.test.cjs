const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");

const productionLikeState = {
  expenses: [
    { id: "e1", category: "住宿", amount: 456, note: "上喜民宿（新都桥店）", payer: "瑞子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-14T07:55:54Z" },
    { id: "e2", category: "住宿", amount: 407.36, note: "雅安空山云宿城市民宿", payer: "瑞子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-14T07:55:54Z" },
    { id: "e3", category: "机票", amount: 6320, note: "往返机票", payer: "航子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-14T07:55:54Z" },
    { id: "e4", category: "住宿", amount: 674.99, note: "谷道山居（中路藏寨店）", payer: "瑞子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-14T07:55:54Z" },
    { id: "e5", category: "住宿", amount: 276, note: "天府云朵酒店", payer: "瑞子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-14T07:55:54Z" },
    { id: "e6", category: "租车", amount: 1887, note: "租车", payer: "辉子", participants: ["瑞子", "普子", "航子", "辉子"], status: "paid", created_at: "2026-09-15T09:41:25Z" },
  ],
  repayments: [
    { id: "r1", from_person: "瑞子", to_person: "航子", amount: 1580, note: "机票AA已结清", created_at: "2026-09-14T07:57:26Z" },
    { id: "r2", from_person: "辉子", to_person: "航子", amount: 1580, note: "机票AA已结清", created_at: "2026-09-14T07:57:26Z" },
    { id: "r3", from_person: "普子", to_person: "航子", amount: 1580, note: "机票AA已结清", created_at: "2026-09-14T07:57:26Z" },
  ],
  profiles: [], logs: [], memories: [], bookings: [], person_positions: [], ledger_acks: [], emergency_contacts: [],
};

function yuan(ct) { return Number((ct / 100).toFixed(2)); }

test("ledger v3 preserves direct pair debts and reconciles all four people", async () => {
  const { dom, w, d } = await app("瑞子");
  try {
    await until(() => !!w.CWLedgerDetailV3);
    w.dispatchEvent(new w.CustomEvent("cw:state", { detail: { state: productionLikeState } }));
    await wait(100);

    const rz = w.CWLedgerDetailV3.summary("瑞子");
    const pz = w.CWLedgerDetailV3.summary("普子");
    const hz = w.CWLedgerDetailV3.summary("航子");
    const huiz = w.CWLedgerDetailV3.summary("辉子");

    assert.deepEqual([yuan(rz.outflowCt), yuan(rz.shareCt), yuan(rz.getCt), yuan(rz.oweCt)], [3394.35, 2505.34, 907.18, 18.17]);
    assert.deepEqual([yuan(pz.outflowCt), yuan(pz.shareCt), yuan(pz.getCt), yuan(pz.oweCt)], [1580, 2505.34, 0, 925.34]);
    assert.deepEqual([yuan(hz.outflowCt), yuan(hz.shareCt), yuan(hz.getCt), yuan(hz.oweCt)], [1580, 2505.34, 0, 925.34]);
    assert.deepEqual([yuan(huiz.outflowCt), yuan(huiz.shareCt), yuan(huiz.getCt), yuan(huiz.oweCt)], [3467, 2505.33, 961.67, 0]);

    const plan = w.CWLedgerDetailV3.pairwisePlan().map(x => [x.from, x.to, yuan(x.ct)]);
    assert.equal(JSON.stringify(plan), JSON.stringify([
      ["普子", "瑞子", 453.59],
      ["航子", "瑞子", 453.59],
      ["瑞子", "辉子", 18.17],
      ["普子", "辉子", 471.75],
      ["航子", "辉子", 471.75],
    ]));

    assert.match(d.querySelector("#settlementLines").textContent, /普子\s*应付给我/);
    assert.match(d.querySelector("#settlementLines").textContent, /453\.59/);
    assert.match(d.querySelector("#settlementLines").textContent, /我应付给\s*辉子/);

    d.querySelector('#meMoney [data-ledger-kind="get"]').click();
    await wait(20);
    assert.equal(d.querySelector("#ledgerDetailOverlay").getAttribute("aria-hidden"), "false");
    assert.match(d.querySelector("#ledgerDetailBody").textContent, /普子/);
    assert.match(d.querySelector("#ledgerDetailBody").textContent, /上喜民宿/);
    assert.match(d.querySelector("#ledgerDetailBody").textContent, /907\.18/);
  } finally {
    dom.window.close();
  }
});
