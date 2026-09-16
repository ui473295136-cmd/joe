const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");

test("daily popup shows each direct creditor separately instead of merging totals", async () => {
  const { dom, w, d } = await app("瑞子");
  try {
    await until(() => typeof w.__cwDailyTestOpen === "function" && !!w.CWDailyFinance);
    w.__cwDailyTestOpen();
    await until(() => d.querySelector("#cwDailyCard")?.classList.contains("show"));
    await wait(700);

    const state = {
      expenses: [
        {
          id: "hui-car",
          category: "租车",
          amount: 1800,
          payer: "辉子",
          participants: ["瑞子", "普子", "航子", "辉子"],
          status: "paid",
        },
        {
          id: "hang-air",
          category: "机票",
          amount: 1800,
          payer: "航子",
          participants: ["瑞子", "普子", "航子", "辉子"],
          status: "paid",
        },
      ],
      repayments: [],
      profiles: [],
    };
    w.CWDailyFinance.setStateForTest(state);
    const calculated = Array.from(w.CWDailyFinance.rowsFor("瑞子"), (x) => [
      String(x.person),
      Number(x.ct),
    ]).sort((a, b) => a[0].localeCompare(b[0]));
    assert.equal(calculated.length, 2);
    assert.equal(JSON.stringify(calculated), JSON.stringify([
      ["航子", 45000],
      ["辉子", 45000],
    ].sort((a, b) => a[0].localeCompare(b[0]))));
    await until(
      () =>
        d.querySelectorAll(
          "#cwDailyBody .cw-daily-line.money[data-cw-pairwise='1']",
        ).length === 2,
      1800,
    );

    const rows = [
      ...d.querySelectorAll(
        "#cwDailyBody .cw-daily-line.money[data-cw-pairwise='1']",
      ),
    ];
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((x) => x.dataset.cwFinancePerson).sort(),
      ["航子", "辉子"].sort(),
    );
    assert.ok(rows.every((x) => x.textContent.includes("¥450.00")));
    assert.equal(rows.some((x) => x.textContent.includes("¥900.00")), false);
  } finally {
    dom.window.close();
  }
});
