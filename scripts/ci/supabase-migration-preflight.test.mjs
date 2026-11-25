import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseSupabaseJson } from "./audit-supabase-release.mjs";
import { classifyMigrationSql, findSqlContractCompatibilityIssues } from "./supabase-migration-sql.mjs";
import { buildReadOnlyCommandArgs, buildSensitiveExpectedDigests, evaluatePreflight, preflightExitCode } from "./supabase-migration-preflight.mjs";

function alignedHistory(localIds = ["20261113000001", "20261114000001"], remoteIds = localIds) {
  return { localIds, remoteIds, pending: localIds.slice(remoteIds.length), aligned: remoteIds.every((id, index) => id === localIds[index]) };
}

const readyContext = { projectRef: "a".repeat(20), projectMatched: true, authSource: "NATIVE_CREDENTIAL_STORE" };
test("parses the single CLI JSON payload with human stdout and stderr diagnostics", () => {
  const payload = { migrations: [{ local: "20261114000001", remote: "" }] };
  assert.deepEqual(parseSupabaseJson({ status: 0, stdout: `Would push these migrations:\n${JSON.stringify(payload)}`, stderr: "Connecting to remote database..." }, "migration list"), payload);
  assert.deepEqual(parseSupabaseJson({ status: 0, stdout: `DRY RUN:\n${JSON.stringify({ dryRun: true, migrations: ["20261114000001.sql"] })}`, stderr: "Connecting to remote database..." }, "Supabase db push dry-run"), { dryRun: true, migrations: ["20261114000001.sql"] });
});

test("rejects malformed or ambiguous CLI payloads", () => {
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "not json", stderr: "" }, "migration list"), /no JSON payload/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "{}", stderr: "{}" }, "migration list"), /ambiguous JSON payload/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "{} {}", stderr: "" }, "migration list"), /ambiguous JSON payload/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "{}", stderr: "diagnostic {}" }, "migration list"), /ambiguous JSON payload on stderr/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: 'text {"migrations": []} trailing text', stderr: "" }, "migration list"), /no JSON payload/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "{}", stderr: "" }, "migration list"), /unsupported structured payload/);
  assert.throws(() => parseSupabaseJson({ status: 1, stdout: "", stderr: "permission denied" }, "migration list"), /unavailable/);
});

test("classifies RPC DML as embedded and migration DML as executed", () => {
  const rpc = classifyMigrationSql("create function public.write_row() returns void language plpgsql as $$ begin insert into public.rows(id) values (1); end $$;");
  assert.equal(rpc.dataMutation, false);
  assert.equal(rpc.embeddedDml, true);
  assert.deepEqual(classifyMigrationSql("insert into public.rows(id) values (1); update public.rows set id = 2;"), { dataMutation: true, destructive: false, embeddedDml: false, reviewRequired: false, classification: ["EXECUTED_DML"] });
  assert.equal(classifyMigrationSql("do $$ begin delete from public.rows; end $$;").dataMutation, true);
});

test("qualifies only the reviewed welcome-contact catalog migration", () => {
  const file = "20261122000004_action_accessibility_welcome_contact_role.sql";
  const sql = readFileSync(resolve("apps/web/supabase/migrations", file), "utf8");
  const approved = classifyMigrationSql(sql, { id: "20261122000004", file });
  assert.equal(approved.dataMutation, false);
  assert.equal(approved.reviewedDataMutation, "20261122000004");
  assert.equal(approved.approval.kind, "BOUNDED_IDEMPOTENT_BACKFILL");
  for (const [id, candidateFile, candidateSql] of [
    ["20261122000005", file, sql],
    ["20261122000004", "other.sql", sql],
    ["20261122000004", file, sql.replace("welcome_contact", "another_role")],
    ["20261122000004", file, `${sql}\ndelete from public.action_field_role_catalog;`],
  ]) {
    const result = classifyMigrationSql(candidateSql, { id, file: candidateFile });
    assert.equal(result.dataMutation, true);
    assert.equal(result.reviewedDataMutation, undefined);
  }
});

