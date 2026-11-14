#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const EXPECTED_WORKFLOW = "e2e-supabase-ephemeral";
const EXPECTED_PROOF_KIND = "cleanmymap-supabase-sql-evidence";

function requireSha(value, label) {
  const sha = String(value ?? "").trim();
  if (!SHA_PATTERN.test(sha)) throw new Error(`${label} is missing or invalid.`);
  return sha.toLowerCase();
}

function blocked(reason) {
  return Object.freeze({ mode: "BLOCKED", apply: false, reason });
}

export function validateEphemeralEvidence({ evidence, candidateSha }) {
  const candidate = requireSha(candidateSha, "candidate SHA");
  if (!evidence || typeof evidence !== "object") return blocked("ephemeral SQL evidence is missing");
  if (evidence.kind !== EXPECTED_PROOF_KIND) return blocked("ephemeral SQL evidence kind is invalid");
  if (String(evidence.workflow ?? "") !== EXPECTED_WORKFLOW) return blocked("ephemeral SQL evidence workflow is invalid");
  if (String(evidence.candidateSha ?? "").toLowerCase() !== candidate || String(evidence.headSha ?? "").toLowerCase() !== candidate) {
    return blocked("ephemeral SQL evidence does not match the tested SHA");
  }
  if (evidence.provenance !== "COMMITTED_SNAPSHOT" || evidence.outcome !== "PASS") {
    return blocked("ephemeral SQL evidence is not a passing committed-snapshot proof");
  }
  if (!Array.isArray(evidence.records) || evidence.records.length === 0) return blocked("ephemeral SQL evidence has no proof records");
  if (evidence.records.some((record) => record?.status !== "INTEGRATION_PROOF" || record?.outcome !== "PASS")) {
    return blocked("ephemeral SQL evidence contains a failed or missing proof");
  }
  const gamification = evidence.records.find((record) => record?.path === "apps/web/supabase/tests/gamification-progression-boundary.pgtap.sql");
  if (gamification?.expectedAssertions !== 56) return blocked("gamification pgTAP proof is not 56 assertions");
  return { mode: "APPLY", apply: true, reason: "ephemeral SQL proof passed for the exact main SHA" };
}

export function evaluateSupabaseConvergenceGate({
  eventName,
  repository,
  sourceRepository,
  workflowName,
  headBranch,
  conclusion,
  candidateSha,
  remoteHeadSha,
  evidence,
} = {}) {
  if (eventName === "schedule" || eventName === "workflow_dispatch") {
    return { mode: "READ_ONLY", apply: false, reason: `${eventName} is read-only and cannot apply migrations` };
  }
  if (eventName !== "workflow_run") return blocked("unsupported convergence trigger");
  if (workflowName !== EXPECTED_WORKFLOW) return blocked("source workflow is not the canonical ephemeral Supabase workflow");
  if (repository !== sourceRepository || repository !== "maxd4/CleanmyMap") return blocked("source workflow repository is not the canonical repository");
  if (headBranch !== "main") return blocked("source workflow did not test main");
  if (conclusion !== "success") return blocked("source workflow did not succeed");
  const candidate = requireSha(candidateSha, "candidate SHA");
  if (requireSha(remoteHeadSha, "remote main SHA") !== candidate) return blocked("remote main advanced beyond the tested SHA");
  return validateEphemeralEvidence({ evidence, candidateSha: candidate });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const evidencePath = process.env.CMM_SUPABASE_EVIDENCE_PATH;
  let evidence = null;
  if (evidencePath && fs.existsSync(evidencePath)) {
    try {
      evidence = readJson(evidencePath);
    } catch {
      evidence = null;
    }
  }
  const result = evaluateSupabaseConvergenceGate({
    eventName: process.env.GITHUB_EVENT_NAME,
    repository: process.env.GITHUB_REPOSITORY,
    sourceRepository: process.env.CMM_SUPABASE_SOURCE_REPOSITORY,
    workflowName: process.env.CMM_SUPABASE_SOURCE_WORKFLOW,
    headBranch: process.env.CMM_SUPABASE_SOURCE_BRANCH,
    conclusion: process.env.CMM_SUPABASE_SOURCE_CONCLUSION,
    candidateSha: process.env.CMM_SUPABASE_CANDIDATE_SHA,
    remoteHeadSha: process.env.CMM_SUPABASE_REMOTE_HEAD_SHA,
    evidence,
  });
  console.log(`SUPABASE_CONVERGENCE_GATE: ${result.mode} ${result.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\napply=${result.apply ? "true" : "false"}\n`);
  }
  if (result.mode === "BLOCKED") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
