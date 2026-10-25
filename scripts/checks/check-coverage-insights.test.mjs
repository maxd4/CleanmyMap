import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCoverageInsightsReport,
  COVERAGE_WARNING_THRESHOLD,
  DUPLICATION_WARNING_THRESHOLD,
} from "./check-coverage-insights.mjs";

const sha = "a".repeat(40);
const definition = { scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" };
const mobileDefinition = { scope: "mobile", lcovPath: "apps/mobile/coverage/lcov.info", summaryPath: "apps/mobile/coverage/coverage-summary.json", sourceRoot: "apps/mobile" };

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-insights-"));
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web", "coverage"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "web", "src", "fixture.ts"), "export function fixture() { return true; }\n");
  return root;
}

function fixture(root, { branchCovered = 1, branchTotal = 2, pct = 80 } = {}) {
  const summary = {
    total: {
      statements: { total: 10, covered: 8, pct: 80 },
      branches: { total: branchTotal, covered: branchCovered, pct },
      functions: { total: 2, covered: 2, pct: 100 },
      lines: { total: 10, covered: 8, pct: 80 },
    },
    "apps/web/src/fixture.ts": {
      statements: { total: 10, covered: 8, pct: 80 },
      branches: { total: branchTotal, covered: branchCovered, pct },
      functions: { total: 2, covered: 2, pct: 100 },
      lines: { total: 10, covered: 8, pct: 80 },
    },
  };
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "coverage-summary.json"), JSON.stringify(summary));
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "lcov.info"), [
    "TN:",
    "SF:src/fixture.ts",
    "DA:1,1",
    "DA:2,0",
    "BRDA:2,0,0,1",
    "BRDA:2,0,1,0",
    "end_of_record",
    "",
  ].join("\n"));
}

function mobileFixture(root) {
  fs.mkdirSync(path.join(root, "apps", "mobile", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "mobile", "coverage"), { recursive: true });
  const metrics = { total: 1, covered: 1, pct: 100 };
  fs.writeFileSync(path.join(root, "apps", "mobile", "coverage", "coverage-summary.json"), JSON.stringify({
    total: { statements: metrics, branches: metrics, functions: metrics, lines: metrics },
    "apps/mobile/src/fixture.ts": { statements: metrics, branches: metrics, functions: metrics, lines: metrics },
  }));
  fs.writeFileSync(path.join(root, "apps", "mobile", "coverage", "lcov.info"), [
    "TN:",
    "SF:src/fixture.ts",
    "DA:1,1",
    "BRDA:1,0,0,1",
    "end_of_record",
    "",
  ].join("\n"));
}

function report(root, options = {}) {
  fixture(root, options);
  return buildCoverageInsightsReport({
    root,
    auditedSha: sha,
    reports: [definition],
    validateSonar: () => [{ status: "VALID" }],
    validateEvidence: () => ({ gitHead: sha }),
    duplicationReport: {
      results: [
        { scopeName: "runtime", metrics: { percentage: options.duplication ?? 3, duplicatedLines: 3, lines: 100, clones: 1 } },
        { scopeName: "tests", metrics: { percentage: 2, duplicatedLines: 2, lines: 100, clones: 1 } },
        { scopeName: "fixtures/data", metrics: { percentage: 3, duplicatedLines: 3, lines: 100, clones: 1 } },
      ],
    },
  });
}

test("mesure LCOV, conserve les quatre métriques, classe les branches et respecte les seuils exacts", () => {
  const root = tempRoot();
  try {
    const result = report(root, { branchCovered: 1, branchTotal: 2, pct: 50, duplication: 3 });
    const scope = result.scopes[0];
    assert.equal(scope.state, "MEASURED");
    assert.deepEqual(scope.metrics.branches, { covered: 1, total: 2, uncovered: 1, pct: 50, source: "coverage-summary.json", state: "MEASURED" });
    assert.equal(scope.files[0].path, "apps/web/src/fixture.ts");
    assert.deepEqual(scope.files[0].uncoveredBranchLines, [2]);
    assert.equal(scope.decisionPoints[1].covered, false);
    assert.ok(result.warnings.some((warning) => warning.code === "COVERAGE_BELOW_TARGET"));
    assert.equal(result.warnings.some((warning) => warning.code === "DUPLICATION_ABOVE_TARGET"), false);
    assert.equal(COVERAGE_WARNING_THRESHOLD, 80);
    assert.equal(DUPLICATION_WARNING_THRESHOLD, 3);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("80% de couverture et 3% de duplication ne déclenchent aucune alerte", () => {
  const root = tempRoot();
  try {
    const result = report(root, { branchCovered: 2, branchTotal: 2, pct: 100, duplication: 3 });
    assert.equal(result.warnings.length, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("une évidence absente est signalée sans fabriquer un warning de seuil", () => {
  const root = tempRoot();
  try {
    fixture(root, { branchCovered: 0, branchTotal: 2, pct: 0 });
    const result = buildCoverageInsightsReport({ root, auditedSha: sha, reports: [definition], validateSonar: () => [{ status: "VALID" }], validateEvidence: () => { throw new Error("evidence missing"); } });
    assert.equal(result.scopes[0].state, "EVIDENCE_UNVERIFIED");
    assert.equal(result.warnings.some((warning) => warning.code === "COVERAGE_BELOW_TARGET"), false);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "COVERAGE_EVIDENCE_UNVERIFIED"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("un rapport absent devient NOT_MEASURED et ne relance aucun producteur", () => {
  const root = tempRoot();
  try {
    let validated = false;
    const result = buildCoverageInsightsReport({ root, auditedSha: sha, reports: [definition], validateSonar: () => { validated = true; return [{ status: "OMITTED", reason: "missing" }]; }, validateEvidence: () => ({ gitHead: sha }) });
    assert.equal(validated, true);
    assert.equal(result.scopes[0].state, "NOT_MEASURED");
    assert.equal(result.scopes[0].metrics.branches.pct, null);
    assert.equal(result.warnings.some((warning) => warning.code === "COVERAGE_BELOW_TARGET"), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("les rapports hors Web utilisent la preuve de publication canonique", () => {
  const root = tempRoot();
  try {
    mobileFixture(root);
    let validated = null;
    const result = buildCoverageInsightsReport({
      root,
      auditedSha: sha,
      reports: [mobileDefinition],
      validateSonar: () => [{ status: "VALID" }],
      validatePublicationProof: (input) => { validated = input; },
    });
    assert.equal(result.scopes[0].state, "MEASURED");
    assert.deepEqual(validated, { repositoryRoot: root, candidateSha: sha, scope: "mobile" });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
