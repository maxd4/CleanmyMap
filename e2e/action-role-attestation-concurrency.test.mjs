import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./action-role-attestation-concurrency.mjs", import.meta.url), "utf8");

test("role attestation concurrency proof uses two local PostgreSQL sessions and cleanup", () => {
  assert.match(source, /\["supabase", "db", "query", "--workdir", "apps\/web", "--local"/);
  assert.match(source, /for update/);
  assert.match(source, /pg_sleep\(2\)/);
  assert.match(source, /action_role_attestation_correction_reason_required/);
  assert.match(source, /finally \{\s*await runQuery\(cleanupSql\);/s);
});
