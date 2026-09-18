import assert from "node:assert/strict";
import test from "node:test";

import {
  acquireImprovement,
  compareLegacyValue,
  evaluateNewFileLength,
  evaluateNewMetric,
  validateBaselineShape,
} from "./complexity-policy.mjs";

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

test("file length distinguishes pass, review, block, and data/config signal", () => {
  assert.equal(evaluateNewFileLength("runtime", 400).status, "PASS");
  assert.equal(evaluateNewFileLength("runtime", 401).status, "REVIEW");
  assert.equal(evaluateNewFileLength("runtime", 600).status, "REVIEW");
  assert.equal(evaluateNewFileLength("runtime", 601).status, "FAIL");
  assert.equal(evaluateNewFileLength("test", 700).status, "PASS");
  assert.equal(evaluateNewFileLength("test", 701).status, "REVIEW");
  assert.equal(evaluateNewFileLength("test", 1001).status, "FAIL");
  assert.equal(evaluateNewFileLength("data/config", 1001).status, "REVIEW");
});

test("malformed or stale baseline is rejected", () => {
  assert.throws(() => validateBaselineShape({ schemaVersion: 1, sourceCommit: "not-a-sha", entries: [] }), /sourceCommit/);
  assert.throws(() => validateBaselineShape({ schemaVersion: 1, sourceCommit: "a".repeat(40), policyFingerprint: "wrong", entries: [] }), /fingerprint/);
});
