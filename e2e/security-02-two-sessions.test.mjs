import assert from "node:assert/strict";
import { test } from "node:test";
import { runSecurity02Contract } from "./security-02-two-sessions.mjs";

function fakeQuery() {
  const calls = [];
  const query = async (sql) => {
    calls.push(sql);
    return { stdout: "", stderr: "" };
  };
  return { calls, query };
}

test("SECURITY-02 uses postgres for fixtures and cleanup, never service_role", async () => {
  const { calls, query } = fakeQuery();

  await runSecurity02Contract(query);

  assert.match(calls[0], /has_table_privilege\('service_role'/);
  assert.match(calls[1], /set local role postgres/);
  assert.doesNotMatch(calls[1], /set local role service_role/);
  assert.match(calls.at(-1), /set local role postgres/);
  assert.doesNotMatch(calls.at(-1), /set local role service_role/);
});

test("SECURITY-02 attempts cleanup and absence verification after a session error", async () => {
  const { calls, query: baseQuery } = fakeQuery();
  let sessionQueryCount = 0;
  const query = async (sql) => {
    if (sql.includes("begin;\nset local role authenticated;")) {
      sessionQueryCount += 1;
      if (sessionQueryCount === 1) throw new Error("intentional session failure");
    }
    return baseQuery(sql);
  };

  await assert.rejects(
    runSecurity02Contract(query),
    /SECURITY-02 two-session PostgreSQL contract failed.*intentional session failure/s,
  );
  assert.equal(calls.filter((sql) => sql.includes("delete from public.profiles")).length, 1);
  assert.match(calls.at(-1), /fixture cleanup left profile rows behind/);
});

test("SECURITY-02 fails when cleanup fails and does not report success", async () => {
  const { calls, query: baseQuery } = fakeQuery();
  const query = async (sql) => {
    if (sql.includes("delete from public.profiles")) throw new Error("intentional cleanup failure");
    return baseQuery(sql);
  };

  await assert.rejects(
    runSecurity02Contract(query),
    /SECURITY-02 two-session PostgreSQL contract failed.*intentional cleanup failure/s,
  );
  assert.match(calls.at(-1), /fixture cleanup left profile rows behind/);
});

test("SECURITY-02 intentional failure still performs cleanup", async () => {
  const { calls, query } = fakeQuery();

  await assert.rejects(
    runSecurity02Contract(query, { forceFailure: true }),
    /intentional assertion failure for cleanup validation/,
  );
  assert.equal(calls.filter((sql) => sql.includes("delete from public.profiles")).length, 1);
  assert.match(calls.at(-1), /fixture cleanup left profile rows behind/);
});
