import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REPORT_DEFINITIONS,
  createSonarProducerResult,
  finalizeSonarAnalysis,
  prepareSonarPartialCoverage,
  validateSonarCoverageReports,
} from "./prepare-sonarqube-coverage.mjs";

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-"));
  fs.mkdirSync(path.join(root, "apps", "web", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "web", "src", "feature.ts"), "export const feature = 1;\n");
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "coverage-summary.json"), JSON.stringify({
    total: {
      lines: { total: 1, covered: 1 },
      branches: { total: 1, covered: 1 },
      functions: { total: 1, covered: 1 },
    },
    "src/feature.ts": {
      lines: { total: 1, covered: 1 },
      branches: { total: 1, covered: 1 },
      functions: { total: 1, covered: 1 },
    },
  }));
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "lcov.info"), [
    "TN:",
    "SF:src\\feature.ts",
    "FN:1,feature",
    "FNDA:1,feature",
    "FNF:1",
    "FNH:1",
    "DA:1,1",
    "BRDA:1,0,0,1",
    "BRF:1",
    "BRH:1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "",
  ].join("\n"));
  return root;
}

function ensureProperties(root) {
  const propertiesPath = path.join(root, "sonar-project.properties");
  if (!fs.existsSync(propertiesPath)) fs.writeFileSync(propertiesPath, [
    "sonar.projectKey=fixture",
    "sonar.javascript.lcov.reportPaths=apps/web/coverage/lcov.info,apps/mobile/coverage/lcov.info,scripts/coverage/lcov.info",
    "sonar.python.coverage.reportPaths=maintenance/python/coverage.xml",
    "",
  ].join("\n"));
}

function writeValidReport(root, scope) {
  ensureProperties(root);
  const definition = REPORT_DEFINITIONS.find((candidate) => candidate.scope === scope);
  if (definition.format === "cobertura") {
    fs.mkdirSync(path.join(root, "maintenance", "python", "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "maintenance", "python", "src", "module.py"), "value = 1\n");
    fs.mkdirSync(path.dirname(path.join(root, definition.coveragePath)), { recursive: true });
    fs.writeFileSync(path.join(root, definition.coveragePath), [
      "<?xml version=\"1.0\" ?>",
      "<coverage><packages><package name=\"src\"><classes>",
      "<class name=\"module\" filename=\"src/module.py\"><lines><line number=\"1\" hits=\"1\"/></lines></class>",
      "</classes></package></packages></coverage>",
    ].join(""));
    return;
  }
  const relativeSource = scope === "node" ? "scripts/fixture/runner.mjs" : `src/${scope}.ts`;
  const sourcePath = path.join(root, ...(definition.sourceRoot === "." ? [] : definition.sourceRoot.split("/")), ...relativeSource.split("/"));
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, "export const value = 1;\n");
  fs.mkdirSync(path.dirname(path.join(root, definition.lcovPath)), { recursive: true });
  fs.writeFileSync(path.join(root, definition.summaryPath), JSON.stringify({
    total: {
      lines: { total: 1, covered: 1 },
      branches: { total: 0, covered: 0 },
      functions: { total: 1, covered: 1 },
    },
    [relativeSource]: {
      lines: { total: 1, covered: 1 },
      branches: { total: 0, covered: 0 },
      functions: { total: 1, covered: 1 },
    },
  }));
  fs.writeFileSync(path.join(root, definition.lcovPath), [
    "TN:",
    `SF:${relativeSource}`,
    "FN:1,runner",
    "FNDA:1,runner",
    "FNF:1",
    "FNH:1",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "",
  ].join("\n"));
}

function writeProducerResults(root, { analyzedSha = "sha-current", runId = "run-1", failedScopes = [], missingScopes = [] } = {}) {
  ensureProperties(root);
  const resultsDir = path.join(root, "artifacts", "sonarqube-results");
  fs.mkdirSync(resultsDir, { recursive: true });
  for (const definition of REPORT_DEFINITIONS) {
    if (missingScopes.includes(definition.scope)) continue;
    const failed = failedScopes.includes(definition.scope);
    const result = createSonarProducerResult({
      scope: definition.scope,
      analyzedSha,
      runId,
      producerOutcome: failed ? "failure" : "success",
      validatorOutcome: failed ? "skipped" : "success",
    });
    fs.writeFileSync(path.join(resultsDir, `${definition.scope}.json`), `${JSON.stringify(result, null, 2)}\n`);
  }
  return resultsDir;
}

test("normalizes workspace-relative SF paths and verifies LCOV against JSON summary", () => {
  const root = fixtureRoot();
  const result = validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  });
  assert.equal(result[0].normalized, true);
  assert.match(fs.readFileSync(path.join(root, "apps/web/coverage/lcov.info"), "utf8"), /SF:apps\/web\/src\/feature\.ts/);
});

