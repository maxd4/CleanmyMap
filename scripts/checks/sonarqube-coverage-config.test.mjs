import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import yaml from "js-yaml";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const workflow = () => yaml.load(read(".github/workflows/sonarqube-manual.yml"));
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
  assert.match(packageJson.scripts["test:coverage:node"], /^c8 .*npm run test:scripts$/);
  assert.match(packageJson.scripts["test:coverage:python"], /^python -m coverage run .*pytest/);
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

test("the analysis job is independent, imports only validated artifacts, and preserves the scanner gate", () => {
  const parsed = workflow();
  const analysis = parsed.jobs.sonarqube;
  assert.equal(analysis.needs, "coverage-preparation");
  assert.match(analysis.if, /always\(\)/);
  assert.match(analysis.if, /!cancelled\(\)/);
  assert.equal(analysis.permissions.contents, "read");
  assert.equal(analysis.permissions.actions, "read");
  const partial = step(analysis.steps, "Prepare effective partial SonarQube coverage configuration");
  const scanner = step(analysis.steps, "SonarQube Cloud scan");
  const finalizer = step(analysis.steps, "Publish independent SonarQube statuses");
  assert.match(partial.run, /--mode=SONAR_PARTIAL/);
  assert.match(partial.run, /--manifestOut=artifacts\/sonarqube-manifest\.json/);
  assert.match(scanner.if, /steps\.partial\.outcome == 'success'/);
  assert.match(scanner.with.args, /-Dproject\.settings=artifacts\/sonar-project\.properties/);
  assert.match(finalizer.run, /--mode=FINALIZE/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/setup-python@[0-9a-f]{40}/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(read(".github/workflows/sonarqube-manual.yml"), /uses: actions\/download-artifact@[0-9a-f]{40}/);
});

function expectedWorkflowConclusion({ webGeneration, coverageComparison, mobile, lcov, scanner }) {
  const preparation = [webGeneration, mobile, lcov].every((status) => status === "success") && coverageComparison !== "mandatory-failure";
  const analysis = scanner === "success";
  return preparation && analysis ? "success" : "failure";
}

test("workflow outcome cases allow numeric regressions but preserve mandatory failures", () => {
  const cases = [
    {
      name: "comparison PASS",
      input: { webGeneration: "success", coverageComparison: "pass", mobile: "success", lcov: "success", scanner: "success" },
      expected: "success",
    },
    {
      name: "numeric regression with successful scan",
      input: { webGeneration: "success", coverageComparison: "informative-regression", mobile: "success", lcov: "success", scanner: "success" },
      expected: "success",
    },
    {
      name: "LCOV absent",
      input: { webGeneration: "success", coverageComparison: "pass", mobile: "success", lcov: "failure", scanner: "skipped" },
      expected: "failure",
    },
    {
      name: "scanner error",
      input: { webGeneration: "success", coverageComparison: "pass", mobile: "success", lcov: "success", scanner: "failure" },
      expected: "failure",
    },
    {
      name: "mandatory coverage evidence error",
      input: { webGeneration: "success", coverageComparison: "mandatory-failure", mobile: "success", lcov: "success", scanner: "skipped" },
      expected: "failure",
    },
    {
      name: "Node producer failure still allows a successful scanner but not a green workflow",
      input: { webGeneration: "success", coverageComparison: "pass", mobile: "success", lcov: "failure", scanner: "success" },
      expected: "failure",
    },
  ];

  for (const scenario of cases) {
    assert.equal(expectedWorkflowConclusion(scenario.input), scenario.expected, scenario.name);
  }
});
