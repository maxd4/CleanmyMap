import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  extractPlan,
  inventorySqlProofs,
  attestProofResult,
  main,
  parsePgTapOutput,
  reportMainRejection,
  runSupabaseSqlProof,
  validateSqlContractMarkerPlacement,
} from "./run-supabase-sql-proof.mjs";

test("inventory includes all current pgTAP, SQL contract and multi-session proof files", () => {
  const inventory = inventorySqlProofs();
  assert.equal(inventory.unregistered.length, 0);
  assert.deepEqual(inventory.pgtap, [
    "apps/web/supabase/tests/action-field-roles-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/action-need-offers-contract.pgtap.sql",
    "apps/web/supabase/tests/action-needs-contract.pgtap.sql",
    "apps/web/supabase/tests/action-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/association-action-announcement-retry.pgtap.sql",
    "apps/web/supabase/tests/association-action-review-formalities.pgtap.sql",
    "apps/web/supabase/tests/chat-message-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-event-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-subscriptions-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql",
    "apps/web/supabase/tests/gps-point-lifecycle-boundary.pgtap.sql",
    "apps/web/supabase/tests/newsletter-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/notifications-decision-boundary.pgtap.sql",
    "apps/web/supabase/tests/quiz-progression-rpc-boundary.pgtap.sql",
    "apps/web/supabase/tests/user-data-boundaries.pgtap.sql",
  ]);
  assert.equal(inventory.contracts.length, 9);
  assert.deepEqual(inventory.multisession, [
    "e2e/action-role-attestation-concurrency.mjs",
    "e2e/gamification-reconciliation-concurrency.mjs",
    "e2e/quiz-progression-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
    "e2e/security-02-two-sessions.mjs",
    "e2e/spogomi-concurrency.mjs",
  ]);
});

test("Knip declares the PostgreSQL multi-session scripts as explicit entrypoints", () => {
  const knipConfig = JSON.parse(readFileSync(new URL("../knip.json", import.meta.url), "utf8"));
  const entries = new Set(knipConfig.workspaces["."].entry);
  for (const entrypoint of [
    "e2e/gamification-reconciliation-concurrency.mjs",
    "e2e/quiz-progression-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
  ]) {
    assert.equal(entries.has(entrypoint), true, `missing Knip entrypoint: ${entrypoint}`);
  }
});

test("pgTAP parser accepts an exact complete plan", () => {
  assert.equal(extractPlan("begin; select plan(2);"), 2);
  assert.deepEqual(parsePgTapOutput("ok 1 - first\nok 2 - second\n1..2\n", 2), {
    expectedPlan: 2,
    actualPlan: 2,
    planned: 2,
    executed: 2,
    passed: 2,
    failures: 0,
    verificationMode: "tap-detailed",
  });
});

test("pgTAP parser accepts an initial plan, ordinary words and diagnostics", () => {
  assert.deepEqual(parsePgTapOutput([
    "1..2",
    "# diagnostic: skip and todo are ordinary words here",
    "ok 1 - skip is part of the description",
    "ok 2 - todo is part of the description",
  ].join("\n"), 2), {
    expectedPlan: 2,
    actualPlan: 2,
    planned: 2,
    executed: 2,
    passed: 2,
    failures: 0,
    verificationMode: "tap-detailed",
  });
});

test("pgTAP parser accepts the real pg_prove summary and preserves its verification mode", () => {
  const output = [
    "/tmp/supabase/tests/example.pgtap.sql .. ok",
    "All tests successful.",
    "Files=1, Tests=16, 0 Failed, 0 Ignored, 0 Todo, 0 Skipped, 0% ok",
    "Result: PASS",
  ].join("\n");

  assert.deepEqual(parsePgTapOutput(output, 16), {
    expectedPlan: 16,
    actualPlan: null,
    planned: 16,
    executed: 16,
    passed: 16,
    failures: 0,
    files: 1,
    tests: 16,
    failed: 0,
    ignored: 0,
    todo: 0,
    skipped: 0,
    verificationMode: "pg-prove-summary",
  });
});

test("pgTAP parser cross-checks detailed TAP with a present pg_prove summary", () => {
  const output = [
    "ok 1 - first",
    "ok 2 - second",
    "1..2",
    "Files=1, Tests=2, 0 Failed",
    "Result: PASS",
  ].join("\n");

  assert.deepEqual(parsePgTapOutput(output, 2), {
    expectedPlan: 2,
    actualPlan: 2,
    planned: 2,
    executed: 2,
    passed: 2,
    failures: 0,
    verificationMode: "tap-detailed",
  });
});

