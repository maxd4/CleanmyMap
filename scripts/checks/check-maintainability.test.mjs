import assert from "node:assert/strict";
import test from "node:test";

import { analyzeMaintainabilitySources } from "./check-maintainability.mjs";
import { profileFunctionControlFlow } from "./control-flow-profile.mjs";

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
  assert.equal(report.summary.controlFlowFunctions, 5);
  assert.equal(report.summary.controlFlowDecisionPoints, 11);
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
  const controlFlow = report.controlFlowProfiles.find((profile) => profile.functionIdentity === "named:complex#1");
  assert.deepEqual(controlFlow.relation.cyclomaticComplexity, { value: 7, category: "runtime/services/orchestration", line: 2 });
  assert.deepEqual(controlFlow.relation.cognitiveComplexity, { value: cognitive.value, line: 2, thresholdTarget: 15 });
  assert.equal(controlFlow.decisionKinds["&&"], 1);
  assert.equal(controlFlow.decisionKinds.ternary, 1);
  assert.equal(controlFlow.maxDecisionNestingDepth, 2);
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

test("distingue une structure plate d'une structure imbriquée et conserve la distribution des sous-arbres", () => {
  const flat = profileFunctionControlFlow("apps/web/src/flat.ts", `
function sameComplexity(first: boolean, second: boolean) {
  if (first) return 1;
  if (second) return 2;
  return 0;
}
`).functions[0];
  const nested = profileFunctionControlFlow("apps/web/src/nested.ts", `
function sameComplexity(first: boolean, second: boolean) {
  if (first) {
    if (second) return 1;
  }
  return 0;
}
`).functions[0];

  assert.equal(flat.decisionPoints, nested.decisionPoints);
  assert.equal(flat.maxDecisionNestingDepth, 1);
  assert.equal(nested.maxDecisionNestingDepth, 2);
  assert.equal(flat.nestedDecisionCount, 0);
  assert.equal(nested.nestedDecisionCount, 1);
  assert.equal(flat.busiestSubtree.decisionPoints, 1);
  assert.equal(nested.busiestSubtree.decisionPoints, 2);
  assert.equal(flat.decisionSubtrees.filter((subtree) => subtree.decisionPoints > 0).length, 2);
  assert.equal(nested.decisionSubtrees.filter((subtree) => subtree.decisionPoints > 0).length, 1);
});

test("compte les constructions AST documentées dans MJS, JSX et les callbacks sans mélanger les fonctions", () => {
  const source = `
function render(items, enabled) {
  try {
    return enabled && items.map((item) => item.ok ? item.value : null);
  } catch (error) {
    return [];
  }
}
function switcher(value) {
  switch (value) {
    case 1: return true;
    default: return false;
  }
}
`;
  const first = profileFunctionControlFlow("apps/web/src/fixture.mjs", source);
  const second = profileFunctionControlFlow("apps/web/src/fixture.mjs", source);
  assert.deepEqual(first, second);
  assert.equal(first.status, "PRESENT");
  assert.equal(first.functions.length, 3);
  const render = first.functions.find((profile) => profile.functionIdentity === "named:render#1");
  assert.equal(render.decisionKinds["&&"], 1);
  assert.equal(render.decisionKinds.ternary, undefined);
  assert.equal(render.decisionKinds.catch, 1);
  assert.equal(render.decisionPoints, 2);
  assert.equal(render.nestedDecisionCount, 0);
  const switcher = first.functions.find((profile) => profile.functionIdentity === "named:switcher#1");
  assert.deepEqual(switcher.decisionKinds, { case: 1, default: 1, switch: 1 });
  assert.equal(switcher.decisionPoints, 3);
  const callback = first.functions.find((profile) => profile.functionIdentity.startsWith("callback:items . map"));
  assert.equal(callback.decisionKinds.ternary, 1);

  const jsx = profileFunctionControlFlow("apps/web/src/view.tsx", "function View({ enabled }) { return <div>{enabled && <span />}</div>; }").functions[0];
  assert.equal(jsx.decisionKinds["&&"], 1);
});

test("un fichier non pris en charge reste NOT_MEASURED sans faux profil", () => {
  const result = profileFunctionControlFlow("apps/web/src/fixture.css", ".selector { color: red; }");
  assert.equal(result.status, "NOT_MEASURED");
  assert.equal(result.reason, "UNSUPPORTED_FILE_TYPE");
  assert.deepEqual(result.functions, []);
});

test("le rapport conserve NOT_MEASURED pour un fichier non pris en charge", async () => {
  const report = await analyzeMaintainabilitySources({ files: [{ path: "apps/web/src/fixture.css", source: ".selector { color: red; }" }] });
  assert.equal(report.summary.controlFlowFilesNotMeasured, 1);
  assert.deepEqual(report.controlFlowStatuses, [{ path: "apps/web/src/fixture.css", status: "NOT_MEASURED", reason: "UNSUPPORTED_FILE_TYPE" }]);
});
