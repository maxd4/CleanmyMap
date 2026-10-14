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

test("SonarQube receives both workspace LCOV reports without a broad test path", () => {
  const properties = read("sonar-project.properties");
  assert.match(properties, /^sonar\.javascript\.lcov\.reportPaths=apps\/web\/coverage\/lcov\.info,apps\/mobile\/coverage\/lcov\.info$/m);
  assert.doesNotMatch(properties, /\*\*\/test\/\*\*/);
  assert.match(properties, /\*\*\/tests\/\*\*/);
  assert.match(properties, /\*\*\/__tests__\/\*\*/);
});

test("the workflow generates and validates coverage before scanning", () => {
  const workflow = read(".github/workflows/sonarqube-manual.yml");
  const web = workflow.indexOf("run: npm run test:coverage");
  const webRatchet = workflow.indexOf("run: npm run quality:coverage -- --from-existing-summary");
  const mobile = workflow.indexOf("run: npm run quality:mobile-coverage");
  const validator = workflow.indexOf("run: node scripts/checks/prepare-sonarqube-coverage.mjs");
  const scanner = workflow.indexOf("uses: SonarSource/sonarqube-scan-action@");
  assert.ok(web >= 0 && webRatchet > web && mobile > webRatchet && validator > mobile && scanner > validator);
});