test("fails closed when LCOV points to a missing source", () => {
  const root = fixtureRoot();
  const lcovPath = path.join(root, "apps/web/coverage/lcov.info");
  const original = fs.readFileSync(lcovPath, "utf8");
  fs.writeFileSync(lcovPath, original.replace("src\\feature.ts", "src\\missing.ts"));
  assert.throws(() => validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  }), /do not resolve|does not resolve/);
});

test("fails closed when an LCOV report is absent", () => {
  const root = fixtureRoot();
  fs.rmSync(path.join(root, "apps/web/coverage/lcov.info"));
  assert.throws(() => validateSonarCoverageReports({
    root,
    reports: [{ scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" }],
  }), /LCOV report is missing/);
});

test("normalizes Node LCOV paths rooted at the repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-node-"));
  fs.mkdirSync(path.join(root, "scripts", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts", "fixture"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "fixture", "runner.mjs"), "export const runner = 1;\n");
  fs.writeFileSync(path.join(root, "scripts", "coverage", "coverage-summary.json"), JSON.stringify({
    total: {
      lines: { total: 1, covered: 1 },
      branches: { total: 0, covered: 0 },
      functions: { total: 1, covered: 1 },
    },
    "scripts/fixture/runner.mjs": {
      lines: { total: 1, covered: 1 },
      branches: { total: 0, covered: 0 },
      functions: { total: 1, covered: 1 },
    },
  }));
  fs.writeFileSync(path.join(root, "scripts", "coverage", "lcov.info"), [
    "TN:",
    "SF:scripts\\fixture\\runner.mjs",
    "FN:1,runner",
    "FNDA:1,runner",
    "FNF:1",
    "FNH:1",
    "DA:1,1",
    "LF:1",
    "LH:1",
    "end_of_record",
    "",
  ].join("\n"));
  const result = validateSonarCoverageReports({
    root,
    reports: [{ scope: "node", lcovPath: "scripts/coverage/lcov.info", summaryPath: "scripts/coverage/coverage-summary.json", sourceRoot: "." }],
  });
  assert.equal(result[0].files, 1);
  assert.match(fs.readFileSync(path.join(root, "scripts/coverage/lcov.info"), "utf8"), /SF:scripts\/fixture\/runner\.mjs/);
});

test("validates Python Cobertura paths and rejects empty measurements", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-python-"));
  fs.mkdirSync(path.join(root, "maintenance", "python", "coverage"), { recursive: true });
  fs.mkdirSync(path.join(root, "maintenance", "python", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "maintenance", "python", "src", "module.py"), "value = 1\n");
  const coveragePath = path.join(root, "maintenance", "python", "coverage.xml");
  fs.writeFileSync(coveragePath, [
    "<?xml version=\"1.0\" ?>",
    "<coverage line-rate=\"0.5\"><packages><package name=\"src\"><classes>",
    "<class name=\"module\" filename=\"src/module.py\"><methods></methods><lines><line number=\"1\" hits=\"1\"/></lines></class>",
    "</classes></package></packages></coverage>",
  ].join(""));
  const result = validateSonarCoverageReports({
    root,
    reports: [{ scope: "python", format: "cobertura", coveragePath: "maintenance/python/coverage.xml", sourceRoot: "maintenance/python" }],
  });
  assert.equal(result[0].files, 1);
  fs.writeFileSync(coveragePath, "<coverage><packages><package><classes><class filename=\"src/module.py\"><lines/></class></classes></package></packages></coverage>");
  assert.throws(() => validateSonarCoverageReports({
    root,
    reports: [{ scope: "python", format: "cobertura", coveragePath: "maintenance/python/coverage.xml", sourceRoot: "maintenance/python" }],
  }), /no instrumented classes with line measurements/);
});

