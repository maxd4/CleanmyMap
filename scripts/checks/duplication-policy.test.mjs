import assert from "node:assert/strict";
import test from "node:test";

import {
  compareDuplicationMetrics,
  readJscpdMetrics,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";

const BASELINE = {
  schemaVersion: 1,
  sourceCommit: "0edc4931d06764998018372b4df7a2b0ca2349ce",
  tool: "jscpd",
  toolVersion: "5.3.0",
  minLines: 5,
  minTokens: 50,
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
