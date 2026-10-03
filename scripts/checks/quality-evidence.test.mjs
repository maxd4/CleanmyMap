import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildQualitySummary, collectQualityEvidence } from "../ci/write-quality-summary.mjs";
import { readQualityEvidence, writeQualityEvidence } from "./quality-evidence.mjs";

const PASS_SHA = "0123456789abcdef0123456789abcdef01234567";
const FAIL_SHA = "fedcba9876543210fedcba9876543210fedcba98";

function temporaryRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-quality-evidence-"));
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
