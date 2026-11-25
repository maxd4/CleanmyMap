#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { reviewedMigrationApprovals } from "./supabase-migration-sql.mjs";

const EXPECTED_REPOSITORY = "maxd4/CleanmyMap";
const EXPECTED_WORKFLOW = "supabase-sql-proof-ephemeral";
const EXPECTED_PROOF_KIND = "cleanmymap-supabase-sql-evidence";
const EXPECTED_REF = "refs/heads/main";
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const DIGITS_PATTERN = /^\d+$/;

function blocked(reason) {
  return Object.freeze({ mode: "BLOCKED", valid: false, reason });
}

export function verifyGitHubActionsRun({ repository, workflow, ref, runId, candidateSha } = {}) {
  if (repository !== EXPECTED_REPOSITORY) {
    return { ok: false, reason: "ephemeral SQL evidence repository is not canonical" };
  }
  if (workflow !== EXPECTED_WORKFLOW) {
    return { ok: false, reason: "ephemeral SQL evidence workflow is not canonical" };
  }
  if (ref !== EXPECTED_REF) {
    return { ok: false, reason: "ephemeral SQL evidence ref is not main" };
  }
  if (!DIGITS_PATTERN.test(String(runId ?? ""))) {
    return { ok: false, reason: "ephemeral SQL evidence GitHub runId is missing or invalid" };
  }
  if (!SHA_PATTERN.test(String(candidateSha ?? ""))) {
    return { ok: false, reason: "ephemeral SQL evidence candidateSha is missing or invalid" };
  }
  try {
    const raw = execFileSync(
      "gh",
      ["run", "view", String(runId), "--repo", repository, "--json", "workflowName,headBranch,headSha,status,conclusion"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const run = JSON.parse(raw);
    if (run.workflowName !== EXPECTED_WORKFLOW) {
      return { ok: false, reason: "GitHub Actions run workflowName does not match canonical SQL proof" };
    }
    if (run.headBranch !== "main") {
      return { ok: false, reason: "GitHub Actions run did not execute on main" };
    }
    if (String(run.headSha ?? "").toLowerCase() !== candidateSha.toLowerCase()) {
      return { ok: false, reason: "GitHub Actions run headSha does not match evidence candidateSha" };
    }
    if (run.status !== "completed" || run.conclusion !== "success") {
      return { ok: false, reason: `GitHub Actions run is not a completed success (status=${String(run.status)}, conclusion=${String(run.conclusion)})` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `GitHub Actions provenance could not be verified: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function evaluateSupabasePostflight({ eventName, status, exitCode } = {}) {
  if (status === "ALIGNED" && exitCode === 0) {
    return { mode: "ALIGNED", pass: true, reason: "the linked migration queue is aligned" };
  }
  if ((eventName === "schedule" || eventName === "workflow_dispatch") && status === "READY_TO_APPLY" && exitCode === 0) {
    return { mode: "READ_ONLY_PENDING", pass: true, reason: `${eventName} is read-only; pending migrations are reported without application` };
  }
  if (exitCode !== 0) {
    return { ...blocked(`read-only convergence check returned exit code ${String(exitCode)} (status=${String(status ?? "MISSING")})`), pass: false };
  }
  return { ...blocked(`convergence status ${String(status ?? "MISSING")} is not valid for ${String(eventName ?? "unknown event")}`), pass: false };
}

export function validateEphemeralEvidence({
  evidence,
  expectedDigests,
  pendingIds = null,
  verifyGitHubRun = verifyGitHubActionsRun,
} = {}) {
  if (!expectedDigests || typeof expectedDigests !== "object" || Array.isArray(expectedDigests) || Object.keys(expectedDigests).length === 0) {
    return blocked("expected input digests are required for sensitive proof validation");
  }
  if (!evidence || typeof evidence !== "object") return blocked("ephemeral SQL evidence is missing");
  if (evidence.schemaVersion !== 2) return blocked("ephemeral SQL evidence schema version is not current");
  if (evidence.kind !== EXPECTED_PROOF_KIND) return blocked("ephemeral SQL evidence kind is invalid");
  if (String(evidence.workflow ?? "") !== EXPECTED_WORKFLOW) return blocked("ephemeral SQL evidence workflow is invalid");
  if (evidence.provenance !== "COMMITTED_SNAPSHOT" || evidence.outcome !== "PASS") {
    return blocked("ephemeral SQL evidence is not a passing committed-snapshot proof");
  }
  const gh = evidence.githubActions;
  if (!gh || typeof gh !== "object" || Array.isArray(gh)) {
    return blocked("ephemeral SQL evidence lacks GitHub Actions origin metadata");
  }
  if (gh.repository !== EXPECTED_REPOSITORY || gh.workflow !== EXPECTED_WORKFLOW || gh.ref !== EXPECTED_REF || !DIGITS_PATTERN.test(String(gh.runId ?? ""))) {
    return blocked("ephemeral SQL evidence GitHub Actions origin metadata is invalid");
  }
  const provenanceCheck = verifyGitHubRun({
    repository: gh.repository,
    workflow: gh.workflow,
    ref: gh.ref,
    runId: gh.runId,
    runAttempt: gh.runAttempt,
    candidateSha: evidence.candidateSha,
  });
  if (!provenanceCheck?.ok) {
    return blocked(provenanceCheck?.reason || "ephemeral SQL evidence GitHub Actions provenance verification failed");
  }
  const requiredStages = ["bootstrap", "dbReset", "migrations", "seed", "schemaSeedValidation", "sqlProofRunner"];
  if (!Array.isArray(evidence.workflowStages) || requiredStages.some((stage) => {
    const matching = evidence.workflowStages.filter((entry) => entry?.stage === stage);
    return matching.length !== 1 || matching[0].status !== "PASS";
  })) return blocked("ephemeral SQL evidence is missing a passing bootstrap, migration, seed, or schema-validation stage");
  if (!Array.isArray(evidence.records) || evidence.records.length === 0) return blocked("ephemeral SQL evidence has no proof records");
  if (evidence.records.some((record) => record?.status !== "INTEGRATION_PROOF" || record?.outcome !== "PASS")) {
    return blocked("ephemeral SQL evidence contains a failed or missing proof");
  }
  if (!Array.isArray(evidence.migrations)) return blocked("ephemeral SQL evidence has no exact migration hashes");
  const activeApprovals = Array.isArray(pendingIds)
    ? reviewedMigrationApprovals.filter((entry) => pendingIds.includes(entry.id))
    : reviewedMigrationApprovals.filter((entry) => Object.prototype.hasOwnProperty.call(expectedDigests, entry.path));
  for (const approval of activeApprovals) {
    const migration = evidence.migrations.find((entry) => entry?.id === approval.id && entry?.path === approval.path);
    if (migration?.contentSha256 !== approval.sha256) return blocked(`approved migration ${approval.id} hash does not match the reviewed content`);
    for (const requiredProof of approval.proofs) {
      const proof = evidence.records.find((record) => record?.path === requiredProof.path);
      if (!proof || proof.status !== "INTEGRATION_PROOF" || proof.outcome !== "PASS" || proof.contentSha256 !== requiredProof.sha256) {
        return blocked(`approved migration ${approval.id} lacks its exact passing proof for ${requiredProof.path}`);
      }
    }
  }
  for (const [targetPath, expectedSha256] of Object.entries(expectedDigests)) {
    if (!SHA256_PATTERN.test(String(expectedSha256 ?? ""))) {
      return blocked(`expected digest for ${targetPath} is missing or invalid`);
    }
    const normalizedExpected = String(expectedSha256).toLowerCase();
    const migration = evidence.migrations.find((entry) => entry?.path === targetPath);
    const record = evidence.records.find((entry) => entry?.path === targetPath);
    const actualSha256 = (migration?.contentSha256 ?? record?.contentSha256 ?? "").toLowerCase();
    if (!actualSha256 || actualSha256 !== normalizedExpected) {
      return blocked(`ephemeral SQL evidence digest mismatch for ${targetPath}`);
    }
    if (record && (record.status !== "INTEGRATION_PROOF" || record.outcome !== "PASS")) {
      return blocked(`ephemeral SQL evidence record for ${targetPath} did not pass`);
    }
  }
  return { mode: "VALID", valid: true, reason: "ephemeral SQL proof passed with verified GitHub Actions provenance and matching input digests" };
}
