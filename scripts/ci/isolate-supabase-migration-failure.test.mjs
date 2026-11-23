import assert from "node:assert/strict";
import test from "node:test";

import { extractSafePostgresError, findFirstFailedPrefix } from "./isolate-supabase-migration-failure.mjs";

test("binary prefix isolation returns the exact first failing migration index", () => {
  for (const expected of [0, 1, 27, 498]) {
    const firstFailed = findFirstFailedPrefix(499, (prefixLength) => prefixLength <= expected);
    assert.equal(firstFailed, expected);
  }
});

test("binary prefix isolation returns no failure when every prefix succeeds", () => {
  assert.equal(findFirstFailedPrefix(499, () => true), null);
});

test("safe PostgreSQL attribution keeps only allowlisted type and position", () => {
  const result = extractSafePostgresError(
    'ERROR: invalid input syntax for type bigint: "private-rejected-value" SQL state: 22P02 Position: 187',
    "20261121000002",
  );

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "bigint",
    statementPosition: 187,
  });
  assert.equal(JSON.stringify(result).includes("private-rejected-value"), false);
});

test("unknown types and missing positions are omitted", () => {
  const result = extractSafePostgresError(
    'invalid input syntax for type secret_domain: "do-not-publish" SQLSTATE=22P02',
    null,
  );
  assert.deepEqual(result, {
    migrationVersion: null,
    sqlstate: "22P02",
    expectedType: "unavailable",
    statementPosition: null,
  });
  assert.equal(JSON.stringify(result).includes("do-not-publish"), false);
});

test("nested CLI JSON errors expose only safe PostgreSQL diagnostics", () => {
  const result = extractSafePostgresError(`2026-11-23T00:00:00Z ${JSON.stringify({
    error_severity: "ERROR",
    state_code: "22P02",
    detail: { message: 'invalid input syntax for type uuid: "private-identity-value"' },
    statement_position: 71,
  })}`, "20261121000002");

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "uuid",
    statementPosition: 71,
  });
  assert.equal(JSON.stringify(result).includes("private-identity-value"), false);
});

test("the parser skips ordinary JSON log rows and selects the structured error row", () => {
  const output = [
    JSON.stringify({ error_severity: "LOG", state_code: "00000", message: "connection authorized" }),
    JSON.stringify({ error_severity: "ERROR", state_code: "22P02", message: 'invalid input syntax for type bigint: "private-number"', statement_position: 19 }),
  ].join("\n");
  const result = extractSafePostgresError(output, "20261121000002");

  assert.deepEqual(result, {
    migrationVersion: "20261121000002",
    sqlstate: "22P02",
    expectedType: "bigint",
    statementPosition: 19,
  });
  assert.equal(JSON.stringify(result).includes("private-number"), false);
});
