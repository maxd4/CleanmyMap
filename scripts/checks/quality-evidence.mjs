#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const QUALITY_EVIDENCE_SCHEMA_VERSION = 1;
export const QUALITY_EVIDENCE_RELATIVE_ROOT = "artifacts/quality-evidence";
export const QUALITY_EVIDENCE_STATUSES = Object.freeze(["PASS", "PASS_WITH_GRACE", "FAIL", "SKIPPED_BY_SCOPE", "NOT_RUN"]);
const QUALITY_EVIDENCE_ACCEPTED_STATUSES = Object.freeze(["PASS", "PASS_WITH_GRACE"]);

function assertCandidateSha(candidateSha) {
  if (!/^[0-9a-f]{40}$/i.test(candidateSha ?? "")) {
    throw new Error(`Quality evidence requires a complete candidate SHA, received: ${candidateSha ?? "<missing>"}.`);
  }
}

function normalizeFileKey(fileKey) {
  const normalized = String(fileKey ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`Quality evidence file key is invalid: ${fileKey}.`);
  }
  return normalized;
}

export function resolveCandidateSha(repositoryRoot = process.cwd(), environment = process.env) {
  const configured = environment.CANDIDATE_SHA?.trim();
  if (configured) {
    assertCandidateSha(configured);
    return configured;
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  assertCandidateSha(head);
  return head;
}

export function resolveCandidateShaFromRef(repositoryRoot = process.cwd(), candidateRef = null, environment = process.env) {
  const configured = candidateRef?.trim();
  if (!configured) return resolveCandidateSha(repositoryRoot, environment);
  const resolved = execFileSync("git", ["rev-parse", configured], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  assertCandidateSha(resolved);
  return resolved;
}

function createQualityEvidence({
  gate,
  scope = null,
  candidateSha,
  candidateRef = null,
  status,
  metrics = {},
  findings = null,
  newFindings = null,
  resolvedFindings = null,
  historicalFindings = null,
  baseline = null,
  details = null,
}) {
  if (!gate || typeof gate !== "string") throw new Error("Quality evidence requires a gate name.");
  if (!QUALITY_EVIDENCE_STATUSES.includes(status)) throw new Error(`Quality evidence status is invalid: ${status}.`);
  assertCandidateSha(candidateSha);
  for (const [name, value] of Object.entries({ findings, newFindings, resolvedFindings, historicalFindings })) {
    if (value !== null && (!Number.isInteger(value) || value < 0)) throw new Error(`Quality evidence ${name} must be a non-negative integer or null.`);
  }
  return {
    schemaVersion: QUALITY_EVIDENCE_SCHEMA_VERSION,
    gate,
    ...(scope ? { scope } : {}),
    candidateSha,
    ...(candidateRef ? { candidateRef } : {}),
    executed: status !== "NOT_RUN" && status !== "SKIPPED_BY_SCOPE",
    status,
    metrics,
    findings,
    newFindings,
    resolvedFindings,
    historicalFindings,
    baseline,
    details,
  };
}

function qualityEvidencePath({ repositoryRoot = process.cwd(), evidenceRoot = QUALITY_EVIDENCE_RELATIVE_ROOT, fileKey }) {
  return path.resolve(repositoryRoot, evidenceRoot, `${normalizeFileKey(fileKey)}.json`);
}

export function writeQualityEvidence({ repositoryRoot = process.cwd(), evidenceRoot = process.env.QUALITY_EVIDENCE_ROOT ?? QUALITY_EVIDENCE_RELATIVE_ROOT, fileKey = null, ...input }) {
  const evidence = createQualityEvidence(input);
  const target = qualityEvidencePath({ repositoryRoot, evidenceRoot, fileKey: fileKey ?? `${input.gate}${input.scope ? `-${input.scope}` : ""}`.replaceAll("/", "-") });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(evidence)}\n`, "utf8");
  return target;
}

export function readQualityEvidence({ repositoryRoot = process.cwd(), evidenceRoot = process.env.QUALITY_EVIDENCE_ROOT ?? QUALITY_EVIDENCE_RELATIVE_ROOT, fileKey }) {
  const target = qualityEvidencePath({ repositoryRoot, evidenceRoot, fileKey });
  if (!fs.existsSync(target)) return null;
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return null;
  }
}

export function validateQualityEvidenceForGate({
  evidence,
  candidateSha,
  repositoryRoot = process.cwd(),
  gitRunner = (args, cwd) => execFileSync("git", args, { cwd, stdio: "ignore" }),
}) {
  const failures = [];
  try {
    assertCandidateSha(candidateSha);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return failures;
  }
  if (!evidence || typeof evidence !== "object") {
    return ["evidence is missing, malformed, or attached to another candidate"];
  }
  if (evidence.schemaVersion !== QUALITY_EVIDENCE_SCHEMA_VERSION) {
    failures.push(`evidence schema version is invalid: ${evidence.schemaVersion ?? "<missing>"}`);
  }
  if (evidence.candidateSha !== candidateSha || evidence.executed !== true) {
    failures.push("evidence is missing, malformed, or attached to another candidate");
  }
  if (!QUALITY_EVIDENCE_STATUSES.includes(evidence.status)) {
    failures.push(`evidence status is invalid: ${evidence.status ?? "<missing>"}`);
  } else if (!QUALITY_EVIDENCE_ACCEPTED_STATUSES.includes(evidence.status)) {
    failures.push(`ratchet status is ${evidence.status}`);
  }

  const sourceCommit = evidence.baseline?.sourceCommit;
  if (!/^[0-9a-f]{40}$/i.test(sourceCommit ?? "")) {
    failures.push("baseline sourceCommit is missing or malformed");
  } else {
    try {
      gitRunner(["cat-file", "-e", `${sourceCommit}^{commit}`], repositoryRoot);
      gitRunner(["merge-base", "--is-ancestor", sourceCommit, candidateSha], repositoryRoot);
    } catch {
      failures.push(`baseline ${sourceCommit} is not an ancestor of candidate ${candidateSha}`);
    }
  }
  return failures;
}
