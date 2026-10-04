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
  readJscpdFingerprints,
  readJscpdMetrics,
  readJscpdOccurrences,
  validateDuplicationJustificationsRegistry,
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

const NATIVE_BASELINES = {
  runtime: { version: 1, fingerprints: { "a1b2c3d4e5f60718": 1 } },
  tests: { version: 1, fingerprints: { "b1c2d3e4f5061728": 1, "c1d2e3f405162738": 1 } },
  "fixtures/data": { version: 1, fingerprints: {} },
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

test("SARIF fingerprints use the native jscpd partial fingerprint", () => {
  assert.deepEqual(
    readJscpdFingerprints({
      runs: [{ results: [
        { partialFingerprints: { "jscpdCloneHash/v1": "a1b2c3d4e5f60718" } },
        { partialFingerprints: { "jscpdCloneHash/v1": "a1b2c3d4e5f60718" } },
      ] }],
    }),
    new Set(["a1b2c3d4e5f60718"]),
  );
});

test("jscpd JSON and SARIF project CURRENT clone occurrences with scope and fingerprint", () => {
  assert.deepEqual(
    readJscpdOccurrences({
      duplicates: [{
        firstFile: { name: "apps\\web\\src\\first.ts", start: 10, end: 14 },
        secondFile: { name: "apps/web/src/second.ts", start: 31, end: 35 },
      }],
    }, {
      runs: [{ results: [{
        partialFingerprints: { "jscpdCloneHash/v1": "a1b2c3d4e5f60718" },
      }] }],
    }, "runtime"),
    [{
      scope: "runtime",
      fingerprint: "a1b2c3d4e5f60718",
      occurrenceA: { path: "apps/web/src/first.ts", startLine: 10, endLine: 14 },
      occurrenceB: { path: "apps/web/src/second.ts", startLine: 31, endLine: 35 },
    }],
  );
});

test("occurrence projection rejects JSON/SARIF clone count drift", () => {
  assert.throws(() => readJscpdOccurrences({ duplicates: [] }, { runs: [{ results: [{ partialFingerprints: { "jscpdCloneHash/v1": "a1b2c3d4e5f60718" } }] }] }, "runtime"), /occurrence projection mismatch/);
});

test("a valid KEEP_INTENTIONAL registry entry targets a current native fingerprint", () => {
  const result = validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "tests",
      fingerprint: "b1c2d3e4f5061728",
      classification: "KEEP_INTENTIONAL",
      reason: "Independent security boundary suites.",
      evidence: "app/server-boundary.test.ts and lib/client-boundary.test.ts",
      reviewedRef: "21c83ff399cb812c1dba18b1f19411b5fc7833e4",
    }],
  }, {
    nativeBaselines: NATIVE_BASELINES,
    currentFingerprintsByScope: { tests: new Set(["b1c2d3e4f5061728"]) },
  });
  assert.deepEqual(result.counts, { runtime: 0, tests: 1, "fixtures/data": 0 });
  assert.equal(result.keepIntentional, 1);
  assert.equal(result.noActionNoise, 0);
});

test("a valid NO_ACTION_NOISE registry entry is durable and classified separately", () => {
  const result = validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "runtime",
      fingerprint: "a1b2c3d4e5f60718",
      classification: "NO_ACTION_NOISE",
      reason: "The detector matches a short textual pattern without a shared architectural invariant.",
      evidence: "apps/web/src/first.ts:10-14 and apps/web/src/second.ts:31-35",
      reviewedRef: "21c83ff399cb812c1dba18b1f19411b5fc7833e4",
    }],
  }, {
    nativeBaselines: NATIVE_BASELINES,
    currentFingerprintsByScope: { runtime: new Set(["a1b2c3d4e5f60718"]) },
    currentOccurrencesByScope: { runtime: [{
      fingerprint: "a1b2c3d4e5f60718",
      occurrenceA: { path: "apps/web/src/first.ts", startLine: 10, endLine: 14 },
      occurrenceB: { path: "apps/web/src/second.ts", startLine: 31, endLine: 35 },
    }] },
  });
  assert.equal(result.keepIntentional, 0);
  assert.equal(result.noActionNoise, 1);
  assert.deepEqual(result.stale, []);
});

test("an unknown native fingerprint cannot be justified", () => {
  assert.throws(() => validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "runtime",
      fingerprint: "d1e2f30415263748",
      classification: "KEEP_INTENTIONAL",
      reason: "Not a real native clone.",
      evidence: "synthetic test",
      reviewedRef: "21c83ff399cb812c1dba18b1f19411b5fc7833e4",
    }],
  }, { nativeBaselines: NATIVE_BASELINES }), /unknown native fingerprint/);
});

test("malformed justification fields fail explicitly", () => {
  assert.throws(() => validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "tests",
      fingerprint: "b1c2d3e4f5061728",
      classification: "DEFER_DIFFERENT_SEMANTICS",
      reason: "",
      evidence: "",
      reviewedRef: "short",
    }],
  }, { nativeBaselines: NATIVE_BASELINES }), /must use KEEP_INTENTIONAL or NO_ACTION_NOISE/);
});

test("a disappeared justified clone is reported as STALE_KEEP_INTENTIONAL", () => {
  const result = validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "tests",
      fingerprint: "c1d2e3f405162738",
      classification: "KEEP_INTENTIONAL",
      reason: "Independent boundary suite.",
      evidence: "two current test suites",
      reviewedRef: "21c83ff399cb812c1dba18b1f19411b5fc7833e4",
    }],
  }, {
    nativeBaselines: NATIVE_BASELINES,
    currentFingerprintsByScope: { tests: new Set() },
  });
  assert.deepEqual(result.staleKeepIntentional, ["tests:c1d2e3f405162738"]);
  assert.deepEqual(result.staleNoActionNoise, []);
  assert.deepEqual(result.stale, ["tests:c1d2e3f405162738"]);
});

test("current occurrence evidence is required to be verifiable", () => {
  assert.throws(() => validateDuplicationJustificationsRegistry({
    schemaVersion: 1,
    justifications: [{
      scope: "runtime",
      fingerprint: "a1b2c3d4e5f60718",
      classification: "KEEP_INTENTIONAL",
      reason: "Independent proof.",
      evidence: "apps/web/src/other.ts:10-13 and apps/web/src/second.ts:31-35",
      reviewedRef: "21c83ff399cb812c1dba18b1f19411b5fc7833e4",
    }],
  }, {
    nativeBaselines: NATIVE_BASELINES,
    currentFingerprintsByScope: { runtime: new Set(["a1b2c3d4e5f60718"]) },
    currentOccurrencesByScope: { runtime: [{
      fingerprint: "a1b2c3d4e5f60718",
      occurrenceA: { path: "apps/web/src/first.ts", startLine: 10, endLine: 14 },
      occurrenceB: { path: "apps/web/src/second.ts", startLine: 31, endLine: 35 },
    }] },
  }), /CURRENT occurrence pair/);
});

test("a new fingerprint remains blocking independently of the KEEP registry", () => {
  const comparison = compareDuplicationMetrics(
    { clones: 3, lines: 1000, tokens: 10000, duplicatedLines: 20, duplicatedTokens: 200, newClones: 1 },
    BASELINE.scopes.runtime,
    "runtime",
  );
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.includes("new clone fingerprints")));
});
