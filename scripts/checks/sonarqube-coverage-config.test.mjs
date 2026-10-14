import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

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

test("the workflow generates and validates coverage before scanning", () => {
  const workflow = read(".github/workflows/sonarqube-manual.yml");
  const web = workflow.indexOf("run: npm run test:coverage");
  const webRatchet = workflow.indexOf("- name: Verify Web coverage ratchet");
  const mobile = workflow.indexOf("run: npm run quality:mobile-coverage");
  const node = workflow.indexOf("run: npm run test:coverage:node");
  const python = workflow.indexOf("run: npm run test:coverage:python");
  const validator = workflow.indexOf("run: node scripts/checks/prepare-sonarqube-coverage.mjs");
  const scanner = workflow.indexOf("uses: SonarSource/sonarqube-scan-action@");
  assert.ok(web >= 0 && webRatchet > web && mobile > webRatchet && node > mobile && python > node && validator > python && scanner > validator);
  assert.match(workflow, /uses: actions\/setup-python@[0-9a-f]{40}/);
  assert.match(workflow, /run:\s+"?python -m pip install .*requirements-dev\.txt .*requirements-lock\.txt"?/);
});

test("only the Web ratchet is deferred and its final verdict runs after the scan", () => {
  const workflow = read(".github/workflows/sonarqube-manual.yml");
  const ratchetStart = workflow.indexOf("      - name: Verify Web coverage ratchet");
  const mobileStart = workflow.indexOf("      - name: Generate and verify Mobile coverage");
  const scannerStart = workflow.indexOf("      - name: SonarQube Cloud scan");
  const verdictStart = workflow.indexOf("      - name: Enforce Web coverage ratchet verdict");
  const ratchetStep = workflow.slice(ratchetStart, mobileStart);
  const downstreamSteps = workflow.slice(mobileStart, verdictStart);
  const verdictStep = workflow.slice(verdictStart);

  assert.match(ratchetStep, /id: web_coverage_ratchet/);
  assert.match(ratchetStep, /continue-on-error: true/);
  assert.equal((ratchetStep.match(/continue-on-error:\s*true/g) ?? []).length, 1);
  assert.doesNotMatch(downstreamSteps, /continue-on-error:\s*true/);
  assert.ok(verdictStart > scannerStart, "the ratchet verdict must be enforced after SonarQube");
  assert.match(verdictStep, /if: \$\{\{ always\(\) \}\}/);
  assert.match(verdictStep, /WEB_COVERAGE_RATCHET_OUTCOME: \$\{\{ steps\.web_coverage_ratchet\.outcome \}\}/);
  assert.match(verdictStep, /WEB_COVERAGE_RATCHET_OUTCOME.*!= "success"/s);
  assert.match(verdictStep, /exit 1/);
});

function expectedWorkflowConclusion({ webGeneration, ratchet, mobile, lcov, scanner }) {
  if (webGeneration !== "success") return "failure";
  if (mobile !== "success" || lcov !== "success" || scanner !== "success") return "failure";
  if (ratchet !== "success") return "failure";
  return "success";
}

test("workflow outcome cases preserve mandatory failures while allowing downstream evidence", () => {
  const cases = [
    {
      name: "ratchet PASS",
      input: { webGeneration: "success", ratchet: "success", mobile: "success", lcov: "success", scanner: "success" },
      expected: "success",
    },
    {
      name: "ratchet FAIL with successful scan",
      input: { webGeneration: "success", ratchet: "failure", mobile: "success", lcov: "success", scanner: "success" },
      expected: "failure",
    },
    {
      name: "LCOV absent",
      input: { webGeneration: "success", ratchet: "success", mobile: "success", lcov: "failure", scanner: "skipped" },
      expected: "failure",
    },
    {
      name: "scanner error",
      input: { webGeneration: "success", ratchet: "success", mobile: "success", lcov: "success", scanner: "failure" },
      expected: "failure",
    },
  ];

  for (const scenario of cases) {
    assert.equal(expectedWorkflowConclusion(scenario.input), scenario.expected, scenario.name);
  }
});
