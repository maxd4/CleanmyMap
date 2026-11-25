#!/usr/bin/env node

import { reviewedMigrationApprovals } from "./supabase-migration-sql.mjs";

const EXPECTED_WORKFLOW = "supabase-sql-proof-ephemeral";
const EXPECTED_PROOF_KIND = "cleanmymap-supabase-sql-evidence";
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

function blocked(reason) {
  return Object.freeze({ mode: "BLOCKED", valid: false, reason });
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

export function validateEphemeralEvidence({ evidence, expectedDigests } = {}) {
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
  const requiredStages = ["bootstrap", "dbReset", "migrations", "seed", "schemaSeedValidation", "sqlProofRunner"];
  if (!Array.isArray(evidence.workflowStages) || requiredStages.some((stage) => {
    const matching = evidence.workflowStages.filter((entry) => entry?.stage === stage);
    return matching.length !== 1 || matching[0].status !== "PASS";
  })) return blocked("ephemeral SQL evidence is missing a passing bootstrap, migration, seed, or schema-validation stage");
  if (!Array.isArray(evidence.records) || evidence.records.length === 0) return blocked("ephemeral SQL evidence has no proof records");
  if (evidence.records.some((record) => record?.status !== "INTEGRATION_PROOF" || record?.outcome !== "PASS")) {
    return blocked("ephemeral SQL evidence contains a failed or missing proof");
  }
  const gamification = evidence.records.find((record) => record?.path === "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql");
  if (gamification?.expectedAssertions !== 56) return blocked("gamification pgTAP proof is not 56 assertions");
  if (!Array.isArray(evidence.migrations)) return blocked("ephemeral SQL evidence has no exact migration hashes");
  for (const approval of reviewedMigrationApprovals) {
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
  return { mode: "VALID", valid: true, reason: "ephemeral SQL proof passed with matching input digests" };
}
