const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");
for (const person of ["瑞子", "普子", "航子", "辉子"])
  test(
    person + " can load all four views with isolated fixture data",
    async () => {
      const { dom, w, d, errors } = await app(person);
      try {
        assert.equal(d.querySelector("#app").hidden, false);
        assert.equal(d.querySelectorAll("#bottomNav button").length, 4);
        for (const view of ["today", "trip", "me", "now"]) {
          d.querySelector(`[data-view="${view}"]`).click();
          assert.equal(d.querySelector(".view.on").id, "view-" + view);
        }
        assert.equal(d.querySelector("#homeAvatar").dataset.person, person);
        assert.equal(d.querySelectorAll("#cwMemberRow .cw-member").length, 4);
        assert.equal(
          d.querySelector("#forgetDevice").textContent.trim(),
          "退出登录并忘记此设备",
        );
        assert.deepEqual(Array.from(w.__cwErrors), []);
        assert.deepEqual(errors, []);
      } finally {
        dom.window.close();
      }
    },
  );
test("unsaved nickname and role survive state and profile refreshes plus tab changes", async () => {
  const { dom, w, d } = await app();
  try {
    d.querySelector('[data-view="me"]').click();
    for (const [id, value] of [
      ["nicknameInput", "没有保存的昵称"],
      ["roleInput", "没有保存的职责"],
    ]) {
      const input = d.getElementById(id);
      input.value = value;
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
    }
    w.document.dispatchEvent(new w.Event("visibilitychange"));
    await w.CWProfiles.refresh();
    await wait(150);
    d.querySelector('[data-view="now"]').click();
    d.querySelector('[data-view="me"]').click();
    assert.equal(d.querySelector("#nicknameInput").value, "没有保存的昵称");
    assert.equal(d.querySelector("#roleInput").value, "没有保存的职责");
    d.querySelector("#saveProfile").click();
    await until(() => !d.querySelector("#saveProfile").disabled);
    assert.equal(d.querySelector("#nicknameInput").dataset.dirty, undefined);
  } finally {
    dom.window.close();
  }
});
test("a social sheet locks background and Escape closes it", async () => {
  const { dom, w, d } = await app();
  try {
    d.querySelector("#cwMyStatus").click();
    await wait(30);
    assert.equal(d.body.classList.contains("cw-modal-open"), true);
    assert.equal(
      d.querySelector("#cwSocialSheet").getAttribute("aria-hidden"),
      "false",
    );
    d.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await wait(20);
    assert.equal(
      d.querySelector("#cwSocialSheet").classList.contains("show"),
      false,
    );
    assert.equal(d.body.classList.contains("cw-modal-open"), false);
  } finally {
    dom.window.close();
  }
});
test("photo inspiration module is removed from itinerary", async () => {
  const { dom, d } = await app();
  try {
    d.querySelector('[data-view="today"]').click();
    d.querySelector('[data-day="1"]').click();
    await wait(180);
    assert.equal(d.querySelector("#cwInspiration"), null);
    assert.equal(d.querySelector('[data-swipe-vote]'), null);
  } finally {
    dom.window.close();
  }
});
test("expense submit rejects excess precision and prevents duplicate writes", async () => {
  const { dom, w, d } = await app();
  try {
    let writes = 0;
    const base = w.fetch;
    w.fetch = async (i, o) => {
      const b = JSON.parse(o?.body || "{}");
      if (b.action === "add_expense") {
        writes++;
        await wait(80);
      }
      return base(i, o);
    };
    const form = d.querySelector("#expenseForm");
    d.querySelector("#expAmount").value = "0.001";
    form.dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await wait(20);
    assert.equal(writes, 0);
    d.querySelector("#expAmount").value = "12.34";
    form.dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await wait(180);
    assert.equal(writes, 1);
    assert.equal(d.querySelector("#expAmount").value, "");
  } finally {
    dom.window.close();
  }
});
test("map canvas survives close and reopen", async () => {
  const { dom, w, d } = await app();
  try {
    d.querySelector("#quickMapBtn").click();
    await wait(50);
    const canvas = d.querySelector("#cwMapCanvas");
    assert.ok(canvas);
    d.querySelector("#closeMapBtn").click();
    d.querySelector("#quickMapBtn").click();
    await wait(50);
    assert.equal(d.querySelector("#cwMapCanvas"), canvas);
  } finally {
    dom.window.close();
  }
});
test("avatar cropping remains square and inside image bounds at narrow and wide viewport sizes", async () => {
  const { dom, w, d } = await app();
  try {
    const stage = d.querySelector("#cropStage"),
      img = d.querySelector("#cropImage"),
      input = d.querySelector("#avatarInput");
    let size = 264;
    stage.getBoundingClientRect = () => ({ width: size, height: size });
    let draw = null;
    w.HTMLCanvasElement.prototype.getContext = () => ({
      fillRect() {},
      drawImage(...args) {
        draw = args;
      },
    });
    w.HTMLCanvasElement.prototype.toDataURL = () =>
      "data:image/jpeg;base64,dGVzdA==";
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new w.File(["image"], "portrait.jpg", { type: "image/jpeg" })],
    });
    Object.defineProperty(img, "naturalWidth", {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(img, "naturalHeight", {
      configurable: true,
      value: 1200,
    });
    for (size of [264, 300]) {
      input.dispatchEvent(new w.Event("change"));
      img.onload();
      const zoom = d.querySelector("#cropZoom");
      zoom.value = "1.5";
      zoom.dispatchEvent(new w.Event("input"));
      d.querySelector("#cropConfirm").click();
      await until(() => !d.querySelector("#changeAvatar").disabled);
      assert.equal(draw[3], draw[4]);
      assert.ok(draw[1] >= 0 && draw[2] >= 0);
      assert.ok(draw[1] + draw[3] <= 600.001 && draw[2] + draw[4] <= 1200.001);
      assert.equal(draw[7], 420);
      assert.equal(draw[8], 420);
    }
  } finally {
    dom.window.close();
  }
});