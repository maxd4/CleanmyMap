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
  FUNCTION_IDENTITY_SCHEME,
  FUNCTION_IDENTITY_SCHEME_VERSION,
  validateBaselineShape,
} from "./complexity-policy.mjs";
import { evaluateMetrics } from "./check-complexity-policy.mjs";
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
    functionEndLine: 5,
    value,
    key: baselineKey("complexity", "src/fixture.ts", functionIdentity),
  };
}

function changedBodyRange(line = 3) {
  return new Map([["src/fixture.ts", [{ start: line, end: line }]]]);
}

test("A: existing complexity 19 fails when a body edit raises it to 21", () => {
  const result = evaluateMetrics({ metrics: [measuredMetric(21)], baseline: { entries: [{ metric: "complexity", path: "src/fixture.ts", functionIdentity: "named:fixture#1", ceiling: 19 }] }, changedRanges: changedBodyRange() });
  assert.equal(result.failures.length, 1);
});

test("B: a new function above target fails without a baseline entry", () => {
  const result = evaluateMetrics({ metrics: [measuredMetric(21, "named:newFunction#1")], baseline: { entries: [] }, changedRanges: changedBodyRange() });
  assert.equal(result.failures.length, 1);
});

test("C: an untouched historical function above target remains within its baseline", () => {
  const result = evaluateMetrics({ metrics: [measuredMetric(23)], baseline: { entries: [{ metric: "complexity", path: "src/fixture.ts", functionIdentity: "named:fixture#1", ceiling: 23 }] }, changedRanges: new Map() });
  assert.equal(result.failures.length, 0);
});

test("D: touching a historical function without worsening does not invent a baseline", () => {
  const baseline = { entries: [{ metric: "complexity", path: "src/fixture.ts", functionIdentity: "named:fixture#1", ceiling: 23 }] };
  const result = evaluateMetrics({ metrics: [measuredMetric(23)], baseline, changedRanges: changedBodyRange() });
  assert.equal(result.failures.length, 0);
  assert.deepEqual(result.stale, []);
  assert.equal(baseline.entries.length, 1);
});

test("E: a body-only changed line intersects the full AST function range", () => {
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
  assert.deepEqual(metricCounts, { complexity: 272, functionLength: 385 });
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
  assert.equal(baseline.entries.length, 657);
  assert.equal(baseline.entries.some((entry) => entry.path === "src/lib/gamification/badges/listing.ts" && entry.functionIdentity === "named:awardProgressionEventIfMissing#1"), false);
  assert.doesNotThrow(() => validateBaselineShape(baseline));
});

test("malformed or stale baseline is rejected", () => {
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "not-a-sha", entries: [] }), /sourceCommit/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 1, policyFingerprint: "wrong", entries: [] }), /identity scheme/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 2, policyFingerprint: "wrong", entries: [] }), /fingerprint/);
});
