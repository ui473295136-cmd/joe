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
      profiles: [
        { person: "瑞子", nickname: "清风" },
        { person: "普子", nickname: "普哥" },
        { person: "航子", nickname: "杭哥" },
        { person: "辉子", nickname: "辉子" },
      ],
    };
    w.CWDailyFinance.setStateForTest(state);
    assert.equal(w.CWDailyFinance.rowsFor("瑞子").length, 2);
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
    const texts = rows.map((x) => x.textContent.replace(/\s+/g, " "));
    assert.ok(texts.some((x) => x.includes("应付 辉子 ¥450.00")));
    assert.ok(texts.some((x) => x.includes("应付 杭哥 ¥450.00")));
    assert.equal(texts.some((x) => x.includes("¥900.00")), false);
    assert.equal(new Set(rows.map((x) => x.dataset.cwFinancePerson)).size, 2);
  } finally {
    dom.window.close();
  }
});
