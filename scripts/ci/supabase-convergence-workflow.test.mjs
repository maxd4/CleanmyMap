import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { evaluateSupabasePostflight, validateEphemeralEvidence } from "./supabase-convergence-gate.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "supabase-convergence.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

const candidateSha = "b".repeat(40);

function passingEvidence(overrides = {}) {
  return {
    schemaVersion: 2,
    kind: "cleanmymap-supabase-sql-evidence",
    workflow: "supabase-sql-proof-ephemeral",
    candidateSha,
    headSha: candidateSha,
    provenance: "COMMITTED_SNAPSHOT",
    outcome: "PASS",
    workflowStages: [
      { stage: "bootstrap", status: "PASS", origin: "SUPABASE_START" },
      { stage: "dbReset", status: "PASS", origin: "CANONICAL_DB_RESET" },
      { stage: "migrations", status: "PASS", origin: "CANONICAL_DB_RESET" },
      { stage: "seed", status: "PASS", origin: "CANONICAL_DB_RESET" },
      { stage: "schemaSeedValidation", status: "PASS", origin: "POST_RESET_SQL_CHECK" },
      { stage: "sqlProofRunner", status: "PASS", origin: "CANONICAL_SQL_PROOF_RUNNER" },
    ],
    migrations: [
      { id: "20261122000004", path: "apps/web/supabase/migrations/20261122000004_action_accessibility_welcome_contact_role.sql", contentSha256: "852da682aaccb16f639f2c46f162ec7a6ffb1fc5af4840df5be32ec4400e2e11" },
      { id: "20261122000014", path: "apps/web/supabase/migrations/20261122000014_private_action_attendance_registry.sql", contentSha256: "2f4b4ea37497fa05d67b3566a78b57ef927644c70b41a2983b2487958d885234" },
    ],
    records: [{
      path: "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      expectedAssertions: 56,
      contentSha256: "c".repeat(64),
    }, {
      path: "apps/web/supabase/tests/action-accessibility-support.pgtap.sql",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      contentSha256: "57c02a5f0aa8ba2c27449deb613b3e5b1d10c845b9d06da56b952d452a040013",
    }, {
      path: "apps/web/supabase/tests/action-attendance-registry.pgtap.sql",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      contentSha256: "cde4d55d936c9bf7ae915ad8c9d2aed4670d7d55ce2b3d375e0edc6f15ffd6c8",
    }, {
      path: "e2e/action-attendance-registry-concurrency.mjs",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      contentSha256: "0b76640cec8f646fe13692775eae136dd3529ff11ad854753b0ce030a56ef161",
    }],
    ...overrides,
  };
}

test("Supabase convergence workflow is read-only monitoring without remote writes", () => {
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(workflow, /group:\s*supabase-production-migrations/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /environment:\s*supabase-production/);
  assert.match(workflow, /Checkout trusted main control source[\s\S]*?ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /db push --linked --yes/);
  assert.doesNotMatch(workflow, /migration repair|db reset|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
});

test("manual ephemeral E2E is restricted to the current main SHA before any credentials run", () => {
  const e2eWorkflow = fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "e2e-supabase.yml"), "utf8");
  assert.match(e2eWorkflow, /workflow_dispatch:/);
  assert.match(e2eWorkflow, /if: github\.event_name != 'workflow_dispatch' \|\| github\.ref == 'refs\/heads\/main'/);
  assert.match(e2eWorkflow, /Verify manual run targets current main[\s\S]*?if: github\.event_name == 'workflow_dispatch'[\s\S]*?git ls-remote origin refs\/heads\/main[\s\S]*?current_main_sha.*GITHUB_SHA/);
  assert.ok(e2eWorkflow.indexOf("Verify manual run targets current main") < e2eWorkflow.indexOf("Run SPOGOMI Cachan mixed integration on ephemeral Supabase"));
});