test("approves only the exact attendance registry backfill and leaves destructive SQL blocked", () => {
  const file = "20261122000014_private_action_attendance_registry.sql";
  const sql = readFileSync(resolve("apps/web/supabase/migrations", file), "utf8");
  const approved = classifyMigrationSql(sql, { id: "20261122000014", file });
  assert.equal(approved.dataMutation, false);
  assert.equal(approved.reviewedDataMutation, "20261122000014");
  assert.deepEqual(approved.approval.proofs.map(({ path: proofPath }) => proofPath), [
    "apps/web/supabase/tests/action-attendance-registry.pgtap.sql",
    "e2e/action-attendance-registry-concurrency.mjs",
  ]);
  assert.equal(classifyMigrationSql(`${sql}\ndelete from public.actions;`, { id: "20261122000014", file }).dataMutation, true);
  assert.equal(classifyMigrationSql(sql.replace(/do nothing/i, "DO UPDATE SET revision = revision"), { id: "20261122000014", file }).dataMutation, true);
});

test("requires review for SQL whose execution timing is indeterminate", () => {
  assert.equal(classifyMigrationSql("alter table public.rows execute format('delete from public.rows');").reviewRequired, true);
});

test("detects a dropped RPC consumed by the application but ignores a recreated RPC", () => {
  const source = 'supabase.rpc("old_contract")';
  assert.deepEqual(findSqlContractCompatibilityIssues("drop function public.old_contract();", source), [{ contract: "public.old_contract", consumer: "rpc" }]);
  assert.deepEqual(findSqlContractCompatibilityIssues("drop function public.old_contract(); create function public.old_contract() returns void language sql as $$ select 1 $$;", source), []);
});

test("returns ALIGNED for convergent history without runtime or application proof", () => {
  const summary = evaluatePreflight({ ...readyContext, history: alignedHistory(), dryRunIds: [], advisors: { rlsFindings: [{ level: "WARN" }], historicalSecurity: [{ level: "WARN" }], historicalPerformance: [{ level: "INFO" }] } });
  assert.equal(summary.status, "ALIGNED");
  assert.deepEqual(summary.pending, []);
});

test("returns READY_TO_APPLY from canonical Supabase evidence without deployment proof", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002", "20261114000003"];
  const pending = localIds.slice(2);
  const summary = evaluatePreflight({ ...readyContext, authSource: "ENV_SECRET", history: alignedHistory(localIds, localIds.slice(0, 2)), dryRunIds: pending, advisors: { rlsFindings: [{ level: "INFO" }], actionableSecurity: [{ level: "WARN" }], actionablePerformance: [{ level: "WARN" }], criticalSecurity: [], criticalPerformance: [], regressions: [] }, analyses: pending.map((id) => ({ id, dataMutation: false, destructive: false, reviewRequired: false, forwardDependencies: [], sqlContractIssues: [] })) });
  assert.equal(summary.status, "READY_TO_APPLY");
  assert.deepEqual(summary.pending, pending);
});

test("favorable statuses alone are the only zero-exit preflight results", () => {
  assert.equal(preflightExitCode("ALIGNED"), 0);
  assert.equal(preflightExitCode("READY_TO_APPLY"), 0);
  assert.equal(preflightExitCode("BLOCKED"), 2);
  assert.equal(preflightExitCode("DIVERGED"), 2);
});

test("does not require deployment proof for a compatible migration queue", () => {
  const base = { ...readyContext, history: alignedHistory(["20261114000001", "20261114000002"], ["20261114000001"]), dryRunIds: ["20261114000002"], analyses: [{ id: "20261114000002", dataMutation: false, destructive: false, reviewRequired: false, forwardDependencies: [], sqlContractIssues: [] }] };
  const summary = evaluatePreflight(base);
  assert.equal(summary.status, "READY_TO_APPLY");
});

