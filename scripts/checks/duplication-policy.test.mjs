import assert from "node:assert/strict";
import test from "node:test";

import {
  compareDuplicationMetrics,
  computeDuplicationPolicyFingerprint,
  DUPLICATION_MIN_LINES,
  DUPLICATION_MIN_TOKENS,
  DUPLICATION_POLICY_FINGERPRINT,
  DUPLICATION_POLICY_VERSION,
  DUPLICATION_SCOPES,
  DUPLICATION_TOOL,
  DUPLICATION_TOOL_VERSION,
  readJscpdMetrics,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";

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
    tests: { files: 10, lines: 1000, tokens: 10000, clones: 3, fingerprints: 3, duplicatedLines: 30, duplicatedTokens: 300, percentage: 3, percentageTokens: 3 },
    "fixtures/data": { files: 1, lines: 100, tokens: 1000, clones: 0, fingerprints: 0, duplicatedLines: 0, duplicatedTokens: 0, percentage: 0, percentageTokens: 0 },
  },
};

test("stable duplication baseline passes and a lower percentage is accepted", () => {
  validateDuplicationMetricsBaseline(BASELINE);
  assert.deepEqual(compareDuplicationMetrics({ clones: 2, lines: 1100, tokens: 11000, duplicatedLines: 20, duplicatedTokens: 200 }, BASELINE.scopes.runtime), []);
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
    scopes: DUPLICATION_SCOPES,
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
  const failures = compareDuplicationMetrics({ clones: 3, lines: 1000, tokens: 10000, duplicatedLines: 21, duplicatedTokens: 301 }, BASELINE.scopes.runtime);
  assert.ok(failures.includes("clones increased (3 > 2)"));
  assert.ok(failures.includes("duplicated line percentage increased"));
  assert.ok(failures.includes("duplicated token percentage increased"));
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