test("SQL proof is an independent serialized lane and application E2E no longer runs pgTAP proofs", () => {
  const sqlWorkflow = fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "supabase-sql-proof.yml"), "utf8");
  const e2eWorkflow = fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "e2e-supabase.yml"), "utf8");
  const startScript = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "start-supabase-ephemeral.sh"), "utf8");
  assert.match(sqlWorkflow, /name: supabase-sql-proof-ephemeral/);
  assert.match(sqlWorkflow, /cancel-in-progress:\s*false/);
  assert.match(sqlWorkflow, /find apps\/web\/supabase\/migrations apps\/web\/supabase\/tests e2e -type f -name '\*\.sql'/);
  assert.match(sqlWorkflow, /npm run audit:supabase-migration-trees/);
  assert.match(sqlWorkflow, /CMM_SUPABASE_TEST_ENVIRONMENT:\s*ephemeral/);
  assert.match(sqlWorkflow, /CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION:/);
  assert.match(sqlWorkflow, /run-supabase-sql-proof\.mjs/);
  assert.match(sqlWorkflow, /cleanmymap-supabase-sql-evidence/);
  assert.match(sqlWorkflow, /scripts\/ci\/supabase-config\.mjs/);
  assert.match(sqlWorkflow, /scripts\/ci\/isolate-supabase-migration-failure\.mjs/);
  assert.match(sqlWorkflow, /hashFiles\('artifacts\/ci-public-evidence\/evidence\/supabase-sql\.json'\) != ''[\s\S]*?steps\.validate_evidence\.outcome == 'success'/);
  assert.match(sqlWorkflow, /--initialize-workflow-evidence/);
  assert.match(sqlWorkflow, /--reset-canonical-db/);
  assert.match(sqlWorkflow, /--verify-canonical-schema-seed/);
  assert.match(sqlWorkflow, /--finalize-workflow-evidence/);
  assert.doesNotMatch(sqlWorkflow, /CMM_E2E_CLERK_DEV_BACKEND_TOKEN|CMM_E2E_CLERK_DEV_PUBLISHABLE_KEY/);
  assert.doesNotMatch(e2eWorkflow, /run-supabase-sql-proof\.mjs/);
  assert.match(e2eWorkflow, /Run SPOGOMI Cachan mixed integration on ephemeral Supabase/);
  assert.match(e2eWorkflow, /Run persistent E2E/);
  assert.match(e2eWorkflow, /scripts\/ci\/supabase-config\.mjs/);
  assert.match(startScript, /supabase-config\.mjs/);
  assert.match(startScript, /timeout --signal=TERM --kill-after=15s "\$start_timeout_seconds" "\$root\/node_modules\/\.bin\/supabase" start --debug --workdir "\$bootstrap_workdir/);
  assert.match(startScript, /capture-bounded-log\.mjs" "\$start_log" 8388608/);
  for (const workflowText of [sqlWorkflow, e2eWorkflow]) {
    const bootstrapIndex = workflowText.indexOf("name: Start ephemeral Supabase");
    const resetIndex = workflowText.indexOf("name: Apply canonical migrations and seed");
    assert.ok(bootstrapIndex >= 0 && resetIndex > bootstrapIndex, "the canonical reset must follow bootstrap");
    assert.match(workflowText.slice(bootstrapIndex, resetIndex), /start-supabase-ephemeral\.sh/);
    if (workflowText === sqlWorkflow) {
      assert.match(workflowText.slice(resetIndex, resetIndex + 600), /--reset-canonical-db/);
    } else {
      assert.match(workflowText.slice(resetIndex, resetIndex + 600), /supabase db reset --local --workdir apps\/web --yes/);
    }
  }
});

test("manual migration isolation is read-only and cannot attest convergence", () => {
  const sqlWorkflow = yaml.load(fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "supabase-sql-proof.yml"), "utf8"));
  assert.equal(sqlWorkflow.jobs["isolate-replay"].permissions.contents, "read");
  assert.match(sqlWorkflow.jobs["isolate-replay"].if, /inputs\.mode == 'isolate-replay'/);
  assert.match(sqlWorkflow.jobs["sql-proof"].if, /inputs\.mode != 'isolate-replay'/);
  assert.doesNotMatch(JSON.stringify(sqlWorkflow.jobs["isolate-replay"]), /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|service_role/i);
  assert.ok(sqlWorkflow.jobs["isolate-replay"].steps.some(({ name }) => name === "Verify manual run targets current main"));
  assert.ok(sqlWorkflow.jobs["isolate-replay"].steps.some(({ name }) => name === "Upload sanitized isolation evidence"));
});

test("production secrets are scoped to the protected non-PR read-only monitoring job", () => {
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD is required for the linked PostgreSQL read-only checks/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|resolve-vercel-runtime-proof|--runtime-proof=/);
  assert.match(workflow, /supabase:migration:preflight -- --dry-run/);
  assert.match(workflow, /Run read-only convergence preflight[\s\S]*?SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
});

test("read-only convergence summary reports pending count and age of the oldest pending migration", () => {
  assert.match(workflow, /PENDING_MIGRATIONS: \/\/p/);
  assert.match(workflow, /PENDING: \/\/p/);
  assert.match(workflow, /Oldest pending migration/);
  assert.match(workflow, /oldest_age_days=\$\(\(\(now_epoch - oldest_epoch\) \/ 86400\)\)/);
  assert.match(workflow, /Pending migrations:.*pending_count:-UNKNOWN/s);
});

