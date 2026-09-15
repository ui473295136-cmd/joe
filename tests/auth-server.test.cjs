const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
function server() {
  const tables = {
    person_sessions: [],
    person_access: [
      {
        trip_slug: "chuanxi2026",
        person: "瑞子",
        pin_hash: "test-only",
        failed_attempts: 0,
      },
    ],
  };
  class Query {
    constructor(name) {
      this.name = name;
      this.filters = [];
      this.op = "select";
    }
    select() {
      return this;
    }
    eq(k, v) {
      this.filters.push((r) => r[k] === v);
      return this;
    }
    lt(k, v) {
      this.filters.push((r) => r[k] < v);
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    update(value) {
      this.op = "update";
      this.value = value;
      return this;
    }
    insert(row) {
      tables[this.name].push({ ...row });
      return Promise.resolve({ error: null });
    }
    run() {
      const rows = tables[this.name].filter((r) =>
        this.filters.every((fn) => fn(r)),
      );
      if (this.op === "delete")
        tables[this.name] = tables[this.name].filter((r) => !rows.includes(r));
      if (this.op === "update")
        rows.forEach((r) => Object.assign(r, this.value));
      return { data: rows, error: null };
    }
    maybeSingle() {
      const result = this.run();
      return Promise.resolve({ ...result, data: result.data[0] || null });
    }
    then(yes, no) {
      return Promise.resolve(this.run()).then(yes, no);
    }
  }
  const db = { from: (name) => new Query(name) };
  let handler;
  let code = fs
    .readFileSync(
      path.join(__dirname, "../supabase/functions/trip-auth/index.ts"),
      "utf8",
    )
    .replace(/^import[^\n]+\n/, "");
  code = stripTypeScriptTypes(code);
  const context = vm.createContext({
    createClient: () => db,
    crypto: global.crypto,
    TextEncoder,
    Uint8Array,
    Response,
    Date,
    atob,
    btoa,
    Deno: { env: { get: () => "test" }, serve: (fn) => (handler = fn) },
  });
  vm.runInContext(code, context);
  return {
    tables,
    db,
    context,
    call: async (action, payload) =>
      handler(
        new Request("https://test.invalid", {
          method: "POST",
          body: JSON.stringify({ trip_slug: "chuanxi2026", action, payload }),
        }),
      ),
  };
}
test("server issues 30-day remembered sessions and keeps ordinary sessions at 12 hours", async () => {
  const { context, db } = server();
  const remembered = await context.issueSession(
      db,
      "chuanxi2026",
      "瑞子",
      true,
    ),
    ordinary = await context.issueSession(db, "chuanxi2026", "瑞子", false);
  assert.ok(
    Math.abs(Date.parse(remembered.expires_at) - Date.now() - 30 * 86400000) <
      1000,
  );
  assert.ok(
    Math.abs(Date.parse(ordinary.expires_at) - Date.now() - 12 * 3600000) <
      1000,
  );
  assert.notEqual(remembered.token, ordinary.token);
  assert.ok(remembered.token.length >= 40);
});
test("remember-device requires a valid session and logout revokes it", async () => {
  const { context, db, call, tables } = server();
  const invalid = await call("remember_device", {
    person: "瑞子",
    token: "untrusted-test-token-that-is-not-valid",
  });
  assert.equal(invalid.status, 401);
  assert.equal(tables.person_sessions.length, 0);
  const s = await context.issueSession(db, "chuanxi2026", "瑞子");
  const response = await call("remember_device", {
    person: "瑞子",
    token: s.token,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(Date.parse(data.expires_at) > Date.now() + 29 * 86400000);
  const wrongPerson = await call("validate", {
    person: "普子",
    token: s.token,
  });
  assert.equal(wrongPerson.status, 401);
  await call("logout", { person: "瑞子", token: s.token });
  const expired = await call("validate", { person: "瑞子", token: s.token });
  assert.equal(expired.status, 401);
});
