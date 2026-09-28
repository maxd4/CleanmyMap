import assert from "node:assert/strict";
import test from "node:test";

import {
  compareDuplicationMetrics,
  computeDuplicationPolicyFingerprint,
  DUPLICATION_GRACE,
  DUPLICATION_MIN_LINES,
  DUPLICATION_MIN_TOKENS,
  DUPLICATION_NEW_CLONE_FINGERPRINTS_BLOCKING,
  DUPLICATION_POLICY_FINGERPRINT,
  DUPLICATION_POLICY_VERSION,
  DUPLICATION_SCOPES,
  DUPLICATION_TOOL,
  DUPLICATION_TOOL_VERSION,
  readJscpdMetrics,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";
import { formatDuplicationReport } from "./check-duplication.mjs";

const BASELINE = {
  schemaVersion: 2,
  sourceCommit: "0edc4931d06764998018372b4df7a2b0ca2349ce",
  tool: DUPLICATION_TOOL,
  toolVersion: DUPLICATION_TOOL_VERSION,
  minLines: DUPLICATION_MIN_LINES,
  minTokens: DUPLICATION_MIN_TOKENS,
  policyFingerprint: DUPLICATION_POLICY_FINGERPRINT,
  scopes: {
    runtime: { files: 10, lines: 1000, tokens: 10000, clones: 2, fingerprints: 2, duplicatedLines: 20, duplicatedTokens: 200, percentage: 2, percentageTokens: 2 },
    tests: { files: 10, lines: 10000, tokens: 100000, clones: 3, fingerprints: 3, duplicatedLines: 300, duplicatedTokens: 3000, percentage: 3, percentageTokens: 3 },
    "fixtures/data": { files: 1, lines: 100, tokens: 1000, clones: 0, fingerprints: 0, duplicatedLines: 0, duplicatedTokens: 0, percentage: 0, percentageTokens: 0 },
  },
};

test("stable duplication baseline passes and a lower percentage is accepted", () => {
  validateDuplicationMetricsBaseline(BASELINE);
  assert.equal(
    compareDuplicationMetrics({ clones: 2, lines: 1000, tokens: 10000, duplicatedLines: 20, duplicatedTokens: 200 }, BASELINE.scopes.runtime).status,
    "PASS",
  );
});

test("current policy fingerprint is persisted and accepted", () => {
  assert.equal(validateDuplicationMetricsBaseline({ ...BASELINE }).policyFingerprint, DUPLICATION_POLICY_FINGERPRINT);
});

test("policy fingerprint mismatch makes the metrics baseline stale", () => {
  assert.throws(() => validateDuplicationMetricsBaseline({ ...BASELINE, policyFingerprint: "0".repeat(64) }), /policy fingerprint/);
});

test("semantic policy changes produce a different fingerprint", () => {
  const descriptor = {
    version: DUPLICATION_POLICY_VERSION,
    tool: DUPLICATION_TOOL,
    toolVersion: DUPLICATION_TOOL_VERSION,
    minLines: DUPLICATION_MIN_LINES,
    minTokens: DUPLICATION_MIN_TOKENS,
    newCloneFingerprintsBlocking: DUPLICATION_NEW_CLONE_FINGERPRINTS_BLOCKING,
    scopes: DUPLICATION_SCOPES,
    grace: DUPLICATION_GRACE,
  };
  assert.notEqual(
    computeDuplicationPolicyFingerprint({ ...descriptor, minLines: descriptor.minLines + 1 }),
    DUPLICATION_POLICY_FINGERPRINT,
  );
  const changedRuntime = {
    ...DUPLICATION_SCOPES.runtime,
    ignores: [...DUPLICATION_SCOPES.runtime.ignores, "**/policy-test-exclusion/**"],
  };
  assert.notEqual(
    computeDuplicationPolicyFingerprint({ ...descriptor, scopes: { ...DUPLICATION_SCOPES, runtime: changedRuntime } }),
    DUPLICATION_POLICY_FINGERPRINT,
  );
});

test("missing or malformed policy fingerprints fail explicitly", () => {
  assert.throws(() => validateDuplicationMetricsBaseline({ ...BASELINE, policyFingerprint: undefined }), /policy fingerprint/);
  assert.throws(() => validateDuplicationMetricsBaseline({ ...BASELINE, policyFingerprint: "not-a-sha256" }), /policy fingerprint/);
});

test("new blocks and percentage increases fail the duplication ratchet", () => {
  const comparison = compareDuplicationMetrics(
    { clones: 3, lines: 1000, tokens: 10000, duplicatedLines: 101, duplicatedTokens: 1001 },
    { ...BASELINE.scopes.runtime, lines: 1000, tokens: 10000, duplicatedLines: 20, duplicatedTokens: 200 },
    "fixtures/data",
  );
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.includes("duplicatedLines")));
  assert.ok(comparison.failures.some((failure) => failure.includes("duplicatedTokens")));
});