test("imports four validated reports and produces a complete SonarQube manifest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-all-"));
  for (const definition of REPORT_DEFINITIONS) writeValidReport(root, definition.scope);
  const resultsDir = writeProducerResults(root);
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  assert.equal(manifest.statuses.sonarCoverage, "COMPLETE");
  assert.equal(manifest.statuses.sonarTests, "PASS");
  assert.equal(manifest.statuses.sonarIntegrity, "PASS");
  assert.equal(manifest.reports.filter((report) => report.imported).length, 4);
  assert.match(fs.readFileSync(path.join(root, "artifacts", "sonar-project.properties"), "utf8"), /sonar\.javascript\.lcov\.reportPaths=.*apps\/web\/coverage\/lcov\.info/);
  assert.match(fs.readFileSync(path.join(root, "artifacts", "sonar-project.properties"), "utf8"), /sonar\.python\.coverage\.reportPaths=maintenance\/python\/coverage\.xml/);
});

test("keeps a failed Node producer visible and imports the other three reports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-node-failure-"));
  for (const scope of ["web", "mobile", "python"]) writeValidReport(root, scope);
  const resultsDir = writeProducerResults(root, { failedScopes: ["node"] });
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  assert.equal(manifest.statuses.sonarCoverage, "PARTIAL");
  assert.equal(manifest.statuses.sonarTests, "FAIL");
  assert.equal(manifest.statuses.sonarIntegrity, "PASS");
  assert.equal(manifest.reports.find((report) => report.scope === "node").imported, false);
  const properties = fs.readFileSync(path.join(root, "artifacts", "sonar-project.properties"), "utf8");
  assert.doesNotMatch(properties, /scripts\/coverage\/lcov\.info/);
  assert.match(properties, /apps\/web\/coverage\/lcov\.info/);
});

test("omits a corrupted LCOV while preserving valid reports and its diagnostic", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-corrupt-"));
  for (const definition of REPORT_DEFINITIONS) writeValidReport(root, definition.scope);
  const webPath = path.join(root, "apps", "web", "coverage", "lcov.info");
  fs.writeFileSync(webPath, fs.readFileSync(webPath, "utf8").replace("src/web.ts", "src/missing.ts"));
  const resultsDir = writeProducerResults(root);
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  const web = manifest.reports.find((report) => report.scope === "web");
  assert.equal(web.imported, false);
  assert.equal(web.validatorStatus, "FAIL");
  assert.equal(web.integrityIssue, true);
  assert.equal(manifest.statuses.sonarIntegrity, "FAIL");
  assert.match(web.reason, /does not resolve/);
  assert.equal(manifest.reports.filter((report) => report.imported).length, 3);
  assert.equal(finalizeSonarAnalysis({ manifest, scannerOutcome: "success", preparationOutcome: "success" }), 1);
});

test("fails integrity when a PASS report is absent at import while the scanner can continue", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-missing-"));
  for (const definition of REPORT_DEFINITIONS) writeValidReport(root, definition.scope);
  const resultsDir = writeProducerResults(root);
  fs.rmSync(path.join(root, "scripts", "coverage", "lcov.info"));
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  const node = manifest.reports.find((report) => report.scope === "node");
  assert.equal(node.imported, false);
  assert.equal(node.validatorStatus, "FAIL");
  assert.equal(node.omission.kind, "INVALID_ARTIFACT");
  assert.equal(manifest.statuses.sonarIntegrity, "FAIL");
  assert.equal(finalizeSonarAnalysis({ manifest, scannerOutcome: "success", preparationOutcome: "success" }), 1);
});

