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
  assertEphemeralSupabaseTestEnvironment,
  validateSqlContractMarkerPlacement,
} from "./run-supabase-sql-proof.mjs";
import { parseTerritorialRevisionNotice } from "../../e2e/territorial-legend-revision-concurrency.mjs";

test("inventory includes all current pgTAP, SQL contract and multi-session proof files", () => {
  const inventory = inventorySqlProofs();
  assert.equal(inventory.unregistered.length, 0);
  assert.deepEqual(inventory.pgtap, [
    "apps/web/supabase/tests/action-buddy-contract.pgtap.sql",
    "apps/web/supabase/tests/action-collection-context-reference-rpc.pgtap.sql",
    "apps/web/supabase/tests/action-collection-reference-averages.pgtap.sql",
    "apps/web/supabase/tests/action-field-roles-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/action-need-offers-contract.pgtap.sql",
    "apps/web/supabase/tests/action-needs-contract.pgtap.sql",
    "apps/web/supabase/tests/action-retention-and-statistical-versions.pgtap.sql",
    "apps/web/supabase/tests/action-retrospectives-contract.pgtap.sql",
    "apps/web/supabase/tests/action-rides-contract.pgtap.sql",
    "apps/web/supabase/tests/action-rides-transactions-contract.pgtap.sql",
    "apps/web/supabase/tests/action-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/action-statistical-public-views.pgtap.sql",
    "apps/web/supabase/tests/action-statistical-revocation-and-retention.pgtap.sql",
    "apps/web/supabase/tests/action-statistical-version-propagation.pgtap.sql",
    "apps/web/supabase/tests/association-action-announcement-retry.pgtap.sql",
    "apps/web/supabase/tests/association-action-review-formalities.pgtap.sql",
    "apps/web/supabase/tests/chat-message-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-digest-runs-contract.pgtap.sql",
    "apps/web/supabase/tests/community-event-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-helper-skills-contract.pgtap.sql",
    "apps/web/supabase/tests/community-subscriptions-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql",
    "apps/web/supabase/tests/gps-point-lifecycle-boundary.pgtap.sql",
    "apps/web/supabase/tests/newsletter-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/notifications-decision-boundary.pgtap.sql",
    "apps/web/supabase/tests/pedestrian-observation-cache-lease-atomicity.pgtap.sql",
    "apps/web/supabase/tests/pedestrian-risk-projection-pagination-contract.pgtap.sql",
    "apps/web/supabase/tests/public-impact-temporal-eligibility.pgtap.sql",
    "apps/web/supabase/tests/public-impact-waste-coverage.pgtap.sql",
    "apps/web/supabase/tests/quiz-progression-rpc-boundary.pgtap.sql",
    "apps/web/supabase/tests/scientific-projection-volume-lot-reconciliation.pgtap.sql",
    "apps/web/supabase/tests/spogomi-division-regulation-configuration.pgtap.sql",
    "apps/web/supabase/tests/spogomi-mapping-coherence.pgtap.sql",
    "apps/web/supabase/tests/territorial-legend-rewards-contract.pgtap.sql",
    "apps/web/supabase/tests/user-data-boundaries.pgtap.sql",
  ]);
  assert.equal(inventory.contracts.length, 10);
  assert.deepEqual(inventory.multisession, [
    "e2e/action-buddy-concurrency.mjs",
    "e2e/action-role-attestation-concurrency.mjs",
    "e2e/community-helper-skills-concurrency.mjs",
    "e2e/gamification-reconciliation-concurrency.mjs",
    "e2e/quiz-progression-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
    "e2e/security-02-two-sessions.mjs",
    "e2e/spogomi-concurrency.mjs",
    "e2e/territorial-legend-revision-concurrency.mjs",
  ]);
});

test("Knip declares the PostgreSQL multi-session scripts as explicit entrypoints", () => {
  const knipConfig = JSON.parse(readFileSync(new URL("../knip.json", import.meta.url), "utf8"));
  const entries = new Set(knipConfig.workspaces["."].entry);
  for (const entrypoint of [
    "e2e/community-helper-skills-concurrency.mjs",
    "e2e/gamification-reconciliation-concurrency.mjs",
    "e2e/quiz-progression-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
  ]) {
    assert.equal(entries.has(entrypoint), true, `missing Knip entrypoint: ${entrypoint}`);
  }
});

