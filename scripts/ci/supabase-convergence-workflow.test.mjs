import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateSupabaseConvergenceGate, validateEphemeralEvidence } from "./supabase-convergence-gate.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "supabase-convergence.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

const candidateSha = "b".repeat(40);

function passingEvidence(overrides = {}) {
  return {
    kind: "cleanmymap-supabase-sql-evidence",
    workflow: "e2e-supabase-ephemeral",
    candidateSha,
    headSha: candidateSha,
    provenance: "COMMITTED_SNAPSHOT",
    outcome: "PASS",
    records: [{
      path: "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      expectedAssertions: 56,
    }],
    ...overrides,
  };
}

test("Supabase convergence is proof-triggered, scheduled, manual, and serialized", () => {
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\n\s+- e2e-supabase-ephemeral/);
  assert.match(workflow, /types:\s*\n\s+- completed/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(workflow, /group:\s*supabase-production-migrations/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /environment:\s*supabase-production/);
  assert.match(workflow, /actions\/download-artifact@95815c38cf2ff2164869cbab79da8d1f422bc89e/);
  assert.match(workflow, /Checkout trusted main control source[\s\S]*?ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /Checkout tested candidate[\s\S]*?github\.event\.workflow_run\.head_sha/);
  assert.doesNotMatch(workflow.slice(0, workflow.indexOf("Download sanitized ephemeral proof")), /github\.event\.workflow_run\.head_sha/);
  assert.match(workflow, /CMM_SUPABASE_SOURCE_HEAD_REPOSITORY:\s*\$\{\{ github\.event\.workflow_run\.head_repository\.full_name \}\}/);
  assert.match(workflow, /git ls-remote origin refs\/heads\/main/);
  assert.match(workflow, /Recheck exact remote main before application[\s\S]*?current_main_sha.*CMM_SUPABASE_CANDIDATE_SHA/);
  assert.match(workflow, /supabase-convergence-gate\.mjs/);
  assert.match(workflow, /github\.event_name == 'workflow_run'/);
});

test("production secrets are scoped to the protected non-PR job and the canonical CLI gate", () => {
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD is required for the linked PostgreSQL read-only checks/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|resolve-vercel-runtime-proof|--runtime-proof=/);
  assert.match(workflow, /supabase:migration:preflight -- --dry-run/);
  assert.match(workflow, /Run read-only preflight and gate the queue[\s\S]*?SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /Verify history, Advisors, and critical SQL contracts[\s\S]*?SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /if \[ "\$preflight_exit" -ne 0 \]/);
  assert.match(workflow, /Preflight returned a non-zero exit code/);
  assert.match(workflow, /github\.event_name == 'workflow_run' && steps\.preflight\.outputs\.status == 'READY_TO_APPLY'/);
  assert.match(workflow, /npx supabase db push --linked --yes/);
  assert.doesNotMatch(workflow, /migration repair|db reset|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
});

test("the workflow verifies an empty queue and critical static contracts without pretending to run pgTAP remotely", () => {
  assert.match(workflow, /postflight_status.*ALIGNED/);
  assert.match(workflow, /audit:supabase-migration-trees/);
  assert.match(workflow, /action-rides-transactions-migration\.test\.ts/);
  assert.match(workflow, /public-action-map-reconstruction-projection\.test\.ts/);
  assert.doesNotMatch(workflow, /run-supabase-sql-proof\.mjs/);
});

test("only a successful exact main run with complete SQL evidence can apply", () => {
  assert.deepEqual(evaluateSupabaseConvergenceGate({
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "e2e-supabase-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: passingEvidence(),
  }), { mode: "APPLY", apply: true, reason: "ephemeral SQL proof passed for the exact main SHA" });
});

test("manual and scheduled controls are read-only", () => {
  for (const eventName of ["workflow_dispatch", "schedule"]) {
    assert.deepEqual(evaluateSupabaseConvergenceGate({ eventName }), {
      mode: "READ_ONLY",
      apply: false,
      reason: `${eventName} is read-only and cannot apply migrations`,
    });
  }
});

test("wrong source, failed run, stale main, missing proof, and incomplete proof are refused", () => {
  const base = {
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "e2e-supabase-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: passingEvidence(),
  };
  for (const [field, value] of [
    ["workflowName", "other-workflow"],
    ["sourceRepository", "fork/CleanmyMap"],
    ["sourceHeadRepository", "fork/CleanmyMap"],
    ["headBranch", "feature"],
    ["conclusion", "failure"],
    ["remoteHeadSha", "a".repeat(40)],
    ["evidence", null],
    ["evidence", passingEvidence({ outcome: "NOT_RUN" })],
    ["evidence", passingEvidence({ records: [] })],
  ]) {
    assert.equal(evaluateSupabaseConvergenceGate({ ...base, [field]: value }).mode, "BLOCKED", field);
  }
  assert.equal(validateEphemeralEvidence({ evidence: passingEvidence({ candidateSha: "a".repeat(40) }), candidateSha }).mode, "BLOCKED");
});

test("a workflow_run produced by a pull request is blocked before any production convergence", () => {
  assert.equal(evaluateSupabaseConvergenceGate({
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "attacker/CleanmyMap",
    workflowName: "e2e-supabase-ephemeral",
    headBranch: "feature/untrusted-change",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: passingEvidence(),
  }).mode, "BLOCKED");
});

test("all third-party actions in the workflow are pinned to full commit SHAs", () => {
  const refs = [...workflow.matchAll(/^\s+uses:\s+([^\s]+)@([^\s]+)$/gm)];
  assert.ok(refs.length >= 2);
  for (const [, action, sha] of refs) assert.match(`${action}@${sha}`, /@[0-9a-f]{40}$/i);
});
