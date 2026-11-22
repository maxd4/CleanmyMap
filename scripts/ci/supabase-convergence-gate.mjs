#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reviewedMigrationApprovals } from "./supabase-migration-sql.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const EXPECTED_WORKFLOW = "supabase-sql-proof-ephemeral";
const EXPECTED_PROOF_KIND = "cleanmymap-supabase-sql-evidence";

function requireSha(value, label) {
  const sha = String(value ?? "").trim();
  if (!SHA_PATTERN.test(sha)) throw new Error(`${label} is missing or invalid.`);
  return sha.toLowerCase();
}

function blocked(reason) {
  return Object.freeze({ mode: "BLOCKED", apply: false, reason });
}

export function evaluateSupabasePostflight({ eventName, status, exitCode } = {}) {
  if (exitCode !== 0) return { ...blocked("postflight preflight returned a non-zero exit code"), pass: false };
  if (status === "ALIGNED") return { mode: "ALIGNED", pass: true, reason: "the linked migration queue is aligned" };
  if ((eventName === "schedule" || eventName === "workflow_dispatch") && status === "READY_TO_APPLY") {
    return { mode: "READ_ONLY_PENDING", pass: true, reason: `${eventName} is read-only; pending migrations are reported without application` };
  }
  return { ...blocked(`postflight status ${String(status ?? "MISSING")} is not valid for ${String(eventName ?? "unknown event")}`), pass: false };
}

export function evaluateAutomaticPreflight({ eventName, status, exitCode } = {}) {
  if (exitCode !== 0) return { ...blocked("read-only preflight returned a non-zero exit code"), pass: false };
  if (eventName !== "workflow_run") {
    return { mode: "READ_ONLY", apply: false, pass: true, reason: `${String(eventName)} cannot apply migrations` };
  }
  if (status === "READY_TO_APPLY") {
    return { mode: "READY_TO_APPLY", apply: true, pass: true, reason: "complete canonical queue passed the preflight" };
  }
  if (status === "ALIGNED") {
    return { mode: "ALIGNED", apply: false, pass: true, reason: "the linked migration queue is already aligned" };
  }
  return { ...blocked(`preflight status ${String(status ?? "MISSING")} does not authorize application`), pass: false };
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
  return { mode: "APPLY", apply: true, reason: "ephemeral SQL proof passed for the exact main SHA" };
}

export function evaluateSupabaseConvergenceGate({
  eventName,
  repository,
  sourceRepository,
  sourceHeadRepository,
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
  if (workflowName !== EXPECTED_WORKFLOW) return blocked("source workflow is not the canonical ephemeral SQL proof workflow");
  if (repository !== "maxd4/CleanmyMap" || sourceRepository !== repository || sourceHeadRepository !== repository) {
    return blocked("source workflow repository is not the canonical repository");
  }
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
  if (process.argv.includes("--preflight")) {
    const result = evaluateAutomaticPreflight({
      eventName: process.env.GITHUB_EVENT_NAME,
      status: process.env.CMM_SUPABASE_PREFLIGHT_STATUS,
      exitCode: Number.parseInt(process.env.CMM_SUPABASE_PREFLIGHT_EXIT_CODE ?? "", 10),
    });
    console.log(`SUPABASE_PREFLIGHT_GATE: ${result.mode} ${result.reason}`);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `preflight_mode=${result.mode}\napply=${result.apply ? "true" : "false"}\n`);
    }
    if (!result.pass) process.exitCode = 1;
    return;
  }
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
    sourceHeadRepository: process.env.CMM_SUPABASE_SOURCE_HEAD_REPOSITORY,
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