test("territorial revision proof uses explicit session barriers and the RPC contract", () => {
  const source = readFileSync(new URL("../../e2e/territorial-legend-revision-concurrency.mjs", import.meta.url), "utf8");
  assert.match(source, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/g);
  assert.match(source, /const oldRevisionResult = await runQuery\(readOldRevisionSql\)/);
  assert.match(source, /const freshResult = await runQuery\(freshSessionSql\)/);
  assert.match(source, /const staleResult = await runQuery\(staleSessionSql\(oldRevision\)\)/);
  assert.match(source, /TERRITORIAL_FRESH_RESULT=/);
  assert.match(source, /freshRpcResult\.status, "applied"/);
  assert.match(source, /freshRpcResult\.affectedUserIds\.includes\("legend-revision-fresh"\)/);
  assert.match(source, /TERRITORIAL_STALE_REJECTED=/);
  assert.doesNotMatch(source, /assert\.match\(output\(freshResult\), \/fresh-after-delete\//);
  assert.match(source, /'freshFingerprints'/);
  assert.match(source, /to_char\(public\.get_territorial_legend_fact_revision\(\), 'YYYY-MM-DD"T"HH24:MI:SS\.USOF'\)/);
  assert.match(source, /parseTerritorialRevisionNotice\(oldOutput\)/);
  assert.match(source, /'\$\{oldRevision\}'::timestamptz/);
  assert.doesNotMatch(source, /TERRITORIAL_OLD_REVISION=\(\[\^\\s\]\+\)/);
});

test("territorial revision parser preserves a complete PostgreSQL timestamp", () => {
  const revision = parseTerritorialRevisionNotice([
    "NOTICE: TERRITORIAL_OLD_REVISION=2026-11-06T14:29:51.123456+00:00",
  ].join("\n"));
  assert.equal(revision, "2026-11-06T14:29:51.123456+00:00");
});

test("territorial revision parser rejects truncation, malformed values and missing notices", () => {
  for (const output of [
    "NOTICE: TERRITORIAL_OLD_REVISION=2026-11-06",
    "NOTICE: TERRITORIAL_OLD_REVISION=2026-11-06T14:29:51.12345+00:00",
    "NOTICE: TERRITORIAL_OLD_REVISION=2026-11-06T14:29:51.123456",
    "NOTICE: TERRITORIAL_OLD_REVISION=not-a-timestamp",
    "NOTICE: another notice",
  ]) {
    assert.throws(() => parseTerritorialRevisionNotice(output));
  }
});

test("territorial pgTAP purges every current fixture before the 2025 campaign", () => {
  const source = readFileSync(new URL("../../apps/web/supabase/tests/territorial-legend-rewards-contract.pgtap.sql", import.meta.url), "utf8");
  assert.match(source, /select plan\(78\);/);
  const reactivation = source.indexOf("reactivation creates a new non-retroactive watermark");
  const historicalPurge = source.indexOf("-- Isolate the historical campaign");
  const historicalCampaign = source.indexOf("date '2025-07-05'");
  const proofPurge = source.indexOf("delete from public.territorial_legend_award_proofs", historicalPurge);
  const periodPurge = source.indexOf("delete from public.territorial_legend_hold_periods", proofPurge);
  const consentPeriodPurge = source.indexOf("where user_id = 'legend-consent-contract';", periodPurge);
  const consentPurge = source.indexOf("delete from public.territorial_legend_consents", historicalPurge);
  assert.ok(reactivation > -1 && historicalPurge > reactivation && historicalCampaign > historicalPurge);
  assert.ok(proofPurge > -1 && periodPurge > proofPurge);
  assert.ok(consentPeriodPurge > periodPurge && consentPeriodPurge < historicalCampaign);
  assert.ok(consentPurge > consentPeriodPurge && consentPurge < historicalCampaign);
  assert.match(source.slice(proofPurge, historicalCampaign), /where user_id like 'legend-contract-%';/g);
  assert.match(source.slice(periodPurge, historicalCampaign), /delete from public\.territorial_legend_hold_periods[\s\S]*where user_id = 'legend-consent-contract';/);
});

test("pedestrian publication revision proof uses the canonical table and replay-safe sequence floor", () => {
  const migration = readFileSync(new URL("../../apps/web/supabase/migrations/20261105000015_pedestrian_risk_projection_publication_revision.sql", import.meta.url), "utf8");
  const contract = readFileSync(new URL("../../apps/web/supabase/tests/pedestrian-risk-projection-pagination-contract.pgtap.sql", import.meta.url), "utf8");
  assert.match(migration, /greatest\(1, coalesce\(\(select max\(publication_revision\) from public\.pedestrian_risk_projection_versions\), 0\)\)/);
  assert.match(contract, /from public\.pedestrian_risk_projection_versions where id = '22222222-2222-4222-8222-222222222222'/);
  assert.doesNotMatch(contract, /get_active_pedestrian_risk_projection_versions/);
});

test("pedestrian lease failure validates expiry after locking and at mutation", () => {
  const migration = readFileSync(new URL("../../apps/web/supabase/migrations/20261106000002_pedestrian_observation_cache_lease_expiry_after_lock.sql", import.meta.url), "utf8");
  const contract = readFileSync(new URL("../../apps/web/supabase/tests/pedestrian-observation-cache-lease-atomicity.pgtap.sql", import.meta.url), "utf8");
  const firstLock = migration.indexOf("for v_event in");
  const firstLockEnd = migration.indexOf("end loop;", firstLock);
  const postLockClock = migration.indexOf("v_now := clock_timestamp();", firstLockEnd);
  assert.ok(firstLock > -1 && firstLockEnd > firstLock && postLockClock > firstLockEnd);
  assert.match(migration, /event\.lease_expires_at > clock_timestamp\(\);/);
  assert.match(migration, /invalidation lease changed during failure release/);
  assert.match(contract, /select plan\(24\);/);
  assert.match(contract, /one expired event rejects the complete failure batch/);
  assert.match(contract, /an expired batch leaves every event unreleased/);
  assert.match(contract, /failure release rejects duplicated event identifiers/);
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

test("destructive Supabase proofs require explicit local ephemeral authorization", () => {
  assert.throws(
    () => assertEphemeralSupabaseTestEnvironment({}),
    /explicit ephemeral authorization/,
  );
  assert.throws(
    () => assertEphemeralSupabaseTestEnvironment({
      CMM_SUPABASE_TEST_ENVIRONMENT: "ephemeral",
      CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION: "I_UNDERSTAND_EPHEMERAL_ONLY",
      SUPABASE_URL: "https://production.supabase.co",
    }),
    /refuse non-local/,
  );
  assert.equal(assertEphemeralSupabaseTestEnvironment({
    CMM_SUPABASE_TEST_ENVIRONMENT: "ephemeral",
    CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION: "I_UNDERSTAND_EPHEMERAL_ONLY",
    SUPABASE_URL: "http://127.0.0.1:54321",
  }), true);
});