test("returns DIVERGED when the remote sequence is not a local prefix", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002"];
  const summary = evaluatePreflight({ ...readyContext, history: { ...alignedHistory(localIds, [localIds[0], "20261114000099"]), pending: [localIds[2]], aligned: false }, dryRunIds: [localIds[2]] });
  assert.equal(summary.status, "DIVERGED");
  assert.ok(summary.causes.some((cause) => cause.code === "MIGRATION_HISTORY_DIVERGED"));
});

test("attributes the first blocker to its migration and reports unrelated failures globally", () => {
  const pending = ["20261114000001", "20261114000002"];
  const analyses = [{ id: pending[1], dataMutation: true }];
  assert.equal(evaluatePreflight({
    ...readyContext,
    history: alignedHistory(pending, []),
    dryRunIds: pending,
    analyses,
    commandFailures: ["Supabase security advisors"],
  }).firstBlockingMigration, pending[1]);
  assert.equal(evaluatePreflight({
    ...readyContext,
    history: alignedHistory(pending, []),
    dryRunIds: pending,
    commandFailures: ["Supabase security advisors"],
  }).firstBlockingMigration, "GLOBAL");
});

test("blocks unverified access, actual mutations, indeterminate SQL and critical regressions", () => {
  const base = { ...readyContext, history: alignedHistory(["20261114000001", "20261114000002"], ["20261114000001"]), dryRunIds: ["20261114000002"] };
  const access = evaluatePreflight({ ...base, projectMatched: false, authSource: "UNKNOWN" });
  assert.equal(access.status, "BLOCKED");
  assert.ok(access.causes.some((cause) => cause.code === "CLI_AUTH_OR_TARGET_UNVERIFIED"));
  const mutation = evaluatePreflight({ ...base, analyses: [{ id: "20261114000002", dataMutation: true, destructive: false, forwardDependencies: [] }] });
  assert.equal(mutation.status, "BLOCKED");
  assert.ok(mutation.causes.some((cause) => cause.code === "MIGRATION_DATA_RISK"));
  const review = evaluatePreflight({ ...base, analyses: [{ id: "20261114000002", dataMutation: false, destructive: false, reviewRequired: true, forwardDependencies: [] }] });
  assert.ok(review.causes.some((cause) => cause.code === "MIGRATION_REVIEW_REQUIRED"));
  const critical = evaluatePreflight({ ...base, advisors: { criticalSecurity: [{ level: "CRITICAL" }], criticalPerformance: [], regressions: [] } });
  assert.equal(critical.status, "BLOCKED");
  assert.ok(critical.causes.some((cause) => cause.code === "SECURITY_ADVISOR_CRITICAL"));
  const error = evaluatePreflight({ ...base, advisors: { criticalSecurity: [{ level: "ERROR" }], criticalPerformance: [], regressions: [] } });
  assert.equal(error.status, "BLOCKED");
  const regression = evaluatePreflight({ ...base, advisors: { criticalSecurity: [], criticalPerformance: [], regressions: [{ level: "WARN", regression: true }] } });
  assert.equal(regression.status, "BLOCKED");
});

test("blocks a pending incompatible SQL contract", () => {
  const summary = evaluatePreflight({ ...readyContext, history: alignedHistory(["20261114000001", "20261114000002"], ["20261114000001"]), dryRunIds: ["20261114000002"], analyses: [{ id: "20261114000002", dataMutation: false, destructive: false, forwardDependencies: [], sqlContractIssues: [{ contract: "public.old_rpc" }] }] });
  assert.equal(summary.status, "BLOCKED");
  assert.ok(summary.causes.some((cause) => cause.code === "SQL_CONTRACT_INCOMPATIBLE"));
});

test("exposes only read-only Supabase commands", () => {
  const commands = buildReadOnlyCommandArgs("a".repeat(20));
  const rendered = commands.flat().join(" ").toLowerCase();
  assert.equal(commands.some((command) => command.includes("--yes")), false);
  assert.equal(rendered.includes("migration repair"), false);
  assert.equal(rendered.includes("reset"), false);
  assert.equal(rendered.includes("db push --dry-run"), true);
  assert.deepEqual(commands[2].slice(-2), ["--output-format", "json"]);
  assert.deepEqual(commands[3].slice(-2), ["--output-format", "json"]);
});

