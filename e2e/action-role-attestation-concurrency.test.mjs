import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./action-role-attestation-concurrency.mjs", import.meta.url), "utf8");
const correctionSql = readFileSync(
  new URL("../apps/web/supabase/tests/action-role-attestation-correction.sql", import.meta.url),
  "utf8",
);

test("role attestation concurrency proof uses two local PostgreSQL sessions and cleanup", () => {
  assert.match(source, /\["supabase", "db", "query", "--workdir", "apps\/web", "--local"/);
  assert.match(source, /for update/);
  assert.match(source, /pg_stat_activity/);
  assert.match(source, /ROLE_ATTESTATION_LOCK_HELD/);
  assert.match(source, /ROLE_ATTESTATION_CORRECTION_WAITING/);
  assert.match(source, /wait_event_type = 'Lock'/);
  assert.match(source, /AbortController/);
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /CONCURRENCY_SYNC_TIMEOUT_MS/);
  assert.match(source, /action_role_attestation_correction_reason_required/);
  assert.match(source, /correctionReviewerId/);
  assert.match(source, /'confirm', '\$\{correctionReviewerId\}', null, false/);
  assert.match(source, /verifyUnchangedSql/);
  assert.doesNotMatch(source, /setTimeout\(resolve, 150\)/);
  const serviceRoleTransactions = source.match(/begin;\nset local role service_role;[\s\S]*?commit;/g) ?? [];
  assert.equal(serviceRoleTransactions.length, 3);
  for (const transaction of serviceRoleTransactions) {
    assert.match(transaction, /set_config\('request\.jwt\.claims', '\{"role":"service_role"\}', true\)/);
    assert.match(transaction, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/);
  }
  assert.match(source, /finally \{[\s\S]*?Promise\.allSettled[\s\S]*?await runQuery\(cleanupSql\);/s);
});

test("role attestation SQL contract distinguishes PostgreSQL role from JWT role claim", () => {
  const serviceRoleTransactions = correctionSql.match(/begin;\nset local role service_role;[\s\S]*?(?:commit|rollback);/g) ?? [];
  assert.equal(serviceRoleTransactions.length, 4);
  assert.match(correctionSql, /set_config\('request\.jwt\.claim\.role', 'authenticated', true\)/);
  assert.match(correctionSql, /action_role_attestation_forbidden/);
  for (const transaction of serviceRoleTransactions.slice(1)) {
    assert.match(transaction, /set_config\('request\.jwt\.claims', '\{"role":"service_role"\}', true\)/);
    assert.match(transaction, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/);
  }
});
