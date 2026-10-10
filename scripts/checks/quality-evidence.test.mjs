import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildQualitySummary, collectQualityEvidence, validateQualityEvidence } from "../ci/write-quality-summary.mjs";
import { readQualityEvidence, writeQualityEvidence } from "./quality-evidence.mjs";

const PASS_SHA = "0123456789abcdef0123456789abcdef01234567";
const FAIL_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const SUMMARY_SCRIPT = path.join(REPOSITORY_ROOT, "scripts", "ci", "write-quality-summary.mjs");
const CURRENT_SHA = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPOSITORY_ROOT, encoding: "utf8" }).trim();
const QUALITY_GATES = ["dead-code", "complexity", "duplication-runtime", "duplication-tests", "duplication-fixtures-data", "cycles"];

function temporaryRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-quality-evidence-"));
}

function writeCompleteEvidence(repositoryRoot, { evidenceRoot = "artifacts/quality-evidence", candidateSha = CURRENT_SHA, status = "PASS", baselineSourceCommit = CURRENT_SHA, failingGate = null } = {}) {
  for (const gate of QUALITY_GATES) {
    writeQualityEvidence({
      repositoryRoot,
      evidenceRoot,
      fileKey: gate,
      gate,
      candidateSha,
      status: gate === failingGate ? "FAIL" : status,
      metrics: {},
      baseline: { sourceCommit: baselineSourceCommit },
    });
  }
}

function runSummary(root, { candidateSha = CURRENT_SHA, prepare = () => {} } = {}) {
  const evidenceRoot = path.join(root, "evidence");
  prepare(evidenceRoot);
  return spawnSync(process.execPath, [SUMMARY_SCRIPT], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      CANDIDATE_SHA: candidateSha,
      QUALITY_EVIDENCE_ROOT: evidenceRoot,
      GITHUB_STEP_SUMMARY: path.join(root, "summary.md"),
    },
  });
}

test("quality evidence preserves zero metrics, status, and candidate SHA", () => {
  const root = temporaryRepository();
  writeQualityEvidence({
    repositoryRoot: root,
    gate: "complexity",
    candidateSha: PASS_SHA,
    status: "PASS",
    metrics: { measuredFunctions: 0, violations: 0, baselineStale: 0 },
    newFindings: 0,
    baseline: { sourceCommit: PASS_SHA },
  });

  const evidence = readQualityEvidence({ repositoryRoot: root, fileKey: "complexity" });
  assert.equal(evidence.status, "PASS");
  assert.equal(evidence.candidateSha, PASS_SHA);
  assert.equal(evidence.metrics.violations, 0);
  assert.equal(evidence.newFindings, 0);
  assert.equal(evidence.executed, true);
});

test("a failing gate remains FAIL in the compact evidence", () => {
  const root = temporaryRepository();
  writeQualityEvidence({
    repositoryRoot: root,
    gate: "dead-code",
    candidateSha: FAIL_SHA,
    status: "FAIL",
    metrics: { currentFindings: 2, historicalActionable: 1 },
    newFindings: 1,
  });

  const evidence = readQualityEvidence({ repositoryRoot: root, fileKey: "dead-code" });
  assert.equal(evidence.status, "FAIL");
  const summary = buildQualitySummary({
    candidateSha: FAIL_SHA,
    evidenceByKey: { "dead-code": evidence },
  });
  assert.match(summary, /\| dead-code \| FAIL \|/);
  assert.match(summary, /\| dead-code \| FAIL \| current 2, historical 1 \| resolved — \| 1 \|/);
});

test("missing or candidate-mismatched evidence is reported as NOT_RUN", () => {
  const root = temporaryRepository();
  writeQualityEvidence({
    repositoryRoot: root,
    gate: "cycles",
    candidateSha: FAIL_SHA,
    status: "PASS",
    metrics: { currentCycles: 0 },
    newFindings: 0,
  });
  const evidence = collectQualityEvidence({ repositoryRoot: root, evidenceRoot: "artifacts/quality-evidence" });
  const summary = buildQualitySummary({ candidateSha: PASS_SHA, evidenceByKey: evidence });
  assert.match(summary, /\| cycles \| NOT_RUN \|/);
  assert.match(summary, /\| dead-code \| NOT_RUN \|/);
});

test("PASS_WITH_GRACE is an accepted quality result", () => {
  const evidenceByKey = Object.fromEntries(QUALITY_GATES.map((gate) => [gate, {
    schemaVersion: 1,
    gate,
    candidateSha: PASS_SHA,
    executed: true,
    status: "PASS_WITH_GRACE",
    baseline: { sourceCommit: PASS_SHA },
  }]));
  const failures = validateQualityEvidence({
    candidateSha: PASS_SHA,
    evidenceByKey,
    gitRunner: () => undefined,
  });
  assert.deepEqual(failures, []);
});

test("the summary command fails on a FAIL evidence", () => {
  const root = temporaryRepository();
  try {
    const result = runSummary(root, { prepare: (evidenceRoot) => writeCompleteEvidence(REPOSITORY_ROOT, { evidenceRoot, failingGate: "cycles" }) });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cycles: ratchet status is FAIL/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the summary command fails on an obsolete baseline", () => {
  const root = temporaryRepository();
  try {
    const result = runSummary(root, { prepare: (evidenceRoot) => writeCompleteEvidence(REPOSITORY_ROOT, { evidenceRoot, baselineSourceCommit: "0".repeat(40) }) });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /baseline .* is not an ancestor/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the summary command fails when evidence is missing", () => {
  const root = temporaryRepository();
  try {
    const result = runSummary(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /evidence is missing/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the summary command fails when evidence belongs to another candidate", () => {
  const root = temporaryRepository();
  try {
    const result = runSummary(root, {
      prepare: (evidenceRoot) => writeCompleteEvidence(REPOSITORY_ROOT, { evidenceRoot, candidateSha: FAIL_SHA }),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /evidence is missing, malformed, or attached to another candidate/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