test("requires valid ephemeral evidence with matching canonical digests for sensitive pending migrations", () => {
  const file = "20261122000014_private_action_attendance_registry.sql";
  const sql = readFileSync(resolve("apps/web/supabase/migrations", file), "utf8");
  const sensitiveAnalysis = { id: "20261122000014", file, forwardDependencies: [], sqlContractIssues: [], ...classifyMigrationSql(sql, { id: "20261122000014", file }) };
  const { digests, missingFiles } = buildSensitiveExpectedDigests([sensitiveAnalysis]);
  assert.deepEqual(missingFiles, []);
  assert.equal(Object.keys(digests).length, 3);

  const base = {
    ...readyContext,
    history: alignedHistory(["20261122000013", "20261122000014"], ["20261122000013"]),
    dryRunIds: ["20261122000014"],
    analyses: [sensitiveAnalysis],
  };

  const missing = evaluatePreflight(base);
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.sensitiveProofStatus, "BLOCKED");
  assert.ok(missing.causes.some((cause) => cause.code === "SENSITIVE_PROOF_INVALID"));

  const validEvidence = {
    schemaVersion: 2,
    kind: "cleanmymap-supabase-sql-evidence",
    workflow: "supabase-sql-proof-ephemeral",
    candidateSha: "1".repeat(40),
    headSha: "1".repeat(40),
    provenance: "COMMITTED_SNAPSHOT",
    outcome: "PASS",
    workflowStages: [
      { stage: "bootstrap", status: "PASS" },
      { stage: "dbReset", status: "PASS" },
      { stage: "migrations", status: "PASS" },
      { stage: "seed", status: "PASS" },
      { stage: "schemaSeedValidation", status: "PASS" },
      { stage: "sqlProofRunner", status: "PASS" },
    ],
    migrations: [
      { id: "20261122000004", path: "apps/web/supabase/migrations/20261122000004_action_accessibility_welcome_contact_role.sql", contentSha256: "852da682aaccb16f639f2c46f162ec7a6ffb1fc5af4840df5be32ec4400e2e11" },
      { id: "20261122000014", path: `apps/web/supabase/migrations/${file}`, contentSha256: digests[`apps/web/supabase/migrations/${file}`] },
    ],
    records: [
      { path: "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql", status: "INTEGRATION_PROOF", outcome: "PASS", expectedAssertions: 56, contentSha256: "c".repeat(64) },
      { path: "apps/web/supabase/tests/action-accessibility-support.pgtap.sql", status: "INTEGRATION_PROOF", outcome: "PASS", contentSha256: "57c02a5f0aa8ba2c27449deb613b3e5b1d10c845b9d06da56b952d452a040013" },
      { path: "apps/web/supabase/tests/action-attendance-registry.pgtap.sql", status: "INTEGRATION_PROOF", outcome: "PASS", contentSha256: digests["apps/web/supabase/tests/action-attendance-registry.pgtap.sql"] },
      { path: "e2e/action-attendance-registry-concurrency.mjs", status: "INTEGRATION_PROOF", outcome: "PASS", contentSha256: digests["e2e/action-attendance-registry-concurrency.mjs"] },
    ],
  };

  const passed = evaluatePreflight({ ...base, evidence: validEvidence });
  assert.equal(passed.status, "READY_TO_APPLY");
  assert.equal(passed.sensitiveProofStatus, "PASS");

  const wrongProvenance = evaluatePreflight({ ...base, evidence: { ...validEvidence, provenance: "WORKTREE_LIVE" } });
  assert.equal(wrongProvenance.status, "BLOCKED");
  assert.ok(wrongProvenance.causes.some((cause) => cause.code === "SENSITIVE_PROOF_INVALID"));
});
