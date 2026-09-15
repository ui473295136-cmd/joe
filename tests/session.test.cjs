const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, root } = require("./helpers.cjs");
function setup(url = "https://ui473295136-cmd.github.io/joe/") {
  const dom = new JSDOM("", { url, runScripts: "outside-only" }),
    w = dom.window;
  w.AbortController = AbortController;
  w.eval(fs.readFileSync(path.join(root, "session-store.js"), "utf8"));
  return { dom, w, auth: w.CWSession };
}
const session = {
  token: "test-session-token-no-production-use",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};
test("remembered identities survive closing a tab without storing passwords", async () => {
  const { dom, w, auth } = setup();
  try {
    for (const p of auth.PEOPLE)
      auth.save(p, { ...session, token: session.token + p }, true);
    w.sessionStorage.clear();
    for (const p of auth.PEOPLE) {
      assert.equal(auth.get(p).token, session.token + p);
      assert.equal(auth.get(p).remembered, true);
    }
    for (let i = 0; i < w.localStorage.length; i++)
      assert.doesNotMatch(
        w.localStorage.getItem(w.localStorage.key(i)),
        /pin|password/,
      );
  } finally {
    dom.window.close();
  }
});
test("an unchecked remember option expires when the tab closes", () => {
  const { dom, w, auth } = setup();
  try {
    auth.save("瑞子", session, false);
    w.sessionStorage.clear();
    assert.equal(auth.get("瑞子"), null);
  } finally {
    dom.window.close();
  }
});
test("expired and corrupt records do not authenticate", () => {
  const { dom, w, auth } = setup();
  try {
    w.localStorage.setItem("cw-device-session-瑞子", "{broken");
    assert.equal(auth.get("瑞子"), null);
    w.localStorage.setItem(
      "cw-device-session-瑞子",
      JSON.stringify({ ...session, expires_at: "2020-01-01" }),
    );
    assert.equal(auth.get("瑞子"), null);
  } finally {
    dom.window.close();
  }
});
test("network failure keeps remembered login; server revocation removes it", async () => {
  const { dom, w, auth } = setup();
  try {
    auth.save("瑞子", session, true);
    w.fetch = async () => {
      throw new TypeError("offline");
    };
    await assert.rejects(auth.validate("瑞子"));
    assert.equal(auth.get("瑞子").token, session.token);
    w.fetch = async () =>
      new Response(JSON.stringify({ valid: false }), { status: 401 });
    assert.equal(await auth.validate("瑞子"), null);
    assert.equal(auth.get("瑞子"), null);
  } finally {
    dom.window.close();
  }
});
test("logout clears every identity even if the network is unavailable", async () => {
  const { dom, w, auth } = setup();
  try {
    for (const p of auth.PEOPLE) auth.save(p, session, true);
    w.fetch = async () => {
      throw new Error("offline");
    };
    await auth.logoutAll();
    for (const p of auth.PEOPLE) assert.equal(auth.get(p), null);
    assert.equal(w.localStorage.getItem("cw-person"), null);
  } finally {
    dom.window.close();
  }
});
test("public qa parameter cannot disable authentication", () => {
  const { dom, auth } = setup(
    "https://ui473295136-cmd.github.io/joe/app-v4.html?qa=1",
  );
  assert.equal(auth.qa, false);
  dom.window.close();
});
test("session signing applies only to our protected endpoints and preserves the payer", async () => {
  const { dom, w, auth } = setup(
    "https://ui473295136-cmd.github.io/joe/app-v4.html?person=瑞子",
  );
  try {
    auth.save("瑞子", session, true);
    let sent;
    w.fetch = async (i, o) => {
      sent = o;
      return new Response("{}");
    };
    auth.installFetchAuth();
    await w.fetch(
      "https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-sync",
      {
        method: "POST",
        body: JSON.stringify({
          action: "add_expense",
          payload: { payer: "普子", actor: "瑞子" },
        }),
      },
    );
    const b = JSON.parse(sent.body);
    assert.equal(b.payload.payer, "普子");
    assert.equal(b.payload.session_person, "瑞子");
    assert.equal(b.payload.session_token, session.token);
    const original = JSON.stringify({ value: "public" });
    await w.fetch("https://example.com/api", { body: original });
    assert.equal(sent.body, original);
  } finally {
    dom.window.close();
  }
});
