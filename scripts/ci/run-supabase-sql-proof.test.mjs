import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  extractPlan,
  inventorySqlProofs,
  attestProofResult,
  main,
  parsePgTapOutput,
  reportMainRejection,
  runSupabaseSqlProof,
  runCommand,
  assertEphemeralSupabaseTestEnvironment,
  captureProcessText,
  classifyProofFailure,
  sanitizeProofFailureExcerpt,
  sanitizePublicEvidenceText,
  supabaseNetworkArgs,
  pgtapCliPath,
  prioritizePaths,
  validateSqlContractMarkerPlacement,
} from "./run-supabase-sql-proof.mjs";
import { classifyDbResetFailure } from "./supabase-sql-proof-lifecycle.mjs";
import { parseTerritorialRevisionNotice } from "../../e2e/territorial-legend-revision-concurrency.mjs";

const PG_TAP_ASSERTION = /^\s*select\s+(?:ok|is|throws_ok|lives_ok|has_table|has_index|has_column|col_not_null|has_function_privilege|has_table_privilege)\s*\(/gim;

function assertPgTapPlanMatchesAssertions(sql, label) {
  const plans = [...sql.matchAll(/^\s*select\s+plan\s*\(([^)]*)\)\s*;\s*$/gim)];
  assert.equal(plans.length, 1, `${label}: expected exactly one valid plan(n) declaration`);

  const rawPlan = plans[0][1].trim();
  assert.match(rawPlan, /^[1-9]\d*$/, `${label}: plan(n) must be a positive integer`);
  const plan = Number(rawPlan);
  assert.ok(Number.isSafeInteger(plan), `${label}: plan(n) must be a safe integer`);

  const assertions = sql.match(PG_TAP_ASSERTION) ?? [];
  assert.equal(plan, assertions.length, `${label}: plan(n) must equal the declared SQL assertion count`);
}

