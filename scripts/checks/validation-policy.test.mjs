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

test("full validation covers the affected Web suite without relaunching groups", () => {
  const plan = createValidationPlan({
    scope: "full",
    changedFiles: ["apps/web/src/app/(app)/dashboard/page.tsx"],
  });
  const runChecks = readFileSync("scripts/ci/run_checks2.ps1", "utf8");

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

test("API route changes retain the shared API boundary security validation", () => {
  const plan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/src/app/api/actions/route.ts"],
  });

  assert.equal(plan.testMode, "targeted");
  assert.ok(plan.serialHeavy.includes("vitest"));
  assert.ok(plan.targetedVitestFiles.includes("src/app/api/api-boundary.test.ts"));
});

test("Vercel configuration changes use the same build-relevant scope", () => {
  const vercelPlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/vercel.json"],
  });
  const testPlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/src/lib/example.test.ts"],
  });

  assert.equal(vercelPlan.buildRelevant, true);
  assert.equal(testPlan.buildRelevant, false);
});

test("dependency graph and audit-control relevance are distinct", () => {
  const lockfilePlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["package-lock.json"],
  });
  const auditControllerPlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["scripts/security/audit-dependencies.mjs"],
  });
  const governancePlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["documentation/security/dependency-advisory-governance.md"],
  });
  const semgrepToolPlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["scripts/security/run-semgrep-fixtures.mjs"],
  });
  const webSourcePlan = createValidationPlan({
    scope: "changed",
    changedFiles: ["apps/web/src/app/page.tsx"],
  });

  assert.equal(lockfilePlan.dependencyGraphRelevant, true);
  assert.equal(lockfilePlan.dependencyAuditRelevant, true);
  assert.equal(auditControllerPlan.dependencyGraphRelevant, false);
  assert.equal(auditControllerPlan.dependencyAuditRelevant, true);
  assert.equal(auditControllerPlan.securityToolingRelevant, true);
  assert.equal(governancePlan.dependencyAuditRelevant, true);
  assert.equal(semgrepToolPlan.dependencyAuditRelevant, false);
  assert.equal(semgrepToolPlan.securityToolingRelevant, true);
  assert.equal(webSourcePlan.dependencyAuditRelevant, false);
  assert.equal(webSourcePlan.securityToolingRelevant, false);
});

test("heavy commands are excluded from parallel static phases", () => {
  const plan = createValidationPlan({ scope: "full" });
  const parallel = new Set(plan.parallelStatic.labels);

  for (const label of ["test:scripts", "vitest", "build", "test:e2e"]) {
    assert.equal(parallel.has(label), false, `${label} must remain serial`);
  }
  assert.ok(plan.parallelStatic.throttle >= 1 && plan.parallelStatic.throttle <= 4);
});
