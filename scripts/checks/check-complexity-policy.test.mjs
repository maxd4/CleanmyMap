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
  evaluateNewMetric,
  FUNCTION_IDENTITY_SCHEME,
  FUNCTION_IDENTITY_SCHEME_VERSION,
  validateBaselineShape,
} from "./complexity-policy.mjs";
import { classifyFileKind as classifyTopHeavyFileKind } from "./top-heavy-measurement.mjs";

test("complexity blocks domain above 20 and accepts 20", () => {
  assert.equal(evaluateNewMetric("complexity", "métier/domain pur", 20).status, "PASS");
  assert.equal(evaluateNewMetric("complexity", "métier/domain pur", 21).status, "FAIL");
});

test("complexity blocks runtime above 25 and accepts 25", () => {
  assert.equal(evaluateNewMetric("complexity", "runtime/services/orchestration", 25).status, "PASS");
  assert.equal(evaluateNewMetric("complexity", "runtime/services/orchestration", 26).status, "FAIL");
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

test("function length blocks at the category limits", () => {
  assert.equal(evaluateNewMetric("functionLength", "métier/domain pur", 100).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "métier/domain pur", 101).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "runtime/services/orchestration", 150).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "runtime/services/orchestration", 151).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "hooks", 200).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "hooks", 201).status, "FAIL");
  assert.equal(evaluateNewMetric("functionLength", "React/JSX", 250).status, "PASS");
  assert.equal(evaluateNewMetric("functionLength", "React/JSX", 251).status, "FAIL");
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
  assert.deepEqual(metricCounts, {
    complexity: 273,
    functionLength: 389,
  });
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
  assert.equal(baseline.entries.length, 662);
  assert.doesNotThrow(() => validateBaselineShape(baseline));
});

test("malformed or stale baseline is rejected", () => {
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "not-a-sha", entries: [] }), /sourceCommit/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 1, policyFingerprint: "wrong", entries: [] }), /identity scheme/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 2, sourceCommit: "a".repeat(40), functionIdentitySchemeVersion: 2, policyFingerprint: "wrong", entries: [] }), /fingerprint/);
});
