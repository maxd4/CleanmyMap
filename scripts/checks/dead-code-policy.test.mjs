import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareDeadCodeFindings,
  createDeadCodeBaseline,
  findingId,
  findingKey,
  hasBlockingDeadCodeFindings,
  normalizeKnipReport,
  validateDeadCodeBaseline,
  validateDeadCodeJustifications,
} from "./dead-code-policy.mjs";

const sourceCommit = "89982c0cafa6b5379bee55852458b3e5308f8106";

function report(...entries) {
  return { issues: entries.map(({ file, ...issues }) => ({ file, ...issues })) };
}

function baselineFor(input) {
  return createDeadCodeBaseline({ report: input, sourceCommit });
}

function emptyJustifications() {
  return { schemaVersion: 1, justifications: [] };
}

function justificationFor(baseline, overrides = {}) {
  return {
    id: baseline.findings[0].id,
    classification: "KEEP_JUSTIFIED",
    reason: "Contrat framework verifie et conserve explicitement.",
    evidence: "documentation/development/TESTING.md:358-386",
    reviewedRef: sourceCommit,
    ...overrides,
  };
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
  assert.equal(comparison.historicalActionableFindings.length, 1);
  assert.equal(comparison.keepJustifiedFindings.length, 0);
  assert.equal(comparison.staleKeepJustifications.length, 0);
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
  assert.equal(hasBlockingDeadCodeFindings(comparison), true);
});

test("an empty registry preserves the current policy behavior", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    exports: [{ name: "oldHelper", kind: "function" }],
  }));
  const comparison = compareDeadCodeFindings(
    normalizeKnipReport(report({
      file: "scripts/check.mjs",
      exports: [{ name: "oldHelper", kind: "function" }],
    })),
    baseline,
    emptyJustifications(),
  );
  assert.equal(comparison.historicalActionableFindings.length, 1);
  assert.equal(comparison.keepJustifiedFindings.length, 0);
  assert.equal(hasBlockingDeadCodeFindings(comparison), false);
});

test("a valid historical KEEP_JUSTIFIED finding is visible but excluded from actionable debt", () => {
  const input = report({
    file: "scripts/check.mjs",
    exports: [{ name: "frameworkEntry", kind: "function" }],
  });
  const baseline = baselineFor(input);
  const comparison = compareDeadCodeFindings(
    normalizeKnipReport(input),
    baseline,
    { schemaVersion: 1, justifications: [justificationFor(baseline)] },
  );
  assert.equal(comparison.currentCount, 1);
  assert.equal(comparison.keepJustifiedFindings.length, 1);
  assert.equal(comparison.historicalActionableFindings.length, 0);
  assert.equal(comparison.staleKeepJustifications.length, 0);
  assert.equal(hasBlockingDeadCodeFindings(comparison), false);
});

test("a new finding cannot be hidden by adding it to the KEEP registry", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  }));
  const current = normalizeKnipReport(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
    exports: [{ name: "newHelper", kind: "function" }],
  }));
  const newFindingId = findingId(current.find((finding) => finding.name === "newHelper"));
  assert.throws(
    () => compareDeadCodeFindings(current, baseline, {
      schemaVersion: 1,
      justifications: [justificationFor({ findings: [{ id: newFindingId }] })],
    }),
    /absent from the historical baseline/,
  );
  const comparison = compareDeadCodeFindings(current, baseline, emptyJustifications());
  assert.equal(comparison.newFindings.length, 1);
  assert.equal(hasBlockingDeadCodeFindings(comparison), true);
});

test("a KEEP registry entry absent from the historical baseline is rejected", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  }));
  assert.throws(
    () => compareDeadCodeFindings(
      normalizeKnipReport(report({ file: "scripts/check.mjs", files: [{ name: "scripts/check.mjs" }] })),
      baseline,
      { schemaVersion: 1, justifications: [justificationFor({ findings: [{ id: "0123456789abcdef01234567" }] })] },
    ),
    /absent from the historical baseline/,
  );
});

test("a resolved or identity-changed KEEP is stale and blocks until explicit review", () => {
  const input = report({
    file: "scripts/check.mjs",
    exports: [{ name: "reviewedHelper", kind: "function" }],
  });
  const baseline = baselineFor(input);
  const registry = { schemaVersion: 1, justifications: [justificationFor(baseline)] };
  const resolved = compareDeadCodeFindings(normalizeKnipReport(report({ file: "scripts/check.mjs" })), baseline, registry);
  assert.equal(resolved.resolvedFindings.length, 1);
  assert.equal(resolved.staleKeepJustifications.length, 1);
  assert.equal(resolved.staleKeepJustifications[0].status, "STALE_KEEP_JUSTIFIED");
  assert.equal(hasBlockingDeadCodeFindings(resolved), true);

  const changed = compareDeadCodeFindings(
    normalizeKnipReport(report({ file: "scripts/check.mjs", exports: [{ name: "renamedHelper", kind: "function" }] })),
    baseline,
    registry,
  );
  assert.equal(changed.newFindings.length, 1);
  assert.equal(changed.staleKeepJustifications.length, 1);
  assert.equal(hasBlockingDeadCodeFindings(changed), true);
});

test("KEEP registry metadata is validated strictly", () => {
  assert.throws(
    () => validateDeadCodeJustifications({ schemaVersion: 1, justifications: [{ id: "bad" }] }),
    /stable finding id/,
  );
  assert.throws(
    () => validateDeadCodeJustifications({
      schemaVersion: 1,
      justifications: [{
        id: "0123456789abcdef01234567",
        classification: "historical-debt",
        reason: "x",
        evidence: "y",
        reviewedRef: sourceCommit,
      }],
    }),
    /KEEP_JUSTIFIED classification/,
  );
  assert.throws(
    () => validateDeadCodeJustifications({
      schemaVersion: 1,
      justifications: [{
        id: "0123456789abcdef01234567",
        classification: "KEEP_JUSTIFIED",
        reason: " ",
        evidence: "y",
        reviewedRef: sourceCommit,
      }],
    }),
    /non-empty reason/,
  );
  assert.throws(
    () => validateDeadCodeJustifications({
      schemaVersion: 1,
      justifications: [{
        id: "0123456789abcdef01234567",
        classification: "KEEP_JUSTIFIED",
        reason: "x",
        evidence: "y",
        reviewedRef: "not-a-sha",
      }],
    }),
    /complete reviewedRef SHA/,
  );
});

test("baseline requires explicit historical-debt classification and provenance", () => {
  const baseline = baselineFor(report({
    file: "scripts/check.mjs",
    files: [{ name: "scripts/check.mjs" }],
  }));
  assert.doesNotThrow(() => validateDeadCodeBaseline(baseline));
  assert.throws(() => validateDeadCodeBaseline({ ...baseline, findings: [{ ...baseline.findings[0], classification: "ignored" }] }));
});
