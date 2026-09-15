const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
let code = fs
  .readFileSync(
    path.join(__dirname, "../supabase/functions/_shared/session.ts"),
    "utf8",
  )
  .replace("export async function", "async function");
code = stripTypeScriptTypes(code);
const ctx = vm.createContext({
  crypto: global.crypto,
  TextEncoder,
  Uint8Array,
  btoa,
  Date,
});
vm.runInContext(code, ctx);
function db(row) {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => query };
}
test("protected APIs reject missing, expired and impersonated sessions", async () => {
  const p = {
    session_person: "瑞子",
    session_token: "a-disposable-test-session-token",
    actor: "瑞子",
  };
  assert.equal((await ctx.authorize(db(null), "chuanxi2026", {})).status, 401);
  assert.equal((await ctx.authorize(db(null), "chuanxi2026", p)).status, 401);
  assert.equal(
    (await ctx.authorize(db({ expires_at: "2020-01-01" }), "chuanxi2026", p))
      .status,
    401,
  );
  assert.equal(
    (
      await ctx.authorize(
        db({ expires_at: new Date(Date.now() + 50000).toISOString() }),
        "chuanxi2026",
        { ...p, actor: "普子" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await ctx.authorize(
        db({ expires_at: new Date(Date.now() + 50000).toISOString() }),
        "chuanxi2026",
        p,
      )
    ).ok,
    true,
  );
});