test("pgTAP parser rejects missing, failing, incomplete or ambiguous proof", () => {
  assert.throws(() => parsePgTapOutput("ok 1 - first\n1..2\n", 2), /incomplete/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\nok 1 - duplicate\n1..2\n", 2), /numbering is incomplete or inconsistent/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\nok 3 - outside plan\n1..2\n", 2), /numbering is incomplete or inconsistent/);
  assert.throws(() => parsePgTapOutput("ok 2 - second\nok 3 - outside plan\n1..2\n", 2), /numbering is incomplete or inconsistent/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\nnot ok 2 - second\n1..2\n", 2), /failing assertion/);
  assert.throws(() => parsePgTapOutput("ok 1 - first\n1..1\n", 2), /plan mismatch/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2\n", 2), /summary is incomplete/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2\nResult: FAIL\n", 2), /Result: FAIL/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 1 Failed\nResult: PASS\n", 2), /failed tests/);
  assert.throws(() => parsePgTapOutput("Files=2, Tests=2\nResult: PASS\n", 2), /one file/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=1\nResult: PASS\n", 2), /test count mismatch/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2\nResult: PASS\nResult: PASS\n", 2), /ambiguous/);
  assert.throws(() => parsePgTapOutput("All tests successful.\n", 2), /neither/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\n", 2), /incomplete/);
  assert.throws(() => parsePgTapOutput("1..2\nFiles=1, Tests=2\nResult: PASS\n", 2), /incomplete TAP/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2\nResult: PASS\nResult: FAIL\n", 2), /ambiguous/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2\nResult: PASS\n", null), /no explicit plan/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 0 Failed, 0 Ignored, 1 Todo, 0 Skipped\nResult: PASS\n", 2), /does not prove/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 0 Failed, 1 Ignored, 0 Todo, 0 Skipped\nResult: PASS\n", 2), /does not prove/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 0 Failed, 0 Ignored, 0 Todo, 2 Skipped\nResult: PASS\n", 2), /does not prove/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 0 Failed, 0 Ignored, 0 Todo, 0 Skipped\nResult: PASS\nResult: PASS\n", 2), /ambiguous/);
  assert.throws(() => parsePgTapOutput("Files=1, Tests=2, 0 Failed, 1 Failed\nResult: PASS\n", 2), /ambiguous/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\nok 2 - second\n1..2\n", 2), /multiple plans/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\n1..3\nok 2 - second\n", 2), /multiple plans/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first # SKIP environment missing\nok 2 - second\n", 2), /SKIP assertion/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first # tOdO known defect\nok 2 - second\n", 2), /TODO assertion/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first # sKiP environment missing\nok 2 - second\n", 2), /SKIP assertion/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\nBail out! Connection lost\n", 2), /Bail out/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\nok 2 - second\nBail out! Connection lost\n", 2), /Bail out/);
  assert.throws(() => parsePgTapOutput("1..2\nok 1 - first\nok 2 - second\nBail out! Connection lost\nFiles=1, Tests=2, 0 Failed\nResult: PASS\n", 2), /Bail out/);
});

test("pgTAP parser rejects Bail out interruptions regardless of case", () => {
  for (const marker of ["Bail out!", "BAIL OUT!", "bail out!", "bAiL oUt!"]) {
    const output = [
      "1..2",
      "ok 1 - first",
      "ok 2 - second",
      `${marker} Connection lost`,
      "Files=1, Tests=2, 0 Failed, 0 Ignored, 0 Todo, 0 Skipped",
      "Result: PASS",
    ].join("\n");
    assert.throws(() => parsePgTapOutput(output, 2), /Bail out/);
  }
});

test("pgTAP parser keeps an embedded ordinary phrase distinct from a bailout marker", () => {
  assert.deepEqual(parsePgTapOutput(
    "1..1\nok 1 - documentation mentions Bail out! as ordinary text\n",
    1,
  ), {
    expectedPlan: 1,
    actualPlan: 1,
    planned: 1,
    executed: 1,
    passed: 1,
    failures: 0,
    verificationMode: "tap-detailed",
  });
});

