const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app, wait, until } = require("./helpers.cjs");

test("nickname changes propagate across rendered scenes and profile limits are visible", async () => {
  const { dom, w, d } = await app("瑞子");
  try {
    await until(
      () =>
        !!w.CWProfiles &&
        !!w.CWProfileDisplay &&
        !!d.querySelector("#profileChangeHint"),
    );
    assert.match(d.querySelector("#profileChangeHint").textContent, /每天各\s*3\s*次/);

    const probe = d.createElement("div");
    probe.id = "profileSyncProbe";
    probe.textContent = "瑞子 应付给 普子";
    d.body.appendChild(probe);
    await wait(60);
    assert.match(probe.textContent, /瑞子昵称/);
    assert.match(probe.textContent, /普子昵称/);

    d.querySelector('[data-view="me"]').click();
    const nick = d.querySelector("#nicknameInput");
    nick.value = "瑞子新昵称";
    nick.dispatchEvent(new w.Event("input", { bubbles: true }));
    d.querySelector("#saveProfile").click();
    await until(() => !d.querySelector("#saveProfile").disabled);
    await wait(80);

    assert.match(d.querySelector("#helloName").textContent, /瑞子新昵称/);
    assert.match(probe.textContent, /瑞子新昵称/);
    assert.doesNotMatch(probe.textContent, /瑞子昵称/);
    const memberName = d.querySelector('[data-social-person="瑞子"] > b');
    if (memberName) assert.equal(memberName.textContent.trim(), "瑞子新昵称");
  } finally {
    dom.window.close();
  }
});

test("external profile events replace an already-rendered old nickname", async () => {
  const { dom, w, d } = await app("普子");
  try {
    await until(() => !!w.CWProfileDisplay && !!w.CWProfiles);
    const box = d.createElement("div");
    box.textContent = "航子昵称正在开车";
    d.body.appendChild(box);
    await wait(40);

    const current = w.CWProfiles.get("航子");
    w.dispatchEvent(
      new w.CustomEvent("cw:profiles", {
        detail: {
          profiles: [
            {
              ...current,
              person: "航子",
              nickname: "航班队长",
              updated_at: new Date(Date.now() + 1000).toISOString(),
            },
          ],
        },
      }),
    );
    await wait(60);
    assert.equal(box.textContent, "航班队长正在开车");
  } finally {
    dom.window.close();
  }
});
