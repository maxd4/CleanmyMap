import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  acquireImprovement,
  baselineKey,
  classifyComplexityCategory,
  classifyFileKind,
  compareLegacyValue,
  deriveFunctionIdentity,
  createFunctionMetadataResolver,
  evaluateNewMetric,
  intersectsChangedFunction,
  evaluateBaselinedMetric,
  isSubstantiallyChanged,
  FUNCTION_IDENTITY_SCHEME,
  FUNCTION_IDENTITY_SCHEME_VERSION,
  validateBaselineShape,
} from "./complexity-policy.mjs";
import { evaluateMetrics, parseChangedDiffText } from "./check-complexity-policy.mjs";
import { classifyFileKind as classifyTopHeavyFileKind } from "./top-heavy-measurement.mjs";

test("complexity target blocks new code at 15 for domain and 20 for runtime", () => {
  assert.equal(evaluateNewMetric("complexity", "métier/domain pur", 15).status, "PASS");
  assert.equal(evaluateNewMetric("complexity", "métier/domain pur", 16).status, "FAIL");
  assert.equal(evaluateNewMetric("complexity", "runtime/services/orchestration", 20).status, "PASS");
  assert.equal(evaluateNewMetric("complexity", "runtime/services/orchestration", 21).status, "FAIL");
});

test("complexity target blocks React above 20 while historical ceilings remain separate", () => {
  assert.equal(evaluateNewMetric("complexity", "React/JSX", 20).status, "PASS");
  assert.equal(evaluateNewMetric("complexity", "React/JSX", 21).status, "FAIL");
  assert.equal(evaluateBaselinedMetric("complexity", "React/JSX", 25, 25, false).status, "PASS");
});

test("parser exception requires justification and never exceeds 30", () => {
  assert.equal(evaluateNewMetric("complexity", "parser/adaptateur exceptionnel", 30, { parserJustified: true }).status, "REVIEW");
  assert.equal(evaluateNewMetric("complexity", "parser/adaptateur exceptionnel", 26).status, "FAIL");
  assert.equal(evaluateNewMetric("complexity", "parser/adaptateur exceptionnel", 31, { parserJustified: true }).status, "FAIL");
});

test("legacy ceiling is stable, blocks growth, and exposes improvement", () => {
  assert.equal(compareLegacyValue(37, 37).status, "PASS");
  assert.equal(compareLegacyValue(39, 37).status, "FAIL");
  assert.equal(compareLegacyValue(28, 37).status, "IMPROVEMENT");
  assert.equal(acquireImprovement({ metric: "complexity", ceiling: 37, status: "LEGACY" }, 28).ceiling, 28);
  assert.equal(compareLegacyValue(31, acquireImprovement({ ceiling: 37 }, 28).ceiling).status, "FAIL");
});

test("function-length targets block new code while legacy ceilings remain intact", () => {
  assert.equal(evaluateNewMetric("functionLength", "métier/domain pur", 60).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "métier/domain pur", 61).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "runtime/services/orchestration", 100).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "runtime/services/orchestration", 101).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "hooks", 120).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "hooks", 121).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "React/JSX", 150).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "React/JSX", 151).status, "FAIL");
});

function measuredMetric(value, functionIdentity = "named:fixture#1") {
  return {
    metric: "complexity",
    category: "React/JSX",
    path: "src/fixture.ts",
    functionIdentity,
    functionStartLine: 1,
    functionEndLine: 20,
    value,
    key: baselineKey("complexity", "src/fixture.ts", functionIdentity),
  };
}

function changedBodyRange(line = 3) {
  return new Map([["src/fixture.ts", [{ start: line, end: line }]]]);
}

function changedBodyHunks({ newStart = 3, newCount = 1, added = 1, deleted = 0 } = {}) {
  return new Map([[
    "src/fixture.ts",
    [{ newStart, newEnd: newStart + Math.max(newCount, 1) - 1, added, deleted }],
  ]]);
}

function legacyFixture(value, { changedRanges = new Map(), changedHunks = new Map() } = {}) {
  return evaluateMetrics({
    metrics: [measuredMetric(value)],
    baseline: { entries: [{ metric: "complexity", path: "src/fixture.ts", functionIdentity: "named:fixture#1", ceiling: 23 }] },
    changedRanges,
    changedHunks,
  });
}

test("A: legacy 23 untouched remains within its historical ceiling", () => {
  const result = legacyFixture(23);
  assert.equal(result.failures.length, 0);
});

