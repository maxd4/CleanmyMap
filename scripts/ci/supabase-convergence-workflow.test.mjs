import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { evaluateAutomaticPreflight, evaluateSupabaseConvergenceGate, evaluateSupabasePostflight, validateEphemeralEvidence } from "./supabase-convergence-gate.mjs";
import { validatePublicE2EArtifact } from "../checks/check-public-e2e-artifact.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "supabase-convergence.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

const candidateSha = "b".repeat(40);

function passingEvidence(overrides = {}) {
  return {
    kind: "cleanmymap-supabase-sql-evidence",
    workflow: "supabase-sql-proof-ephemeral",
    candidateSha,
    headSha: candidateSha,
    provenance: "COMMITTED_SNAPSHOT",
    outcome: "PASS",
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
      contentSha256: "4da5e23312d7d76d649997f61c29771f470ef4cb0bea2f1b5f09a9f92a75653e",
    }, {
      path: "e2e/action-attendance-registry-concurrency.mjs",
      status: "INTEGRATION_PROOF",
      outcome: "PASS",
      contentSha256: "a77eee7ffaa7c37ebcbb8e1aafbbcf889d77f9ce58ebf69ff0b85098f23bf5ff",
    }],
    ...overrides,
  };
}

test("Supabase convergence is proof-triggered, scheduled, manual, and serialized", () => {
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\n\s+- supabase-sql-proof-ephemeral/);
  assert.match(workflow, /types:\s*\n\s+- completed/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(workflow, /group:\s*supabase-production-migrations/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /environment:\s*supabase-production/);
  assert.match(workflow, /actions\/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333/);
  assert.match(workflow, /Checkout trusted main control source[\s\S]*?ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /Checkout tested candidate[\s\S]*?github\.event\.workflow_run\.head_sha/);
  assert.doesNotMatch(workflow.slice(0, workflow.indexOf("Download sanitized ephemeral proof")), /github\.event\.workflow_run\.head_sha/);
  assert.match(workflow, /CMM_SUPABASE_SOURCE_HEAD_REPOSITORY:\s*\$\{\{ github\.event\.workflow_run\.head_repository\.full_name \}\}/);
  assert.match(workflow, /git ls-remote origin refs\/heads\/main/);
  assert.match(workflow, /Recheck exact remote main before application[\s\S]*?current_main_sha.*CMM_SUPABASE_CANDIDATE_SHA/);
  assert.match(workflow, /supabase-convergence-gate\.mjs/);
  assert.match(workflow, /github\.event_name == 'workflow_run'/);
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
  assert.doesNotMatch(sqlWorkflow, /CMM_E2E_CLERK_DEV_BACKEND_TOKEN|CMM_E2E_CLERK_DEV_PUBLISHABLE_KEY/);
  assert.doesNotMatch(e2eWorkflow, /run-supabase-sql-proof\.mjs/);
  assert.match(e2eWorkflow, /Run SPOGOMI Cachan mixed integration on ephemeral Supabase/);
  assert.match(e2eWorkflow, /Run persistent E2E/);
  assert.match(e2eWorkflow, /scripts\/ci\/supabase-config\.mjs/);
  assert.match(startScript, /supabase-config\.mjs/);
  assert.match(startScript, /supabase" start --debug --workdir "\$bootstrap_workdir/);
  for (const workflowText of [sqlWorkflow, e2eWorkflow]) {
    const bootstrapIndex = workflowText.indexOf("name: Start ephemeral Supabase");
    const resetIndex = workflowText.indexOf("name: Apply canonical migrations and seed");
    assert.ok(bootstrapIndex >= 0 && resetIndex > bootstrapIndex, "the canonical reset must follow bootstrap");
    assert.match(workflowText.slice(bootstrapIndex, resetIndex), /start-supabase-ephemeral\.sh/);
    assert.match(workflowText.slice(resetIndex, resetIndex + 600), /supabase db reset --local --workdir apps\/web --yes/);
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

test("SQL evidence keeps its relative path from upload through extraction, validation, and gate read", (context) => {
  const sqlWorkflow = yaml.load(fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "supabase-sql-proof.yml"), "utf8"));
  const convergenceWorkflow = yaml.load(workflow);
  const upload = sqlWorkflow.jobs["sql-proof"].steps.find(({ name }) => name === "Upload complete SQL proof evidence");
  const download = convergenceWorkflow.jobs.gate.steps.find(({ name }) => name === "Download sanitized ephemeral proof");
  const validation = convergenceWorkflow.jobs.gate.steps.find(({ name }) => name === "Validate sanitized ephemeral proof envelope");
  const gate = convergenceWorkflow.jobs.gate.steps.find(({ name }) => name === "Validate trigger, remote HEAD, and exact proof");

  assert.equal(upload.with.name, download.with.name);
  assert.equal(upload.with.path, "artifacts/ci-public-evidence");
  assert.equal(download.with.path, "artifacts/ci-public-evidence");
  assert.match(validation.run, /check-public-e2e-artifact\.mjs artifacts\/ci-public-evidence/);
  assert.equal(gate.env.CMM_SUPABASE_EVIDENCE_PATH, "artifacts/ci-public-evidence/evidence/supabase-sql.json");

  const allowedRoot = path.resolve(repositoryRoot, "artifacts/ci-public-evidence");
  const createdAllowedRoot = !fs.existsSync(allowedRoot);
  fs.mkdirSync(allowedRoot, { recursive: true });
  const stagingRoot = fs.mkdtempSync(path.join(allowedRoot, "upload-contract-"));
  const extractedRoot = fs.mkdtempSync(path.join(allowedRoot, "download-contract-"));
  context.after(() => {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    fs.rmSync(extractedRoot, { recursive: true, force: true });
    if (createdAllowedRoot && fs.readdirSync(allowedRoot).length === 0) fs.rmSync(allowedRoot, { recursive: true });
    const artifactsRoot = path.dirname(allowedRoot);
    if (createdAllowedRoot && fs.existsSync(artifactsRoot) && fs.readdirSync(artifactsRoot).length === 0) fs.rmdirSync(artifactsRoot);
  });

  const stagedEvidence = path.resolve(stagingRoot, path.relative(path.resolve(repositoryRoot, upload.with.path), path.resolve(repositoryRoot, gate.env.CMM_SUPABASE_EVIDENCE_PATH)));
  fs.mkdirSync(path.dirname(stagedEvidence), { recursive: true });
  fs.writeFileSync(stagedEvidence, JSON.stringify(passingEvidence()));
  const archiveRelativePath = path.relative(stagingRoot, stagedEvidence);
  fs.mkdirSync(path.dirname(path.resolve(extractedRoot, archiveRelativePath)), { recursive: true });
  fs.copyFileSync(stagedEvidence, path.resolve(extractedRoot, archiveRelativePath));

  assert.equal(archiveRelativePath.replace(/\\/g, "/"), "evidence/supabase-sql.json");
  assert.deepEqual(validatePublicE2EArtifact(extractedRoot), []);
  const extractedEvidencePath = path.resolve(extractedRoot, path.relative(path.resolve(repositoryRoot, download.with.path), path.resolve(repositoryRoot, gate.env.CMM_SUPABASE_EVIDENCE_PATH)));
  const extractedEvidence = JSON.parse(fs.readFileSync(extractedEvidencePath, "utf8"));
  assert.equal(evaluateSupabaseConvergenceGate({
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "supabase-sql-proof-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: extractedEvidence,
  }).apply, true);

  const changedBackfillProof = passingEvidence();
  changedBackfillProof.records.find((record) => record.path === "apps/web/supabase/tests/action-attendance-registry.pgtap.sql").contentSha256 = "0".repeat(64);
  assert.equal(validateEphemeralEvidence({ evidence: changedBackfillProof, candidateSha }).mode, "BLOCKED");

  fs.writeFileSync(path.join(extractedRoot, "secrets.log"), "private diagnostic");
  assert.ok(validatePublicE2EArtifact(extractedRoot).some((issue) => issue.includes("outside the public evidence allowlist")));
  fs.rmSync(path.join(extractedRoot, "secrets.log"));
  fs.rmSync(extractedEvidencePath);
  assert.equal(fs.existsSync(extractedEvidencePath), false);
  assert.equal(evaluateSupabaseConvergenceGate({
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "supabase-sql-proof-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: null,
  }).mode, "BLOCKED");
});

test("production secrets are scoped to the protected non-PR job and the canonical CLI gate", () => {
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD is required for the linked PostgreSQL read-only checks/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|resolve-vercel-runtime-proof|--runtime-proof=/);
  assert.match(workflow, /supabase:migration:preflight -- --dry-run/);
  assert.match(workflow, /Run read-only preflight and gate the queue[\s\S]*?SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /Verify history, Advisors, and critical SQL contracts[\s\S]*?SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /supabase-convergence-gate\.mjs --preflight/);
  assert.match(workflow, /github\.event_name == 'workflow_run' && steps\.preflight\.outputs\.apply == 'true'/);
  assert.match(workflow, /npx supabase db push --linked --yes/);
  assert.doesNotMatch(workflow, /migration repair|db reset|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
});

test("read-only convergence summary reports pending count and age of the oldest pending migration", () => {
  assert.match(workflow, /PENDING_MIGRATIONS: \/\/p/);
  assert.match(workflow, /PENDING: \/\/p/);
  assert.match(workflow, /Oldest pending migration/);
  assert.match(workflow, /oldest_age_days=\$\(\(\(now_epoch - oldest_epoch\) \/ 86400\)\)/);
  assert.match(workflow, /Pending migrations:.*pending_count:-UNKNOWN/s);
});

test("complete SQL success is independent of app E2E; automatic apply still requires READY_TO_APPLY", () => {
  const source = {
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "supabase-sql-proof-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: passingEvidence(),
  };
  assert.equal(evaluateSupabaseConvergenceGate(source).apply, true);
  assert.equal(evaluateSupabaseConvergenceGate({ ...source, workflowName: "e2e-supabase-ephemeral", conclusion: "failure" }).mode, "BLOCKED");
  assert.equal(evaluateAutomaticPreflight({ eventName: "workflow_run", status: "READY_TO_APPLY", exitCode: 0 }).apply, true);
  assert.equal(evaluateAutomaticPreflight({ eventName: "workflow_run", status: "ALIGNED", exitCode: 0 }).apply, false);
  for (const status of ["BLOCKED", "DIVERGED", "MISSING"]) {
    assert.equal(evaluateAutomaticPreflight({ eventName: "workflow_run", status, exitCode: 0 }).pass, false, status);
  }
  assert.equal(evaluateAutomaticPreflight({ eventName: "workflow_run", status: "READY_TO_APPLY", exitCode: 1 }).pass, false);
  assert.equal(evaluateAutomaticPreflight({ eventName: "workflow_dispatch", status: "READY_TO_APPLY", exitCode: 0 }).apply, false);
});

test("the workflow verifies an empty queue and critical static contracts without pretending to run pgTAP remotely", () => {
  assert.match(workflow, /supabase-convergence-postflight\.mjs "\$GITHUB_EVENT_NAME" "\$postflight_status" "\$postflight_exit"/);
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
    workflowName: "supabase-sql-proof-ephemeral",
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

test("read-only events accept pending queues while real convergence requires ALIGNED", () => {
  for (const eventName of ["schedule", "workflow_dispatch"]) {
    assert.equal(evaluateSupabasePostflight({ eventName, status: "ALIGNED", exitCode: 0 }).pass, true);
    assert.equal(evaluateSupabasePostflight({ eventName, status: "READY_TO_APPLY", exitCode: 0 }).mode, "READ_ONLY_PENDING");
    for (const status of ["BLOCKED", "DIVERGED"]) {
      assert.equal(evaluateSupabasePostflight({ eventName, status, exitCode: 0 }).pass, false, `${eventName} ${status}`);
    }
  }

  assert.equal(evaluateSupabasePostflight({ eventName: "workflow_run", status: "ALIGNED", exitCode: 0 }).pass, true);
  for (const status of ["READY_TO_APPLY", "BLOCKED", "DIVERGED"]) {
    assert.equal(evaluateSupabasePostflight({ eventName: "workflow_run", status, exitCode: 0 }).pass, false, `workflow_run ${status}`);
  }
  assert.equal(evaluateSupabasePostflight({ eventName: "workflow_dispatch", status: "READY_TO_APPLY", exitCode: 1 }).pass, false);
});

test("wrong source, failed run, stale main, missing proof, and incomplete proof are refused", () => {
  const base = {
    eventName: "workflow_run",
    repository: "maxd4/CleanmyMap",
    sourceRepository: "maxd4/CleanmyMap",
    sourceHeadRepository: "maxd4/CleanmyMap",
    workflowName: "supabase-sql-proof-ephemeral",
    headBranch: "main",
    conclusion: "success",
    candidateSha,
    remoteHeadSha: candidateSha,
    evidence: passingEvidence(),
  };
  for (const [field, value] of [
    ["workflowName", "other-workflow"],
    ["workflowName", "e2e-supabase-ephemeral"],
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
    workflowName: "supabase-sql-proof-ephemeral",
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