test("a new clone fingerprint fails the runtime and tests ratchets", () => {
  const comparison = compareDuplicationMetrics(
    { clones: 3, lines: 1000, tokens: 10000, duplicatedLines: 20, duplicatedTokens: 200, newClones: 1 },
    BASELINE.scopes.tests,
    "tests",
  );
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.includes("new clone fingerprints")));
  assert.equal(
    compareDuplicationMetrics(
      { clones: 3, lines: 1000, tokens: 10000, duplicatedLines: 20, duplicatedTokens: 200, newClones: 1 },
      BASELINE.scopes.runtime,
      "runtime",
    ).status,
    "FAIL",
  );
});

test("a small runtime increase stays PASS_WITH_GRACE", () => {
  const baseline = { ...BASELINE.scopes.runtime, lines: 10000, tokens: 100000, duplicatedLines: 200, duplicatedTokens: 2000 };
  const comparison = compareDuplicationMetrics(
    { ...baseline, duplicatedLines: 201, duplicatedTokens: 2001 },
    baseline,
    "runtime",
  );
  assert.equal(comparison.status, "PASS_WITH_GRACE");
  assert.deepEqual(DUPLICATION_GRACE.runtime, {
    maxLinePercentagePointIncrease: 0.05,
    maxTokenPercentagePointIncrease: 0.05,
    maxDuplicatedLinesIncrease: 80,
    maxDuplicatedTokensIncrease: 800,
  });
});

test("a runtime increase beyond grace fails", () => {
  const baseline = { ...BASELINE.scopes.runtime, lines: 10000, tokens: 100000, duplicatedLines: 200, duplicatedTokens: 2000 };
  const comparison = compareDuplicationMetrics(
    { ...baseline, duplicatedLines: 281, duplicatedTokens: 2801 },
    baseline,
    "runtime",
  );
  assert.equal(comparison.status, "FAIL");
});

test("a small tests increase stays PASS_WITH_GRACE", () => {
  const baseline = BASELINE.scopes.tests;
  const comparison = compareDuplicationMetrics(
    { ...baseline, duplicatedLines: baseline.duplicatedLines + 1, duplicatedTokens: baseline.duplicatedTokens + 1 },
    baseline,
    "tests",
  );
  assert.equal(comparison.status, "PASS_WITH_GRACE");
});

test("a tests increase beyond grace fails", () => {
  const baseline = BASELINE.scopes.tests;
  const comparison = compareDuplicationMetrics(
    { ...baseline, duplicatedLines: baseline.duplicatedLines + 151, duplicatedTokens: baseline.duplicatedTokens + 1501 },
    baseline,
    "tests",
  );
  assert.equal(comparison.status, "FAIL");
});

test("fixtures/data remains strict against its zero baseline", () => {
  const comparison = compareDuplicationMetrics(
    { ...BASELINE.scopes["fixtures/data"], duplicatedLines: 1, duplicatedTokens: 1, newClones: 1 },
    BASELINE.scopes["fixtures/data"],
    "fixtures/data",
  );
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.includes("new clone fingerprints")));
});

test("duplication reporting exposes status, fingerprints, and deltas by scope", () => {
  const output = formatDuplicationReport({
    results: [{
      scopeName: "runtime",
      metrics: {
        clones: 2,
        duplicatedLines: 21,
        lines: 1000,
        percentage: 2.1,
        duplicatedTokens: 201,
        tokens: 10000,
        newClones: 1,
      },
      comparison: {
        status: "PASS_WITH_GRACE",
        failures: [],
        deltas: {
          duplicatedLines: 1,
          duplicatedTokens: 1,
          linePercentagePoints: 0.1,
          tokenPercentagePoints: 0.01,
        },
      },
    }],
  });
  assert.match(output, /runtime:/);
  assert.match(output, /DUPLICATION_STATUS: PASS_WITH_GRACE/);
  assert.match(output, /NEW_CLONE_FINGERPRINTS: 1/);
  assert.match(output, /DUPLICATED_LINES_DELTA: 1/);
  assert.match(output, /TOKEN_PERCENTAGE_POINT_DELTA: 0\.010000/);
});

test("malformed or stale duplication baselines fail explicitly", () => {
  assert.throws(() => validateDuplicationMetricsBaseline({ ...BASELINE, toolVersion: "5.2.0" }), /tool version/);
  assert.throws(() => validateDuplicationMetricsBaseline({ ...BASELINE, scopes: { runtime: BASELINE.scopes.runtime } }), /missing tests/);
});

test("jscpd report metrics are read from the canonical total", () => {
  assert.deepEqual(readJscpdMetrics({ statistics: { total: { sources: 2, lines: 100, tokens: 200, clones: 1, duplicatedLines: 5, duplicatedTokens: 10, percentage: 5, percentageTokens: 5, newClones: 0 } } }), {
    files: 2, lines: 100, tokens: 200, clones: 1, duplicatedLines: 5, duplicatedTokens: 10, percentage: 5, percentageTokens: 5, newClones: 0,
  });
});
