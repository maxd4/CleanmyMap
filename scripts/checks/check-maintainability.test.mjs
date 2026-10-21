import assert from "node:assert/strict";
import test from "node:test";

import { analyzeMaintainabilitySources } from "./check-maintainability.mjs";

const fixturePath = "apps/web/src/maintainability-fixture.ts";

const fixtureSource = `
function complex(value: number, other: number) {
  if (value > 0 && other > 0) {
    if (value === other) return true;
  } else if (value < 0) {
    return false;
  } else {
    return Boolean(other);
  }
  return value > 3 ? true : false;
}

function longButLinear() {
  const first = 1;
  const second = first + 1;
  const third = second + 1;
  const fourth = third + 1;
  const fifth = fourth + 1;
  const sixth = fifth + 1;
  const seventh = sixth + 1;
  const eighth = seventh + 1;
  const ninth = eighth + 1;
  const tenth = ninth + 1;
  return tenth;
}

function redundant(flag: boolean) {
  return flag && true;
}

function duplicatedBranches(flag: boolean) {
  if (flag) {
    const value = "same";
    return value;
  } else {
    const value = "same";
    return value;
  }
}

function nested(flag: boolean, second: boolean, third: boolean, fourth: boolean) {
  if (flag) {
    if (second) {
      if (third) {
        if (fourth) return 1;
      }
    }
  }
  return 0;
}
`;

test("mesure séparément la complexité cognitive, la longueur et les défauts locaux", async () => {
  const complexityReport = {
    metrics: [
      {
        metric: "complexity",
        path: fixturePath,
        functionIdentity: "named:complex#1",
        value: 7,
        line: 2,
        functionStartLine: 2,
        functionEndLine: 12,
        category: "runtime/services/orchestration",
      },
      {
        metric: "functionLength",
        path: fixturePath,
        functionIdentity: "named:complex#1",
        value: 11,
        line: 2,
        functionStartLine: 2,
        functionEndLine: 12,
        category: "runtime/services/orchestration",
      },
    ],
  };
  const report = await analyzeMaintainabilitySources({
    files: [{ path: fixturePath, source: fixtureSource }],
    complexityReport,
  });

  assert.equal(report.status, "PASS");
  assert.equal(report.measurementStatus, "MEASURED_NOT_RATCHETED");
  assert.equal(report.diagnostics.length, 0);
  assert.equal(report.summary.functionsMeasured, 5);
  assert.equal(report.summary.cognitiveComplexityAboveTarget, 0);

  const cognitive = report.metrics.find((metric) => metric.functionIdentity === "named:complex#1");
  const linear = report.metrics.find((metric) => metric.functionIdentity === "named:longButLinear#1");
  assert.ok(cognitive.value > 0);
  assert.equal(linear.value, 0);
  assert.deepEqual(cognitive.relation.cyclomaticComplexity, { value: 7, category: "runtime/services/orchestration", line: 2 });
  assert.deepEqual(cognitive.relation.functionLength, { value: 11, category: "runtime/services/orchestration", line: 2 });

  const rules = new Set(report.findings.map((finding) => finding.ruleId));
  assert.ok(rules.has("sonarjs/no-redundant-boolean"));
  assert.ok(rules.has("sonarjs/no-duplicated-branches"));
  assert.ok(rules.has("sonarjs/no-collapsible-if"));
  assert.ok(rules.has("sonarjs/nested-control-flow"));
  assert.ok(report.findings.every((finding) => finding.line >= 1 && finding.column >= 1));
});

test("une fonction linéaire propre ne produit aucun défaut local", async () => {
  const report = await analyzeMaintainabilitySources({
    files: [{
      path: "apps/mobile/src/clean-fixture.ts",
      source: `
function clean(value: number) {
  const normalized = Math.abs(value);
  return normalized + 1;
}
`,
    }],
  });

  assert.equal(report.status, "PASS");
  assert.equal(report.diagnostics.length, 0);
  assert.equal(report.findings.length, 0);
  assert.equal(report.metrics[0].value, 0);
});