test("B: legacy 23 with a light correction remains within its historical ceiling", () => {
  const result = legacyFixture(23, {
    changedRanges: changedBodyRange(),
    changedHunks: changedBodyHunks(),
  });
  assert.equal(result.failures.length, 0);
});

test("C: a light correction that raises legacy 23 to 24 fails the historical ceiling", () => {
  const result = legacyFixture(24, {
    changedRanges: changedBodyRange(),
    changedHunks: changedBodyHunks(),
  });
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].reason, /legacy ceiling/);
});

test("D: a substantial rewrite that remains at legacy 23 fails the React target 20", () => {
  const result = legacyFixture(23, {
    changedRanges: new Map([["src/fixture.ts", [{ start: 8, end: 11 }]]]),
    changedHunks: changedBodyHunks({ newStart: 8, newCount: 4, added: 6, deleted: 4 }),
  });
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].reason, /substantially modified/);
});

test("E: a substantial rewrite that descends to target 20 passes", () => {
  const result = legacyFixture(20, {
    changedRanges: new Map([["src/fixture.ts", [{ start: 8, end: 11 }]]]),
    changedHunks: changedBodyHunks({ newStart: 8, newCount: 4, added: 6, deleted: 4 }),
  });
  assert.equal(result.failures.length, 0);
});

test("F: a substantial middle-body modification is detected", () => {
  const result = legacyFixture(23, {
    changedRanges: new Map([["src/fixture.ts", [{ start: 8, end: 11 }]]]),
    changedHunks: changedBodyHunks({ newStart: 8, newCount: 4, added: 4 }),
  });
  assert.equal(isSubstantiallyChanged({ changedLines: 4, functionStartLine: 1, functionEndLine: 20 }), true);
  assert.equal(result.failures.length, 1);
});

test("G: an important deletion in the body is counted and detected", () => {
  const parsed = parseChangedDiffText([
    "diff --git a/apps/web/src/fixture.ts b/apps/web/src/fixture.ts",
    "--- a/apps/web/src/fixture.ts",
    "+++ b/apps/web/src/fixture.ts",
    "@@ -8,5 +8,0 @@ function fixture()",
    "-  const removedA = 1;",
    "-  const removedB = 2;",
    "-  const removedC = 3;",
    "-  const removedD = 4;",
    "-  const removedE = 5;",
  ].join("\n"));
  assert.equal(parsed.hunks.get("src/fixture.ts")[0].added, 0);
  assert.equal(parsed.hunks.get("src/fixture.ts")[0].deleted, 5);
  const result = legacyFixture(23, { changedRanges: parsed.ranges, changedHunks: parsed.hunks });
  assert.equal(result.failures.length, 1);
});

test("H: a new React function above target still fails", () => {
  const result = evaluateMetrics({
    metrics: [measuredMetric(21, "named:newFunction#1")],
    baseline: { entries: [] },
    changedRanges: changedBodyRange(),
  });
  assert.equal(result.failures.length, 1);
});

test("body-only changed line intersects the full AST function range", () => {
  const source = "function fixture() {\n  const first = 1;\n  return first;\n}";
  const metadata = createFunctionMetadataResolver("fixture.ts", source)(1, "Function 'fixture'");
  assert.deepEqual(metadata, { functionIdentity: "named:fixture#1", startLine: 1, endLine: 4 });
  assert.equal(intersectsChangedFunction(new Map([["src/fixture.ts", [{ start: 3, end: 3 }]]]), "src/fixture.ts", metadata.startLine, metadata.endLine), true);
});

test("test filename forms are classified as tests by both quality owners", () => {
  const files = [
    "src/lib/route.test.ts",
    "src/lib/route.test.tsx",
    "src/lib/route.spec.ts",
    "src/lib/route.spec.tsx",
    "src/lib/route.test.helpers.ts",
    "src/lib/route.test.harness.ts",
    "src/lib/route.test.cleanup-scenario.ts",
  ];
  for (const file of files) {
    assert.equal(classifyFileKind(file), "test", file);
    assert.equal(classifyTopHeavyFileKind(file), "test", file);
    assert.equal(classifyComplexityCategory(file), "tests", file);
  }
});

test("complexity baseline metrics never own file length", () => {
  const baseline = JSON.parse(fs.readFileSync("scripts/checks/complexity-baseline.json", "utf8"));
  assert.ok(baseline.entries.length > 0);
  const metricCounts = baseline.entries.reduce((counts, entry) => ({ ...counts, [entry.metric]: (counts[entry.metric] ?? 0) + 1 }), {});
  assert.deepEqual(metricCounts, { complexity: 273, functionLength: 382 });
  assert.ok(baseline.entries.every((entry) => ["complexity", "functionLength"].includes(entry.metric)));
  assert.ok(baseline.entries.every((entry) => typeof entry.functionIdentity === "string"));
});