test("inventory includes all current pgTAP, SQL contract and multi-session proof files", () => {
  const inventory = inventorySqlProofs();
  assert.equal(inventory.unregistered.length, 0);
  assert.deepEqual(inventory.pgtap, [
    "apps/web/supabase/tests/action-accessibility-support.pgtap.sql",
    "apps/web/supabase/tests/action-attendance-claims-visibility.pgtap.sql",
    "apps/web/supabase/tests/action-attendance-explicit-reactivation.pgtap.sql",
    "apps/web/supabase/tests/action-attendance-registry.pgtap.sql",
    "apps/web/supabase/tests/action-attendance-retention.pgtap.sql",
    "apps/web/supabase/tests/action-attendance-teams.pgtap.sql",
    "apps/web/supabase/tests/action-buddy-contract.pgtap.sql",
    "apps/web/supabase/tests/action-collection-context-reference-rpc.pgtap.sql",
    "apps/web/supabase/tests/action-collection-integrity.pgtap.sql",
    "apps/web/supabase/tests/action-collection-reference-averages.pgtap.sql",
    "apps/web/supabase/tests/action-event-timezones-integrity.pgtap.sql",
    "apps/web/supabase/tests/action-field-roles-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/action-form-editors.pgtap.sql",
    "apps/web/supabase/tests/action-media-route-reference.pgtap.sql",
    "apps/web/supabase/tests/action-need-offers-contract.pgtap.sql",
    "apps/web/supabase/tests/action-needs-contract.pgtap.sql",
    "apps/web/supabase/tests/action-organizer-types.pgtap.sql",
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
    "apps/web/supabase/tests/brigade-verte-contract.pgtap.sql",
    "apps/web/supabase/tests/chat-message-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-digest-runs-contract.pgtap.sql",
    "apps/web/supabase/tests/community-event-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/community-helper-skills-contract.pgtap.sql",
    "apps/web/supabase/tests/community-subscriptions-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql",
    "apps/web/supabase/tests/gamification-progression-grants.pgtap.sql",
    "apps/web/supabase/tests/gps-point-lifecycle-boundary.pgtap.sql",
    "apps/web/supabase/tests/newsletter-server-boundary.pgtap.sql",
    "apps/web/supabase/tests/notifications-decision-boundary.pgtap.sql",
    "apps/web/supabase/tests/pedestrian-observation-cache-lease-atomicity.pgtap.sql",
    "apps/web/supabase/tests/pedestrian-risk-projection-pagination-contract.pgtap.sql",
    "apps/web/supabase/tests/personal-ai-declarations-rls.pgtap.sql",
    "apps/web/supabase/tests/public-action-map-reconstruction-projection.pgtap.sql",
    "apps/web/supabase/tests/public-impact-temporal-eligibility.pgtap.sql",
    "apps/web/supabase/tests/public-impact-waste-coverage.pgtap.sql",
    "apps/web/supabase/tests/quiz-progression-rpc-boundary.pgtap.sql",
    "apps/web/supabase/tests/scientific-projection-volume-lot-reconciliation.pgtap.sql",
    "apps/web/supabase/tests/spogomi-division-regulation-configuration.pgtap.sql",
    "apps/web/supabase/tests/spogomi-mapping-coherence.pgtap.sql",
    "apps/web/supabase/tests/spogomi-volunteer-help-proposals.pgtap.sql",
    "apps/web/supabase/tests/territorial-legend-rewards-contract.pgtap.sql",
    "apps/web/supabase/tests/user-data-boundaries.pgtap.sql",
  ]);
  assert.equal(inventory.contracts.length, 11);
  assert.equal(inventory.contracts.includes("apps/web/supabase/tests/spogomi-registration-quiz.sql"), true);
  assert.deepEqual(inventory.multisession, [
    "e2e/action-attendance-registry-concurrency.mjs",
    "e2e/action-attendance-teams-concurrency.mjs",
    "e2e/action-buddy-concurrency.mjs",
    "e2e/action-collection-concurrency.mjs",
    "e2e/action-media-route-reference-concurrency.mjs",
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

test("personal AI declarations pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/personal-ai-declarations-rls.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "personal AI declarations");
});

test("action accessibility support pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-accessibility-support.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "action accessibility support");
});

test("action attendance registry pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-attendance-registry.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "action attendance registry");
});

test("action attendance explicit reactivation pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-attendance-explicit-reactivation.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "action attendance explicit reactivation");
});

test("action attendance retention pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-attendance-retention.pgtap.sql", import.meta.url);
  assertPgTapPlanMatchesAssertions(readFileSync(path, "utf8"), "action attendance retention");
});

test("attendance claims and route-reference pgTAP plans match their assertions", () => {
  assertPgTapPlanMatchesAssertions(readFileSync(new URL("../../apps/web/supabase/tests/action-attendance-claims-visibility.pgtap.sql", import.meta.url), "utf8"), "attendance claims visibility");
  assertPgTapPlanMatchesAssertions(readFileSync(new URL("../../apps/web/supabase/tests/action-media-route-reference.pgtap.sql", import.meta.url), "utf8"), "route-reference media");
});