test("allows static analysis with no coverage and omits every coverage property", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-none-"));
  const resultsDir = writeProducerResults(root, { missingScopes: REPORT_DEFINITIONS.map((definition) => definition.scope) });
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  assert.equal(manifest.statuses.sonarCoverage, "UNAVAILABLE");
  assert.equal(manifest.statuses.sonarTests, "NOT_RUN");
  assert.equal(manifest.statuses.sonarIntegrity, "FAIL");
  const properties = fs.readFileSync(path.join(root, "artifacts", "sonar-project.properties"), "utf8");
  assert.doesNotMatch(properties, /sonar\.javascript\.lcov\.reportPaths=/);
  assert.doesNotMatch(properties, /sonar\.python\.coverage\.reportPaths=/);
});

test("omits a producer result attached to another SHA/run by domain and keeps static analysis available", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-stale-"));
  for (const definition of REPORT_DEFINITIONS) writeValidReport(root, definition.scope);
  const resultsDir = writeProducerResults(root);
  const nodeResultPath = path.join(resultsDir, "node.json");
  const nodeResult = JSON.parse(fs.readFileSync(nodeResultPath, "utf8"));
  nodeResult.analyzedSha = "sha-other";
  nodeResult.runId = "run-other";
  fs.writeFileSync(nodeResultPath, `${JSON.stringify(nodeResult, null, 2)}\n`);
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  const node = manifest.reports.find((report) => report.scope === "node");
  assert.equal(node.imported, false);
  assert.equal(node.omission.kind, "INVALID_PROVENANCE");
  assert.match(node.reason, /not attached to the analyzed SHA\/run/);
  assert.equal(manifest.statuses.sonarCoverage, "PARTIAL");
  assert.equal(manifest.statuses.sonarIntegrity, "FAIL");
  assert.equal(manifest.omittedResults.some((omission) => omission.scope === "node" && omission.kind === "INVALID_PROVENANCE"), true);
  const properties = fs.readFileSync(path.join(root, "artifacts", "sonar-project.properties"), "utf8");
  assert.doesNotMatch(properties, /scripts\/coverage\/lcov\.info/);
  assert.match(properties, /apps\/web\/coverage\/lcov\.info/);
  assert.equal(finalizeSonarAnalysis({ manifest, scannerOutcome: "success", preparationOutcome: "success" }), 1);
});

test("isolates malformed producer results without aborting the partial scanner preparation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-sonar-partial-malformed-"));
  for (const definition of REPORT_DEFINITIONS) writeValidReport(root, definition.scope);
  const resultsDir = writeProducerResults(root);
  fs.writeFileSync(path.join(resultsDir, "web.json"), "{ malformed");
  const manifest = prepareSonarPartialCoverage({
    root,
    producerResultsDir: resultsDir,
    analyzedSha: "sha-current",
    runId: "run-1",
    propertiesOut: path.join(root, "artifacts", "sonar-project.properties"),
    manifestOut: path.join(root, "artifacts", "sonarqube-manifest.json"),
  });
  const web = manifest.reports.find((report) => report.scope === "web");
  assert.equal(web.imported, false);
  assert.equal(web.omission.kind, "MALFORMED_RESULT");
  assert.equal(manifest.statuses.sonarIntegrity, "FAIL");
  assert.equal(finalizeSonarAnalysis({ manifest, scannerOutcome: "success", preparationOutcome: "success" }), 1);
});

test("final status keeps a successful scan distinct from failed preparation tests", () => {
  const manifest = {
    analyzedSha: "sha-current",
    statuses: { sonarCoverage: "PARTIAL", sonarTests: "FAIL" },
    reports: [],
  };
  assert.equal(finalizeSonarAnalysis({ manifest, scannerOutcome: "success", preparationOutcome: "failure" }), 1);
  assert.equal(finalizeSonarAnalysis({ manifest: { ...manifest, statuses: { ...manifest.statuses, sonarIntegrity: "PASS" } }, scannerOutcome: "success", preparationOutcome: "success" }), 0);
  assert.equal(finalizeSonarAnalysis({ manifest: { ...manifest, statuses: { ...manifest.statuses, sonarIntegrity: "FAIL" } }, scannerOutcome: "success", preparationOutcome: "success" }), 1);
});