test("no legacy ESLint exception ceilings remain", () => {
  const policy = fs.readFileSync("scripts/checks/complexity-policy.mjs", "utf8");
  const eslintConfig = fs.readFileSync("apps/web/eslint.config.mjs", "utf8");
  assert.doesNotMatch(policy, /LEGACY_EXCEPTION_CEILINGS/);
  assert.doesNotMatch(policy, /routeCalibrationTestFunctionLines/);
  assert.doesNotMatch(eslintConfig, /routeCalibrationTestFunctionLines/);
  const heavy = JSON.parse(fs.readFileSync("scripts/checks/heavy-files-baseline.json", "utf8"));
  const maxLines = new Map([...heavy.allowed, ...heavy.review].map((entry) => [entry.path, entry.maxLines]));
  assert.equal(maxLines.has("apps/web/src/lib/auth/api-authorization-contract.ts"), false);
  assert.equal(maxLines.has("apps/web/src/lib/route/route-calibration.ts"), false);
});

test("LINE_SHIFT_TEST: function identity is stable when lines are inserted before a legacy function", () => {
  const functionSource = "function legacyRoute(input) {\n  return input;\n}";
  const original = deriveFunctionIdentity("fixture.ts", functionSource, 1, "Function 'legacyRoute'");
  const shifted = deriveFunctionIdentity("fixture.ts", `\n\n${functionSource}`, 3, "Function 'legacyRoute'");
  assert.equal(original, shifted);
  assert.equal(baselineKey("complexity", "fixture.ts", original), baselineKey("complexity", "fixture.ts", shifted));
  assert.match(FUNCTION_IDENTITY_SCHEME, /line is diagnostic metadata only/);
});

test("LF_CRLF_IDENTITY_TEST: input.zones.map callback identity is cross-platform stable", () => {
  const lf = [
    "const result = input.zones",
    "  .map((zone) => zone.id);",
  ].join("\n");
  const crlf = lf.replaceAll("\n", "\r\n");
  assert.equal(
    deriveFunctionIdentity("fixture.ts", lf, 2),
    deriveFunctionIdentity("fixture.ts", crlf, 2),
  );
});

test("WHITESPACE_IDENTITY_TEST: syntax-only whitespace does not change a multiline callee identity", () => {
  const compact = [
    "const result = input.zones",
    "  .map((zone) => zone.id);",
  ].join("\n");
  const spaced = [
    "const result = input.zones",
    "          . map ( (zone) => zone.id );",
  ].join("\n");
  assert.equal(
    deriveFunctionIdentity("fixture.ts", compact, 2),
    deriveFunctionIdentity("fixture.ts", spaced, 2),
  );
});

test("DISTINCT_CALLBACK_TEST: distinct callbacks in the same call context remain distinct", () => {
  const source = [
    "const result = input.zones.map(",
    "  (zone) => zone.id,",
    "  (zone) => zone.label,",
    ");",
  ].join("\n");
  const first = deriveFunctionIdentity("fixture.ts", source, 2);
  const second = deriveFunctionIdentity("fixture.ts", source, 3);
  assert.notEqual(first, second);
  assert.match(first, /:0:#1$/);
  assert.match(second, /:1:#1$/);
});

test("BASELINE_CURRENT_MAIN_TEST: baseline declares the current identity scheme and all measured entries", () => {
  const baseline = JSON.parse(fs.readFileSync("scripts/checks/complexity-baseline.json", "utf8"));
  assert.equal(FUNCTION_IDENTITY_SCHEME_VERSION, 2);
  assert.equal(baseline.functionIdentitySchemeVersion, FUNCTION_IDENTITY_SCHEME_VERSION);
  assert.equal(baseline.entries.length, 655);
  assert.equal(baseline.entries.some((entry) => entry.path === "src/lib/gamification/badges/listing.ts" && entry.functionIdentity === "named:awardProgressionEventIfMissing#1"), false);
  assert.doesNotThrow(() => validateBaselineShape(baseline));
});

test("malformed or stale baseline is rejected", () => {
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "not-a-sha", entries: [] }), /sourceCommit/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 1, policyFingerprint: "wrong", entries: [] }), /identity scheme/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 2, policyFingerprint: "wrong", entries: [] }), /fingerprint/);
});
