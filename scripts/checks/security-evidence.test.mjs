import assert from "node:assert/strict";
import test from "node:test";

import { buildSecuritySummary } from "../ci/write-security-summary.mjs";

const CANDIDATE_SHA = "0123456789abcdef0123456789abcdef01234567";

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
