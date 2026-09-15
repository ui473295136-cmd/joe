const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");

const rentId = "7641baa6-8fb6-40bc-98ec-f6fb298e1da9";
const baseState = {
  expenses: [{
    id: rentId,
    category: "租车",
    amount: 1887,
    note: "租车",
    payer: "辉子",
    participants: ["瑞子", "普子", "航子", "辉子"],
    status: "paid",
    created_at: "2026-09-15T09:41:25Z",
  }],
  repayments: [],
  profiles: [], logs: [], memories: [], bookings: [], person_positions: [], ledger_acks: [], emergency_contacts: [],
};

test("only the expense payer can confirm per-person AA settlement and totals sync", async () => {
  const { dom, w, d } = await app("辉子");
  try {
    await until(() => !!w.CWLedgerSettlementV4 && !!w.CWLedgerDetailV3);
    w.dispatchEvent(new w.CustomEvent("cw:state", { detail: { state: structuredClone(baseState) } }));
    await wait(80);

    assert.match(d.querySelector("#ledgerList").textContent, /AA结算/);
    assert.match(d.querySelector("#ledgerList").textContent, /0\/3 已结清/);
    const yes = d.querySelector(`[data-cw-settle="yes"][data-expense="${rentId}"][data-debtor="瑞子"]`);
    assert.ok(yes, "payer should see a yes button for Rui's share");
    assert.equal(d.querySelector('#ledgerList [data-ledger="add-repay"]').hidden, true);

    const requests = [];
    w.fetch = async (_url, init = {}) => {
      const body = JSON.parse(init.body || "{}");
      requests.push(body);
      if (body.action === "add_repayment") {
        return new Response(JSON.stringify({
          ok: true,
          row: {
            id: "rp-rent-rui",
            trip_slug: "chuanxi2026",
            from_person: "瑞子",
            to_person: "辉子",
            amount: 471.75,
            note: "租车AA已结清",
            expense_id: rentId,
            created_at: new Date().toISOString(),
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (body.action === "delete_repayment") {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("Unexpected request " + body.action);
    };

    yes.click();
    await wait(100);
    assert.equal(requests.at(-1).action, "add_repayment");
    assert.equal(requests.at(-1).payload.actor, "辉子");
    assert.equal(requests.at(-1).payload.from_person, "瑞子");
    assert.equal(requests.at(-1).payload.to_person, "辉子");
    assert.equal(requests.at(-1).payload.amount, 471.75);
    assert.match(d.querySelector("#ledgerList").textContent, /1\/3 已结清/);
    assert.equal(Number(w.CWLedgerDetailV3.summary("辉子").getCt / 100), 943.5);

    w.confirm = () => true;
    const no = d.querySelector(`[data-cw-settle="no"][data-expense="${rentId}"][data-debtor="瑞子"]`);
    no.click();
    await wait(100);
    assert.equal(requests.at(-1).action, "delete_repayment");
    assert.match(d.querySelector("#ledgerList").textContent, /0\/3 已结清/);
    assert.equal(Number(w.CWLedgerDetailV3.summary("辉子").getCt / 100), 1415.25);
  } finally {
    dom.window.close();
  }
});

test("non-payer accounts can see settlement status but cannot confirm it", async () => {
  const { dom, w, d } = await app("瑞子");
  try {
    await until(() => !!w.CWLedgerSettlementV4);
    w.dispatchEvent(new w.CustomEvent("cw:state", { detail: { state: structuredClone(baseState) } }));
    await wait(80);
    assert.match(d.querySelector("#ledgerList").textContent, /需 .*辉子.* 本人确认/);
    assert.equal(d.querySelector(`[data-cw-settle="yes"][data-expense="${rentId}"]`), null);
  } finally {
    dom.window.close();
  }
});