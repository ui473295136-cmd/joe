const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");

test("payer gets one-click approval and all ledger users get one-click read", async () => {
  const { dom, w, d } = await app("辉子");
  try {
    await until(() => !!d.querySelector("#cwApproveAllBtn") && !!w.CWSyncHub);
    await until(() => /一键审批/.test(d.querySelector("#cwApproveAllBtn")?.textContent || ""));
    const approve = d.querySelector("#cwApproveAllBtn");
    const read = d.querySelector("#cwAckAllBtn");
    assert.match(approve.textContent, /一键审批/);
    assert.match(read.textContent, /一键已读/);
    assert.equal(approve.disabled, false);
    assert.equal(read.disabled, false);

    const calls = [];
    const raw = w.fetch.bind(w);
    w.confirm = () => true;
    w.fetch = async (input, init = {}) => {
      const url = String(typeof input === "string" ? input : input?.url || "");
      let body = {};
      try {
        body = JSON.parse(init.body || "{}");
      } catch {}
      if (url.includes("/functions/v1/trip-ledger") && body.action === "settle_all")
        calls.push(body);
      return raw(input, init);
    };

    approve.click();
    await until(() => calls.length === 1);
    assert.equal(calls[0].payload.person, "辉子");
    assert.equal(calls[0].action, "settle_all");
    await until(() => /无需审批/.test(d.querySelector("#cwApproveAllBtn")?.textContent || ""));
    await wait(220);
  } finally {
    dom.window.close();
  }
});

test("finance sync signature changes whenever ledger money-affecting data changes", async () => {
  const { dom, w } = await app("瑞子");
  try {
    await until(() => !!w.CWSyncHub);
    const state = {
      expenses: [
        {
          id: "e1",
          amount: 1887,
          payer: "辉子",
          participants: ["瑞子", "普子", "航子", "辉子"],
          status: "paid",
        },
      ],
      repayments: [],
    };
    const a = w.CWSyncHub.financeSignature(state);
    const b = w.CWSyncHub.financeSignature({
      ...state,
      expenses: [{ ...state.expenses[0], amount: 2000 }],
    });
    const c = w.CWSyncHub.financeSignature({
      ...state,
      repayments: [
        {
          id: "r1",
          expense_id: "e1",
          from_person: "瑞子",
          to_person: "辉子",
          amount: 471.75,
        },
      ],
    });
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  } finally {
    dom.window.close();
  }
});
