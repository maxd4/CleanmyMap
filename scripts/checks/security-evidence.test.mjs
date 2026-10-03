import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSecuritySummary, collectSecurityEvidence } from "../ci/write-security-summary.mjs";
import { readQualityEvidence, writeQualityEvidence } from "./quality-evidence.mjs";

const CANDIDATE_SHA = "0123456789abcdef0123456789abcdef01234567";

function temporaryRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-security-evidence-"));
}

test("SKIPPED_BY_SCOPE is distinct from PASS and keeps dependency scope explicit", () => {
  const root = temporaryRepository();
  writeQualityEvidence({
    repositoryRoot: root,
    evidenceRoot: "security-evidence",
    fileKey: "dependency-advisory",
    gate: "dependencies",
    candidateSha: CANDIDATE_SHA,
    status: "SKIPPED_BY_SCOPE",
    metrics: { dependencyGraphChanged: false },
    details: { reason: "dependency graph unchanged" },
  });
  writeQualityEvidence({
    repositoryRoot: root,
    evidenceRoot: "security-evidence",
    fileKey: "secret-audit",
    gate: "secrets",
    candidateSha: CANDIDATE_SHA,
    status: "PASS",
    findings: 0,
  });

  const evidence = collectSecurityEvidence({
    repositoryRoot: root,
    evidenceRoot: "security-evidence",
  });
  const summary = buildSecuritySummary({ candidateSha: CANDIDATE_SHA, evidenceByKey: evidence });
  assert.match(summary, /\| Secrets \| PASS \| 0 finding\(s\) \|/);
  assert.match(summary, /\| Dependencies \| SKIPPED_BY_SCOPE \| dependency graph unchanged \|/);
  assert.notEqual(readQualityEvidence({ repositoryRoot: root, evidenceRoot: "security-evidence", fileKey: "dependency-advisory" }).executed, true);
});

test("security summary exposes failures without rendering sensitive evidence fields", () => {
  const summary = buildSecuritySummary({
    candidateSha: CANDIDATE_SHA,
    evidenceByKey: {
      "semgrep-architectural": {
        schemaVersion: 1,
        candidateSha: CANDIDATE_SHA,
        status: "FAIL",
        executed: true,
        findings: 2,
        metrics: { blockingFindings: 2 },
        details: { excerpt: "sk_test_sensitive_value_must_not_be_rendered" },
      },
    },
    gateKeys: ["semgrep-architectural"],
  });
  assert.match(summary, /\| Semgrep architectural \| FAIL \| 2 blocking finding\(s\) \|/);
  assert.doesNotMatch(summary, /sk_test_sensitive_value/);
});
test("candidate mismatch is NOT_RUN rather than an inferred PASS", () => {
  const summary = buildSecuritySummary({
    candidateSha: CANDIDATE_SHA,
    evidenceByKey: {
      secrets: {
        schemaVersion: 1,
        candidateSha: "fedcba9876543210fedcba9876543210fedcba98",
        status: "PASS",
        executed: true,
        findings: 0,
        metrics: {},
      },
    },
    gateKeys: ["secrets"],
  });
  assert.match(summary, /\| Secrets \| NOT_RUN \| — \|/);
});

// End of security evidence contract tests.
