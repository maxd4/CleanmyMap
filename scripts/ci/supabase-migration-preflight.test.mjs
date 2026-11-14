import test from "node:test";
import assert from "node:assert/strict";

import { parseSupabaseJson } from "./audit-supabase-release.mjs";
import { classifyMigrationSql, findSqlContractCompatibilityIssues } from "./supabase-migration-sql.mjs";
import { buildReadOnlyCommandArgs, evaluatePreflight } from "./supabase-migration-preflight.mjs";

function alignedHistory(localIds = ["20261113000001", "20261114000001"], remoteIds = localIds) {
  return { localIds, remoteIds, pending: localIds.slice(remoteIds.length), aligned: remoteIds.every((id, index) => id === localIds[index]) };
}

const readyContext = { projectRef: "a".repeat(20), projectMatched: true, authSource: "NATIVE_CREDENTIAL_STORE" };
const compatibleRuntime = {
  status: "COMPATIBLE",
  verified: true,
  sha: "a".repeat(40),
  migrationVersion: "20261114000002",
  source: "vercel-api-readonly",
  projectId: "prj_test",
  deploymentId: "dpl_test",
  productionAlias: "cleanmymap.fr",
  target: "production",
  readyState: "READY",
  observed: { projectId: "prj_test", deploymentId: "dpl_test", target: "production", readyState: "READY", gitSha: "a".repeat(40), productionAlias: "cleanmymap.fr" },
};

test("parses the single CLI JSON payload with human stdout and stderr diagnostics", () => {
  const payload = { migrations: [{ local: "20261114000001", remote: "" }] };
  assert.deepEqual(parseSupabaseJson({ status: 0, stdout: `Would push these migrations:\n${JSON.stringify(payload)}`, stderr: "Connecting to remote database..." }, "migration list"), payload);
});

test("rejects malformed or ambiguous CLI payloads", () => {
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "not json", stderr: "" }, "migration list"), /no JSON payload/);
  assert.throws(() => parseSupabaseJson({ status: 0, stdout: "{}", stderr: "{}" }, "migration list"), /ambiguous JSON payload/);
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

test("returns READY_TO_APPLY only with an API-verified runtime observation", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002", "20261114000003"];
  const pending = localIds.slice(2);
  const summary = evaluatePreflight({ ...readyContext, authSource: "ENV_SECRET", history: alignedHistory(localIds, localIds.slice(0, 2)), dryRunIds: pending, runtimeEvidence: compatibleRuntime, candidateSha: compatibleRuntime.sha, expectedRuntimeProjectId: compatibleRuntime.projectId, advisors: { rlsFindings: [{ level: "INFO" }], actionableSecurity: [{ level: "WARN" }], actionablePerformance: [{ level: "WARN" }], criticalSecurity: [], criticalPerformance: [], regressions: [] }, analyses: pending.map((id) => ({ id, dataMutation: false, destructive: false, reviewRequired: false, forwardDependencies: [], sqlContractIssues: [] })) });
  assert.equal(summary.status, "READY_TO_APPLY");
  assert.deepEqual(summary.pending, pending);
});

test("blocks pending migrations when runtime proof is absent or falsified", () => {
  const base = { ...readyContext, history: alignedHistory(["20261114000001", "20261114000002"], ["20261114000001"]), dryRunIds: ["20261114000002"], analyses: [{ id: "20261114000002", dataMutation: false, destructive: false, reviewRequired: false, forwardDependencies: [], sqlContractIssues: [] }] };
  const missing = evaluatePreflight(base);
  assert.equal(missing.status, "BLOCKED");
  assert.ok(missing.causes.some((cause) => cause.code === "RUNTIME_MISSING"));
  const falsified = evaluatePreflight({ ...base, runtimeEvidence: { ...compatibleRuntime, verified: false }, candidateSha: compatibleRuntime.sha, expectedRuntimeProjectId: compatibleRuntime.projectId });
  assert.equal(falsified.status, "BLOCKED");
  assert.ok(falsified.causes.some((cause) => cause.code === "RUNTIME_INCOMPATIBLE"));
});

test("returns DIVERGED when the remote sequence is not a local prefix", () => {
  const localIds = ["20261113000001", "20261114000001", "20261114000002"];
  const summary = evaluatePreflight({ ...readyContext, history: { ...alignedHistory(localIds, [localIds[0], "20261114000099"]), pending: [localIds[2]], aligned: false }, dryRunIds: [localIds[2]] });
  assert.equal(summary.status, "DIVERGED");
  assert.ok(summary.causes.some((cause) => cause.code === "MIGRATION_HISTORY_DIVERGED"));
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
});
