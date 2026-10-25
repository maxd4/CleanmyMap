import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractPlan,
  inventorySqlProofs,
  parsePgTapOutput,
  validateSqlContractMarkerPlacement,
} from "./run-supabase-sql-proof.mjs";

test("inventory includes all current pgTAP, SQL contract and multi-session proof files", () => {
  const inventory = inventorySqlProofs();
  assert.equal(inventory.unregistered.length, 0);
  assert.deepEqual(inventory.pgtap, [
    "apps/web/supabase/tests/action-field-roles-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/action-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/chat-message-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-event-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/gps-point-lifecycle-boundary.pgtap.sql",
    "apps/web/supabase/tests/newsletter-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/user-data-boundaries.pgtap.sql",
  ]);
  assert.equal(inventory.contracts.length, 9);
  assert.deepEqual(inventory.multisession, [
    "e2e/action-role-attestation-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
    "e2e/security-02-two-sessions.mjs",
    "e2e/spogomi-concurrency.mjs",
  ]);
});

test("pgTAP parser accepts an exact complete plan", () => {
  assert.equal(extractPlan("begin; select plan(2);"), 2);
  assert.deepEqual(parsePgTapOutput("ok 1 - first\nok 2 - second\n1..2\n", 2), {
    expectedPlan: 2,
    actualPlan: 2,
    passed: 2,
    failures: 0,
  });
});

test("pgTAP parser rejects missing, failing or incomplete assertions", () => {
  assert.throws(() => parsePgTapOutput("ok 1 - first\n1..2\n", 2), /incomplete/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\nnot ok 2 - second\n1..2\n", 2), /failing assertion/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\n1..1\n", 2), /plan mismatch/);
});

test("SQL completion markers cannot precede a later assertion", () => {
  assert.equal(validateSqlContractMarkerPlacement("raise exception 'failure';\nNOTICE_MARKER", "NOTICE_MARKER"), true);
  assert.throws(
    () => validateSqlContractMarkerPlacement("NOTICE_MARKER\nraise exception 'failure';", "NOTICE_MARKER"),
    /precedes a later assertion/,
  );
});
