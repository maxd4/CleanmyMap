import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, "../..");

function readWorkflow(name) {
  const path = resolve(repositoryRoot, ".github/workflows", name);
  assert.ok(existsSync(path), `${name} must exist`);
  return readFileSync(path, "utf8");
}

function assertCommonWorkflowSecurity(workflow, name) {
  assert.match(workflow, /permissions:\s*\{\}/, `${name} must deny permissions by default`);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/, `${name} must use read-only contents access`);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/, `${name} checkout must be SHA-pinned`);
  assert.match(workflow, /persist-credentials: false/, `${name} checkout must not persist credentials`);
  assert.doesNotMatch(workflow, /secrets\./, `${name} must not use repository secrets`);
  assert.doesNotMatch(workflow, /security-events:\s*write|id-token:\s*write/, `${name} must not request write permissions`);
  assert.doesNotMatch(workflow, /pull_request_target:/, `${name} must not use pull_request_target`);
}

const scorecard = readWorkflow("scorecard.yml");
assertCommonWorkflowSecurity(scorecard, "scorecard.yml");
assert.match(scorecard, /cron: ["']30 1 \* \* 6["']/);
assert.match(scorecard, /workflow_dispatch:/);
assert.doesNotMatch(scorecard, /(^|\n)\s*(push|pull_request):/);
assert.match(scorecard, /ossf\/scorecard-action@2d1146689b8cda280b9bc96326124645441f03bc/);
assert.match(scorecard, /results_format: json/);
assert.match(scorecard, /publish_results: false/);
assert.match(scorecard, /actions\/upload-artifact@[0-9a-f]{40}/);
assert.match(scorecard, /path: scorecard-results\.json/);

const zizmor = readWorkflow("zizmor.yml");
assertCommonWorkflowSecurity(zizmor, "zizmor.yml");
assert.match(zizmor, /push:[\s\S]*paths:\s*\n\s+- \.github\/workflows\/\*\*\n\s+pull_request:/);
assert.match(zizmor, /pull_request:[\s\S]*paths:\s*\n\s+- \.github\/workflows\/\*\*/);
assert.match(zizmor, /workflow_dispatch:/);
assert.match(zizmor, /zizmorcore\/zizmor-action@cc914d7f3750a2d13d75c7f184a1060aa0e9d482/);
assert.match(zizmor, /version: 1\.30\.1/);
assert.match(zizmor, /online-audits: false/);
assert.match(zizmor, /advanced-security: false/);
assert.match(zizmor, /inputs: \.github\/workflows/);
assert.match(zizmor, /- name: Run zizmor[\s\S]*?continue-on-error: true/);
assert.equal(
  (zizmor.match(/continue-on-error:\s*true/g) ?? []).length,
  1,
  "zizmor must be the only non-blocking step",
);
