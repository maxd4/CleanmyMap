import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareDeadCodeFindings,
  createDeadCodeBaseline,
  findingKey,
  normalizeKnipReport,
  validateDeadCodeBaseline,
} from "./dead-code-policy.mjs";

const sourceCommit = "89982c0cafa6b5379bee55852458b3e5308f8106";

function report(...entries) {
  return { issues: entries.map(({ file, ...issues }) => ({ file, ...issues })) };
}

function baselineFor(input) {
  return createDeadCodeBaseline({ report: input, sourceCommit });
}

test("normalizes Knip findings without line/column noise", () => {
  const current = normalizeKnipReport(report({
    file: "scripts/check.mjs",
    exports: [{ name: "helper", kind: "function", line: 10, col: 1 }],
  }));
  const shifted = normalizeKnipReport(report({
    file: "./scripts\\check.mjs",
    exports: [{ name: "helper", kind: "function", line: 99, col: 27 }],
  }));
  assert.equal(findingKey(current[0]), findingKey(shifted[0]));
});

test("historical findings are tolerated and resolved findings are reported as improvement", () => {
  const original = report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
    exports: [{ name: "oldHelper", kind: "function" }],
  });
  const baseline = baselineFor(original);
  const comparison = compareDeadCodeFindings(normalizeKnipReport(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  })), baseline);
  assert.deepEqual(comparison.newFindings, []);
  assert.equal(comparison.resolvedFindings.length, 1);
});

test("a new finding is a blocking ratchet violation", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  }));
  const comparison = compareDeadCodeFindings(normalizeKnipReport(report(
    { file: "scripts/check.mjs", files: [{ name: "scripts/check.mjs" }] },
    { file: "scripts/new-check.mjs", files: [{ name: "scripts/new-check.mjs" }] },
  )), baseline);
  assert.equal(comparison.newFindings.length, 1);
  assert.equal(comparison.resolvedFindings.length, 0);
});

test("baseline requires explicit historical-debt classification and provenance", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  }));
  assert.doesNotThrow(() => validateDeadCodeBaseline(baseline));
  assert.throws(() => validateDeadCodeBaseline({ ...baseline, findings: [{ ...baseline.findings[0], classification: "ignored" }] }));
});
