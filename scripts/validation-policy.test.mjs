import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  assertFullSuiteCoverage,
  createValidationPlan,
  getVitestFiles,
} from "./validation-policy.mjs";

test("targeted Vitest validation deduplicates overlapping group files", () => {
  const files = getVitestFiles({
    groups: ["security", "regression"],
    testFiles: ["src/proxy.protected-routes.test.ts"],
  });

  assert.equal(files.length, new Set(files).size);
  assert.equal(files.filter((file) => file === "src/proxy.protected-routes.test.ts").length, 1);
});

test("full validation covers security and regression groups without relaunching them", () => {
  const plan = createValidationPlan({ scope: "full" });
  const runChecks = readFileSync("scripts/run_checks2.ps1", "utf8");

  assert.equal(plan.testMode, "full");
  assert.ok(plan.serialHeavy.includes("vitest"));
  assert.ok(!plan.serialHeavy.includes("test:security"));
  assert.ok(!plan.serialHeavy.includes("test:regression-gates"));
  assert.doesNotMatch(runChecks, /npm run test:security/);
  assert.doesNotMatch(runChecks, /npm run test:regression-gates/);
  assertFullSuiteCoverage();
});

test("documentation-only changed scope skips the web build", () => {
  const plan = createValidationPlan({
    scope: "changed",
    changedFiles: ["README.md", "documentation/development/TESTING.md"],
  });

  assert.equal(plan.webRelevant, false);
  assert.equal(plan.buildRelevant, false);
  assert.equal(plan.testMode, "skipped");
  assert.ok(!plan.serialHeavy.includes("build"));
});

test("runtime and configuration changes require the build, test-only changes do not", () => {
  const runtimePlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/src/app/(app)/dashboard/page.tsx"],
  });
  const testPlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/src/lib/example.test.ts"],
  });

  assert.equal(runtimePlan.buildRelevant, true);
  assert.ok(runtimePlan.serialHeavy.includes("build"));
  assert.equal(testPlan.webRelevant, true);
  assert.equal(testPlan.buildRelevant, false);
  assert.ok(!testPlan.serialHeavy.includes("build"));
  assert.ok(testPlan.targetedVitestFiles.includes("src/lib/example.test.ts"));
});

test("heavy commands are excluded from parallel static phases", () => {
  const plan = createValidationPlan({ scope: "full" });
  const parallel = new Set(plan.parallelStatic.labels);

  for (const label of ["test:scripts", "vitest", "build", "test:e2e"]) {
    assert.equal(parallel.has(label), false, `${label} must remain serial`);
  }
  assert.ok(plan.parallelStatic.throttle >= 1 && plan.parallelStatic.throttle <= 4);
});