test("attendance and action editor pgTAP fixtures provide the service role JWT claim", () => {
  for (const file of [
    "action-attendance-claims-visibility.pgtap.sql",
    "action-attendance-explicit-reactivation.pgtap.sql",
    "action-attendance-registry.pgtap.sql",
    "action-attendance-teams.pgtap.sql",
    "action-form-editors.pgtap.sql",
    "action-media-route-reference.pgtap.sql",
  ]) {
    const sql = readFileSync(new URL(`../../apps/web/supabase/tests/${file}`, import.meta.url), "utf8");
    assert.match(sql, /request\.jwt\.claims'.*\"role\":\"service_role\"/s, `${file} must set the service JWT role claim`);
    assert.match(sql, /request\.jwt\.claim\.role', 'service_role'/, `${file} must set the service JWT role setting`);
  }
});

test("action attendance teams pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-attendance-teams.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "action attendance teams");
});

test("action organizer types pgTAP plan matches its assertion count", () => {
  const path = new URL("../../apps/web/supabase/tests/action-organizer-types.pgtap.sql", import.meta.url);
  const sql = readFileSync(path, "utf8");
  assertPgTapPlanMatchesAssertions(sql, "action organizer types");
});

test("pgTAP assertion plan validation accepts a larger coherent plan and rejects a mismatch", () => {
  const largerCoherentProof = [
    "begin;",
    "select plan(3);",
    "select ok(true, 'first assertion');",
    "select is(1, 1, 'second assertion');",
    "select lives_ok('select 1', 'third assertion');",
    "rollback;",
  ].join("\n");
  assert.doesNotThrow(() => assertPgTapPlanMatchesAssertions(largerCoherentProof, "synthetic proof"));

  const mismatchedProof = largerCoherentProof.replace("plan(3)", "plan(4)");
  assert.throws(
    () => assertPgTapPlanMatchesAssertions(mismatchedProof, "synthetic proof"),
    /plan\(n\) must equal the declared SQL assertion count/,
  );
});

test("Knip declares the PostgreSQL multi-session scripts as explicit entrypoints", () => {
  const knipConfig = JSON.parse(readFileSync(new URL("../knip.json", import.meta.url), "utf8"));
  const entries = new Set(knipConfig.workspaces["."].entry);
  for (const entrypoint of [
    "e2e/action-media-route-reference-concurrency.mjs",
    "e2e/action-collection-concurrency.mjs",
    "e2e/action-attendance-teams-concurrency.mjs",
    "e2e/community-helper-skills-concurrency.mjs",
    "e2e/gamification-reconciliation-concurrency.mjs",
    "e2e/quiz-progression-concurrency.mjs",
    "e2e/reports-postgres-concurrency.mjs",
  ]) {
    assert.equal(entries.has(entrypoint), true, `missing Knip entrypoint: ${entrypoint}`);
  }
});

test("route-reference concurrency proof exercises the purpose-specific advisory quota lock", () => {
  const source = readFileSync(new URL("../../e2e/action-media-route-reference-concurrency.mjs", import.meta.url), "utf8");
  assert.match(source, /pg_advisory_lock\(\$\{ownKey\}\)/);
  assert.match(source, /ROUTE_REFERENCE_QUOTA_RESULT=accepted/);
  assert.match(source, /ROUTE_REFERENCE_QUOTA_RESULT=denied/);
  assert.match(source, /purpose = 'route_reference'/);
  assert.match(source, /resolveLocalEphemeralDbUrl/);
});

test("attendance team concurrency proof uses scoped fixtures and two-session serialization", () => {
  const source = readFileSync(new URL("../../e2e/action-attendance-teams-concurrency.mjs", import.meta.url), "utf8");
  assert.match(source, /attendance-teams-writer-a/);
  assert.match(source, /attendance-teams-writer-b/);
  assert.match(source, /waitForActivity/);
  assert.match(source, /40001\|revision_conflict/);
  assert.match(source, /created_by_clerk_id = 'attendance-teams-setup'/);
});

test("collection concurrency proof uses service-role claims and scoped cleanup", () => {
  const source = readFileSync(new URL("../../e2e/action-collection-concurrency.mjs", import.meta.url), "utf8");
  assert.match(source, /collection-concurrency-cleanup/);
  assert.match(source, /collection-concurrency-a/);
  assert.match(source, /collection-concurrency-b/);
  assert.match(source, /concurrentFailure\.message/);
  assert.match(source, /delete from public\.action_participants where id in \('\$\{firstId\}'::uuid, '\$\{secondId\}'::uuid\)/);
  assert.match(source, /created_by_clerk_id = 'collection-concurrency-setup'/);
});

test("territorial revision proof uses explicit session barriers and the RPC contract", () => {
  const source = readFileSync(new URL("../../e2e/territorial-legend-revision-concurrency.mjs", import.meta.url), "utf8");
  assert.match(source, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/g);
  assert.match(source, /const oldRevisionResult = await runQuery\(readOldRevisionSql, "read-old-revision"\)/);
  assert.match(source, /const freshResult = await runQuery\(freshSessionSql, "fresh-publication"\)/);
  assert.match(source, /const staleResult = await runQuery\(staleSessionSql\(oldRevision\), "stale-publication"\)/);
  assert.match(source, /TERRITORIAL_PHASE=\$\{phase\}/);
  assert.match(source, /TERRITORIAL_PHASE=parse-old-revision ERROR=/);
  assert.match(source, /TERRITORIAL_FRESH_RESULT=/);
  assert.match(source, /freshRpcResult\.status, "applied"/);
  assert.match(source, /freshRpcResult\.affectedUserIds\.includes\("legend-revision-fresh"\)/);
  assert.match(source, /TERRITORIAL_STALE_REJECTED=/);
  assert.doesNotMatch(source, /assert\.match\(output\(freshResult\), \/fresh-after-delete\//);
  assert.match(source, /'freshFingerprints'/);
  assert.match(source, /to_char\(public\.get_territorial_legend_fact_revision\(\) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS\.US'\) \|\| '\+00:00'/);
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
  assert.match(source, /select plan\(81\);/);
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
    () => attestProofResult(failedRecord, { code: 1, output: "ERROR: permission denied\nResult: FAIL" }, () => ({ unreachable: true })),
    /command exited with 1; category=PRIVILEGE_ERROR; origin=POSTGRESQL; diagnostic=.*permission denied/,
  );
  assert.equal(failedRecord.status, "INTEGRATION_PROOF");
  assert.equal(failedRecord.outcome, "FAIL");
  assert.equal(failedRecord.failure.category, "PRIVILEGE_ERROR");
  assert.equal("sqlLine" in failedRecord, false);

  const incompleteRecord = { path: "example.pgtap.sql", status: "NOT_RUN", outcome: "NOT_RUN" };
  assert.throws(
    () => attestProofResult(incompleteRecord, { code: 0, output: "Files=1, Tests=1\nResult: PASS" }, (output) => parsePgTapOutput(output, 2)),
    /test count mismatch/,
  );
  assert.equal(incompleteRecord.status, "INTEGRATION_PROOF");
  assert.equal(incompleteRecord.outcome, "FAIL");
});

test("proof diagnostics classify only observed causes and ignore ambiguous SQL line numbers", () => {
  assert.deepEqual(classifyProofFailure({ output: "ERROR: permission denied\nLINE 2: SELECT plan(3);" }), {
    category: "PRIVILEGE_ERROR",
    origin: "POSTGRESQL",
    sqlstate: null,
  });
  assert.deepEqual(classifyProofFailure({ output: "ERROR: invalid input\nSQLSTATE 22P02\nLINE 2: SELECT plan(3);" }), {
    category: "UNCAUGHT_SQL_ERROR",
    origin: "POSTGRESQL",
    sqlstate: "22P02",
  });
  assert.deepEqual(classifyProofFailure({ output: "not ok 4 - expected participant" }), {
    category: "ASSERTION_FAILED",
    origin: "PGTAP_ASSERTION",
    sqlstate: null,
  });
  assert.deepEqual(classifyProofFailure({ timedOut: true, signal: "SIGTERM" }), {
    category: "PROCESS_INTERRUPTED",
    origin: "PROCESS",
    sqlstate: null,
  });
  assert.equal(captureProcessText("abc", "defgh", 5), "abcde");
  assert.ok(Buffer.byteLength(captureProcessText("", "é", 1), "utf8") <= 1);
});

test("subprocess timeout terminates the child and caps private log capture", async () => {
  const timeoutLog = `test-timeout-${process.pid}`;
  const outputLog = `test-output-${process.pid}`;
  const logRoot = resolve("artifacts/ci/supabase-sql");
  try {
    const timedOut = await runCommand(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], { logName: timeoutLog, env: process.env, timeoutMs: 100 });
    assert.equal(timedOut.timedOut, true);
    const bounded = await runCommand(process.execPath, ["-e", "process.stdout.write('x'.repeat(2 * 1024 * 1024))"], { logName: outputLog, env: process.env, timeoutMs: 5000 });
    assert.equal(bounded.outputTruncated, true);
    assert.ok(Buffer.byteLength(bounded.stdout, "utf8") <= 1024 * 1024);
  } finally {
    rmSync(resolve(logRoot, `${timeoutLog}.log`), { force: true });
    rmSync(resolve(logRoot, `${outputLog}.log`), { force: true });
  }
});

test("canonical reset diagnostics classify only explicit phase evidence", () => {
  assert.deepEqual(classifyDbResetFailure("Applying migration 20261123000005\nERROR: invalid input SQLSTATE 22P02", 1), {
    category: "MIGRATION_FAILURE", origin: "MIGRATION_REPLAY", sqlstate: "22P02", migrationId: "20261123000005", code: 1,
  });
  assert.deepEqual(classifyDbResetFailure("Seeding data from apps/web/supabase/seed.sql\nERROR: duplicate SQLSTATE 23505", 1), {
    category: "SEED_FAILURE", origin: "SEED", sqlstate: "23505", migrationId: null, code: 1,
  });
  assert.deepEqual(classifyDbResetFailure("connection refused SQLSTATE 08006", 1), {
    category: "INFRASTRUCTURE_FAILURE", origin: "INFRASTRUCTURE", sqlstate: "08006", migrationId: null, code: 1,
  });
  const ambiguous = classifyDbResetFailure("Applying migration 20261123000005\nApplying migration 20261123000006\nERROR: invalid input SQLSTATE 22P02", 1);
  assert.deepEqual(ambiguous, {
    category: "MIGRATION_FAILURE", origin: "MIGRATION_REPLAY", sqlstate: "22P02", migrationId: null, code: 1,
  });
  assert.equal(ambiguous.origin, "MIGRATION_REPLAY");
  assert.equal(ambiguous.migrationId, null);
  assert.equal("output" in ambiguous, false);
  const phaseMismatch = classifyDbResetFailure("SQLSTATE 22P02\nSeeding data from seed.sql\nERROR: details unavailable", 1);
  assert.equal(phaseMismatch.category, "RESET_FAILURE_UNCLASSIFIED");
  assert.equal(phaseMismatch.origin, "UNPROVEN");
});

test("proof failure excerpts are bounded and redact sensitive values", () => {
  const excerpt = sanitizeProofFailureExcerpt([
    "NOTICE: an ordinary non-diagnostic line",
    "ERROR: password=super-secret-value at /home/runner/work/project",
    "not ok 4 - assertion failed for 0123456789abcdef0123456789abcdef",
    "Result: FAIL",
  ].join("\n"));
  assert.match(excerpt, /ERROR/);
  assert.match(excerpt, /not ok 4/);
  assert.doesNotMatch(excerpt, /<path>|<redacted-secret>|runner|project/);
  assert.doesNotMatch(excerpt, /super-secret-value/);
  assert.doesNotMatch(excerpt, /0123456789abcdef0123456789abcdef/);
  assert.ok(excerpt.length <= 1200);
  assert.match(sanitizeProofFailureExcerpt("TERRITORIAL_PHASE=fresh-publication"), /TERRITORIAL_PHASE=fresh-publication/);
});

test("local Supabase proofs reuse the workflow's isolated Docker network when provided", () => {
  assert.deepEqual(supabaseNetworkArgs({}), []);
  assert.deepEqual(
    supabaseNetworkArgs({ CMM_SUPABASE_NETWORK_ID: "cleanmymap-supabase-123-1" }),
    ["--network-id", "cleanmymap-supabase-123-1"],
  );
});

test("pgTAP CLI paths resolve from the checkout root to the canonical test files", () => {
  assert.equal(
    pgtapCliPath("apps/web/supabase/tests/action-buddy-contract.pgtap.sql"),
    "apps/web/supabase/tests/action-buddy-contract.pgtap.sql",
  );
});

test("changed pgTAP files can be executed first without changing the inventory", () => {
  const paths = ["a.pgtap.sql", "changed.pgtap.sql", "z.pgtap.sql"];
  assert.deepEqual(prioritizePaths(paths, ["changed.pgtap.sql"]), ["changed.pgtap.sql", "a.pgtap.sql", "z.pgtap.sql"]);
  assert.deepEqual(prioritizePaths(paths, ["missing.pgtap.sql"]), paths);
});

test("pgTAP uses the detailed local CLI path and records a safe first diagnostic", async () => {
  let report;
  const calls = [];
  await assert.rejects(() => runSupabaseSqlProof({
    commandRunner: async (command, args) => {
      calls.push({ command, args });
      return { code: 1, signal: null, timedOut: false, output: "ERROR: permission denied SQLSTATE 42501\nLINE 2: SELECT plan(3);\nnot ok 1 - private fixture" };
    },
    writeReportImpl: (value) => { report = value; },
  }));
  assert.ok(calls[0].args.includes("--debug"));
  assert.ok(calls[0].args.includes("--local"));
  assert.equal(report.firstFailure.stage, "PGTAP");
  assert.equal(report.firstFailure.origin, "POSTGRESQL");
  assert.equal(report.firstFailure.sqlstate, "42501");
  assert.equal("sqlLine" in report.records[0], false);
  assert.doesNotMatch(JSON.stringify(report), /private fixture/);
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
    /COMMAND_START_FAILED/,
  );
  assert.equal(report.outcome, "FAIL");
  const failedRecord = report.records.find((record) => record.category === "PGTAP");
  assert.equal(failedRecord.status, "DB_SEMANTICS_NOT_EXECUTED");
  assert.equal(failedRecord.outcome, "FAIL");
  assert.match(failedRecord.reason, /COMMAND_START_FAILED/);
  assert.doesNotMatch(failedRecord.reason, /spawn failed/);
  assert.ok(report.records.filter((record) => record.status === "NOT_RUN").every((record) => /not reached after failure/.test(record.reason)));
});

test("SQL evidence binds migration and proof file hashes to the checked-out candidate", async () => {
  let report;
  const result = await runSupabaseSqlProof({
    run: false,
    writeReportImpl: (nextReport) => { report = nextReport; },
  });
  const migration = result.migrations.find(({ id }) => id === "20261122000014");
  const proof = result.records.find(({ path }) => path === "apps/web/supabase/tests/action-attendance-registry.pgtap.sql");
  assert.equal(report, result);
  assert.equal(migration.contentSha256, "2f4b4ea37497fa05d67b3566a78b57ef927644c70b41a2983b2487958d885234");
  assert.equal(proof.contentSha256, "c4a1d674aa4a02dd3ba60a455fcdc8d3c098d36f26e397a61f488780058130f6");
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

test("public evidence sanitization strips forbidden authentication/session vocabulary from markers and excerpts", () => {
  const forbiddenPattern = /\b(?:authorization|cookie|set-cookie|bearer|storageState|access_token|refresh_token|session(?:_?id|_?token)?|clerk(?:_?session)?|supabase(?:_?service)?_?role)\b/i;
  const rawMarker = "EXECUTED_DB_CONTRACT: optimistic individual-impact revision, partial PATCH, authorization withdrawal and two-session contract passed";
  const sanitized = sanitizePublicEvidenceText(rawMarker);
  assert.doesNotMatch(sanitized, forbiddenPattern);

  const excerpt = sanitizeProofFailureExcerpt("ERROR: two-session authorization check failed for clerk_session");
  assert.doesNotMatch(excerpt, forbiddenPattern);
});