test("the workflow verifies migration trees and critical static contracts without running pgTAP remotely", () => {
  assert.match(workflow, /supabase-convergence-postflight\.mjs "\$GITHUB_EVENT_NAME" "\$status" "\$preflight_exit"/);
  assert.match(workflow, /audit:supabase-migration-trees/);
  assert.match(workflow, /action-rides-transactions-migration\.test\.ts/);
  assert.match(workflow, /public-action-map-reconstruction-projection\.test\.ts/);
  assert.doesNotMatch(workflow, /run-supabase-sql-proof\.mjs/);
});

test("read-only convergence monitoring accepts ALIGNED and READY_TO_APPLY while blocking BLOCKED and DIVERGED", () => {
  for (const eventName of ["schedule", "workflow_dispatch"]) {
    assert.equal(evaluateSupabasePostflight({ eventName, status: "ALIGNED", exitCode: 0 }).pass, true);
    assert.equal(evaluateSupabasePostflight({ eventName, status: "READY_TO_APPLY", exitCode: 0 }).mode, "READ_ONLY_PENDING");
    for (const status of ["BLOCKED", "DIVERGED"]) {
      assert.equal(evaluateSupabasePostflight({ eventName, status, exitCode: 0 }).pass, false, `${eventName} ${status}`);
    }
    assert.equal(evaluateSupabasePostflight({ eventName, status: "READY_TO_APPLY", exitCode: 2 }).pass, false);
  }
});

test("ephemeral SQL evidence is validated by exact input digests rather than current main SHA equality", () => {
  const olderShaEvidence = passingEvidence({
    candidateSha: "a".repeat(40),
    headSha: "a".repeat(40),
  });
  const expectedDigests = {
    "apps/web/supabase/migrations/20261122000014_private_action_attendance_registry.sql": "2f4b4ea37497fa05d67b3566a78b57ef927644c70b41a2983b2487958d885234",
    "apps/web/supabase/tests/action-attendance-registry.pgtap.sql": "cde4d55d936c9bf7ae915ad8c9d2aed4670d7d55ce2b3d375e0edc6f15ffd6c8",
    "e2e/action-attendance-registry-concurrency.mjs": "0b76640cec8f646fe13692775eae136dd3529ff11ad854753b0ce030a56ef161",
  };
  assert.equal(validateEphemeralEvidence({ evidence: olderShaEvidence, expectedDigests }).valid, true);
  assert.equal(validateEphemeralEvidence({ evidence: olderShaEvidence }).mode, "BLOCKED");
  assert.equal(validateEphemeralEvidence({ evidence: olderShaEvidence, expectedDigests: {} }).mode, "BLOCKED");

  assert.equal(validateEphemeralEvidence({
    evidence: olderShaEvidence,
    expectedDigests: { ...expectedDigests, "apps/web/supabase/tests/action-attendance-registry.pgtap.sql": "0".repeat(64) },
  }).mode, "BLOCKED");

  const changedBackfillProof = passingEvidence();
  changedBackfillProof.records.find((record) => record.path === "apps/web/supabase/tests/action-attendance-registry.pgtap.sql").contentSha256 = "0".repeat(64);
  assert.equal(validateEphemeralEvidence({ evidence: changedBackfillProof, expectedDigests }).mode, "BLOCKED");

  assert.equal(validateEphemeralEvidence({ evidence: null, expectedDigests }).mode, "BLOCKED");
  assert.equal(validateEphemeralEvidence({ evidence: passingEvidence({ outcome: "NOT_RUN" }), expectedDigests }).mode, "BLOCKED");
  assert.equal(validateEphemeralEvidence({ evidence: passingEvidence({ records: [] }), expectedDigests }).mode, "BLOCKED");

  const passingStages = passingEvidence().workflowStages;
  for (const stage of ["bootstrap", "dbReset", "migrations", "seed", "schemaSeedValidation", "sqlProofRunner"]) {
    for (const status of ["FAIL", "NOT_RUN", "INCONCLUSIVE"]) {
      const evidence = passingEvidence({ workflowStages: passingStages.map((entry) => entry.stage === stage ? { ...entry, status } : entry) });
      assert.equal(validateEphemeralEvidence({ evidence, expectedDigests }).mode, "BLOCKED", `${stage}=${status}`);
    }
  }
});

test("all third-party actions in the workflow are pinned to full commit SHAs", () => {
  const refs = [...workflow.matchAll(/^\s+uses:\s+([^\s]+)@([^\s]+)$/gm)];
  assert.ok(refs.length >= 2);
  for (const [, action, sha] of refs) assert.match(`${action}@${sha}`, /@[0-9a-f]{40}$/i);
});