test("pgTAP parser rejects detailed and summary divergence", () => {
  const output = [
    "ok 1 - first",
    "ok 2 - second",
    "1..2",
    "Files=1, Tests=3, 0 Failed, 0 Ignored, 0 Todo, 0 Skipped",
    "Result: PASS",
  ].join("\n");

  assert.throws(() => parsePgTapOutput(output, 2), /test count mismatch/);
});

test("proof attestation maps verified and failed executions to explicit statuses", () => {
  const passingRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  attestProofResult(
    passingRecord,
    { code: 0, output: "Files=1, Tests=2\nResult: PASS\n" },
    (output) => parsePgTapOutput(output, 2),
  );
  assert.equal(passingRecord.status, "INTEGRATION_PROOF");
  assert.equal(passingRecord.outcome, "PASS");
  assert.equal(passingRecord.details.verificationMode, "pg-prove-summary");

  const failedRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  assert.throws(
    () => attestProofResult(failedRecord, { code: 1, output: "Result: FAIL" }, () => ({ unreachable: true })),
    /command exited with 1/,
  );
  assert.equal(failedRecord.status, "INTEGRATION_PROOF");
  assert.equal(failedRecord.outcome, "FAIL");

  const incompleteRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  assert.throws(
    () => attestProofResult(incompleteRecord, { code: 0, output: "Files=1, Tests=1\nResult: PASS" }, (output) => parsePgTapOutput(output, 2)),
    /test count mismatch/,
  );
  assert.equal(incompleteRecord.status, "INTEGRATION_PROOF");
  assert.equal(incompleteRecord.outcome, "FAIL");
});

test("rejected proof reaches the runner failure exit code", async () => {
  const rejectedRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  assert.throws(
    () => attestProofResult(
      rejectedRecord,
      { code: 0, output: "Files=1, Tests=2, 0 Failed, 0 Ignored, 1 Skipped\nResult: PASS\n" },
      (output) => parsePgTapOutput(output, 2),
    ),
    (error) => /does not prove/.test(error.message),
  );
  assert.equal(rejectedRecord.status, "INTEGRATION_PROOF");
  assert.equal(rejectedRecord.outcome, "FAIL");

  const bailedRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  let bailError;
  assert.throws(
    () => attestProofResult(
      bailedRecord,
      { code: 0, output: "1..2\nok 1 - first\nok 2 - second\nBail out! Connection lost\n" },
      (output) => parsePgTapOutput(output, 2),
    ),
    (error) => {
      bailError = error;
      return /Bail out/.test(error.message);
    },
  );
  assert.equal(bailedRecord.status, "INTEGRATION_PROOF");
  assert.equal(bailedRecord.outcome, "FAIL");
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    assert.equal(await main(async () => { throw bailError; }), 1);
  } finally {
    console.error = originalConsoleError;
  }
});

test("main rejection returns failure without logging rejected secret details", () => {
  const originalConsoleError = console.error;
  const diagnostics = [];
  console.error = (...args) => diagnostics.push(args.join(" "));
  try {
    assert.equal(reportMainRejection(new Error("token=super-secret-value")), 1);
  } finally {
    console.error = originalConsoleError;
  }
  assert.match(diagnostics.join("\n"), /SUPABASE_SQL_EVIDENCE: FAIL main rejected/);
  assert.doesNotMatch(diagnostics.join("\n"), /super-secret-value/);
});

test("process spawn rejections reach the report as an unexecuted database proof", async () => {
  let report;
  await assert.rejects(
    () => runSupabaseSqlProof({
      commandRunner: async () => { throw new Error("spawn failed"); },
      writeReportImpl: (nextReport) => { report = nextReport; },
    }),
    /spawn failed/,
  );
  assert.equal(report.outcome, "FAIL");
  const failedRecord = report.records.find((record) => record.category === "PGTAP");
  assert.equal(failedRecord.status, "DB_SEMANTICS_NOT_EXECUTED");
  assert.equal(failedRecord.outcome, "FAIL");
  assert.match(failedRecord.reason, /spawn failed/);
  assert.ok(report.records.filter((record) => record.status === "NOT_RUN").every((record) => /not reached after failure/.test(record.reason)));
});

test("SQL completion markers cannot precede a later assertion", () => {
  assert.equal(validateSqlContractMarkerPlacement("raise exception 'failure';\nNOTICE_MARKER", "NOTICE_MARKER"), true);
  assert.throws(
    () => validateSqlContractMarkerPlacement("NOTICE_MARKER\nraise exception 'failure';", "NOTICE_MARKER"),
    /precedes a later assertion/,
  );
});
