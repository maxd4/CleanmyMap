import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import yaml from "js-yaml";

import { assertFullCoverageJobs } from "../ci/full-coverage-gate.mjs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const workflow = () => yaml.load(read(".github/workflows/sonarqube-manual.yml"));
const ciWorkflow = () => yaml.load(read(".github/workflows/ci.yml"));
const step = (steps, name) => steps.find((candidate) => candidate.name === name);

test("Vitest keeps JSON summaries and emits LCOV for both workspaces", () => {
  for (const configPath of ["apps/web/vitest.config.ts", "apps/mobile/vitest.config.ts"]) {
    const config = read(configPath);
    assert.match(config, /json-summary/);
    assert.match(config, /lcovonly/);
  }
});

test("Node and Python generators use the locked coverage tools", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["test:coverage:node"], "node scripts/ci/run-node-coverage.mjs");
  assert.equal(packageJson.scripts["test:coverage:python"], "node scripts/ci/run-python-coverage.mjs");
  assert.equal(packageJson.devDependencies.c8, "12.0.0");
  const pythonRequirements = read("maintenance/python/requirements-dev.txt");
  const pythonLock = read("maintenance/python/requirements-lock.txt");
  assert.match(pythonRequirements, /^coverage>=7\.16,<8$/m);
  assert.match(pythonLock, /^coverage==7\.16\.2$/m);
});

test("SonarQube receives Web, mobile and Node LCOV plus Python coverage", () => {
  const properties = read("sonar-project.properties");
  assert.match(properties, /^sonar\.javascript\.lcov\.reportPaths=apps\/web\/coverage\/lcov\.info,apps\/mobile\/coverage\/lcov\.info,scripts\/coverage\/lcov\.info$/m);
  assert.match(properties, /^sonar\.python\.coverage\.reportPaths=maintenance\/python\/coverage\.xml$/m);
  assert.doesNotMatch(properties, /\*\*\/test\/\*\*/);
  assert.match(properties, /\*\*\/tests\/\*\*/);
  assert.match(properties, /\*\*\/__tests__\/\*\*/);
});

test("the workflow runs four independent producers and validates only successful reports", () => {
  const parsed = workflow();
  const preparation = parsed.jobs["coverage-preparation"];
  const scopes = preparation.strategy.matrix.include.map((entry) => entry.scope);
  assert.deepEqual(scopes, ["web", "mobile", "node", "python"]);
  assert.equal(preparation.strategy["fail-fast"], false);
  assert.equal(preparation.permissions.contents, "read");
  const producer = step(preparation.steps, "Generate ${{ matrix.scope }} coverage");
  const validator = step(preparation.steps, "Validate ${{ matrix.scope }} SonarQube report");
  const stage = step(preparation.steps, "Stage validated ${{ matrix.scope }} report");
  assert.match(producer.if, /always\(\)/);
  assert.equal(producer["continue-on-error"], true);
  assert.match(validator.if, /steps\.producer\.outcome == 'success'/);
  assert.equal(validator["continue-on-error"], true);
  assert.match(stage.if, /steps\.producer\.outcome == 'success'/);
  assert.match(stage.if, /steps\.validator\.outcome == 'success'/);
  assert.match(step(preparation.steps, "Upload validated ${{ matrix.scope }} report").if, /steps\.stage\.outcome == 'success'/);
  assert.match(step(preparation.steps, "Preserve producer and validator failures").run, /exit 1/);
});

test("the canonical analysis job requires complete coverage before scanning", () => {
  const parsed = workflow();
  const analysis = parsed.jobs.sonarqube;
  assert.equal(analysis.needs, "coverage-preparation");
  assert.match(analysis.if, /always\(\)/);
  assert.match(analysis.if, /!cancelled\(\)/);
  assert.equal(analysis.permissions.contents, "read");
  assert.equal(analysis.permissions.actions, "read");
  const full = step(analysis.steps, "Prepare complete canonical SonarQube coverage configuration");
  const scanner = step(analysis.steps, "SonarQube Cloud scan");
  const finalizer = step(analysis.steps, "Publish independent SonarQube statuses");
  assert.match(full.run, /--mode=SONAR_FULL/);
  assert.doesNotMatch(full.run, /--mode=SONAR_PARTIAL/);
  assert.match(full.run, /--manifestOut=artifacts\/sonarqube-manifest\.json/);
  assert.match(scanner.if, /steps\.full\.outcome == 'success'/);
  assert.match(scanner.with.args, /-Dproject\.settings=artifacts\/sonar-project\.properties/);
  assert.match(finalizer.run, /--mode=FINALIZE/);
  assert.match(finalizer.env.SONAR_PREPARATION_OUTCOME, /steps\.full\.outcome/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/setup-python@[0-9a-f]{40}/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/download-artifact@[0-9a-f]{40}/);
});

test("FULL CI runs and gates all four coverage domains independently of the diff scope", () => {
  const parsed = ciWorkflow();
  const full = "github.event_name == 'workflow_dispatch' && inputs.validation_mode == 'FULL'";
  assert.match(parsed.jobs["node-coverage"].if, new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(parsed.jobs["python-validation"].if, new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(step(parsed.jobs["python-validation"].steps, "Python coverage report (changed scope)").if, /validation_mode == 'FULL'/);
  assert.match(step(parsed.jobs["python-validation"].steps, "Upload Python coverage provenance").if, /validation_mode == 'FULL'/);

  const gate = parsed.jobs["full-coverage-gate"];
  assert.deepEqual(gate.needs, ["web-tests", "web-coverage", "mobile-validation", "node-coverage", "python-validation"]);
  assert.match(gate.if, /always\(\)/);
  assert.match(gate.if, /validation_mode == 'FULL'/);
  const download = step(gate.steps, "Download all FULL coverage evidence");
  assert.match(download.with.pattern, /coverage-evidence/);
  assert.equal(download["continue-on-error"], true);
  assert.match(step(gate.steps, "Validate four-domain FULL coverage gate").run, /full-coverage-gate\.mjs/);
});

test("the consumed FULL gate rejects a successful scanner when a coverage job is not successful", () => {
  const jobs = {
    "web-tests": { result: "success" },
    "web-coverage": { result: "success" },
    "mobile-validation": { result: "success" },
    "node-coverage": { result: "skipped" },
    "python-validation": { result: "success" },
    sonarqube: { result: "success" },
  };
  assert.throws(() => assertFullCoverageJobs(jobs), /node-coverage=skipped/);
});
