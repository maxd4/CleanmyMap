import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyValidationFailure,
  createModeValidationPlan,
  getBudgetDecision,
  VALIDATION_MODE_BUDGETS,
} from "./validation-modes.mjs";
import {
  resolveAssociatedScriptTestFiles,
  resolveAssociatedWebTestFiles,
  resolveMigrationContracts,
} from "./validation-resolution.mjs";

function ids(plan) {
  return plan.checks.map((check) => check.id);
}

test("DEVELOPMENT docs-only keeps the fast plan targeted", () => {
  const plan = createModeValidationPlan({ mode: "FAST", changedFiles: ["documentation/development/TESTING.md"] });
  assert.ok(ids(plan).includes("documentation-governance"));
  assert.ok(!ids(plan).some((id) => ["test:coverage", "quality:duplication", "quality:cycles", "quality:dead-code", "test:e2e"].includes(id)));
  assert.ok(!ids(plan).includes("build"));
  assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS.FAST);
});

test("DEVELOPMENT Web changes stay targeted without automatic quality ratchets", () => {
  const plan = createModeValidationPlan({ mode: "FAST", changedFiles: ["apps/web/src/lib/chat/polls.ts"] });
  assert.ok(ids(plan).includes("typecheck"));
  assert.ok(ids(plan).includes("lint-targeted"));
  assert.ok(ids(plan).includes("vitest-targeted"));
  for (const id of ["quality:top-heavy", "quality:complexity", "quality:dead-code", "quality:duplication", "quality:cycles"]) {
    assert.equal(ids(plan).includes(id), false, `${id} must remain FULL-only in DEVELOPMENT`);
  }
  assert.ok(!ids(plan).includes("test:coverage"));
  assert.ok(!ids(plan).includes("build"));
});

test("DEVELOPMENT script changes never fan out to the complete script suite", () => {
  const plan = createModeValidationPlan({ mode: "FAST", changedFiles: ["scripts/ci/validation-modes.mjs"] });
  assert.ok(!ids(plan).includes("scripts-tests"));
  assert.ok(ids(plan).includes("scripts-tests-targeted"));
  assert.ok(!ids(plan).includes("quality:duplication"));
});

test("FULL is global even for documentation-only candidates", () => {
  const plan = createModeValidationPlan({ mode: "FULL", changedFiles: ["documentation/development/TESTING.md"] });
  for (const id of [
    "test:coverage", "quality:coverage", "typecheck", "lint", "quality:top-heavy",
    "quality:complexity", "quality:dead-code", "quality:duplication", "quality:cycles",
    "quality:mutation", "test:scripts", "mobile:test", "quality:mobile-coverage",
    "test:e2e", "github-security-full", "supabase-full", "build",
  ]) {
    assert.ok(ids(plan).includes(id), `missing FULL check ${id}`);
  }
  assert.ok(plan.deduplicated.some((entry) => entry.id === "test:security" && entry.status === "ALREADY_PROVEN"));
  assert.ok(plan.deduplicated.some((entry) => entry.id === "test:regression-gates" && entry.status === "ALREADY_PROVEN"));
  assert.equal(plan.budgetSeconds, null);
});

test("FULL is global for mobile-only candidates and retains Web proof", () => {
  const plan = createModeValidationPlan({ mode: "FULL", changedFiles: ["apps/mobile/App.tsx"] });
  assert.ok(ids(plan).includes("test:coverage"));
  assert.ok(ids(plan).includes("mobile:typecheck"));
  assert.ok(ids(plan).includes("mobile:security"));
  assert.ok(ids(plan).includes("quality:mobile-coverage"));
  assert.ok(ids(plan).includes("build"));
});

test("FULL keeps canonical Web command and does not relaunch covered groups", () => {
  const plan = createModeValidationPlan({ mode: "FULL", changedFiles: ["package.json"] });
  assert.deepEqual(plan.checks.find((check) => check.id === "test:coverage").command, {
    executable: "npm",
    args: ["run", "test:coverage"],
  });
  assert.equal(ids(plan).includes("test:security"), false);
  assert.equal(ids(plan).includes("test:regression-gates"), false);
  assert.equal(new Set(ids(plan)).size, ids(plan).length);
});

test("migration families retain their specialized FAST contract", () => {
  const migration = "apps/web/supabase/migrations/20260915000021_action_registrations_browser_deny_policy.sql";
  assert.deepEqual(resolveMigrationContracts([migration]), [{
    family: "action_registrations",
    scriptTests: ["scripts/checks/action-registrations-contract.test.mjs"],
    vitestTests: [],
  }]);
  const plan = createModeValidationPlan({ mode: "FAST", changedFiles: [migration] });
  assert.ok(ids(plan).includes("action-registrations-contract"));
  assert.equal(ids(plan).includes("test:scripts"), false);
});

test("co-located Web and script tests are resolved without inventing tests", () => {
  assert.deepEqual(resolveAssociatedWebTestFiles(["apps/web/src/lib/chat/polls.ts"], {
    existingFiles: ["apps/web/src/lib/chat/polls.ts", "apps/web/src/lib/chat/polls.test.ts"],
  }), ["src/lib/chat/polls.test.ts"]);
  assert.deepEqual(resolveAssociatedScriptTestFiles(["scripts/ci/validation-modes.mjs"], {
    existingFiles: ["scripts/ci/validation-modes.mjs", "scripts/ci/validation-modes.test.mjs"],
  }), ["scripts/ci/validation-modes.test.mjs"]);
  assert.deepEqual(resolveAssociatedScriptTestFiles(["scripts/ci/no-test-here.mjs"], {
    existingFiles: ["scripts/ci/no-test-here.mjs"],
  }), []);
});

test("candidate scopes select the matching diff and secret boundaries", () => {
  const worktreePlan = createModeValidationPlan({ mode: "FAST", candidateScope: "WORKTREE" });
  const stagedPlan = createModeValidationPlan({ mode: "FAST", candidateScope: "STAGED" });
  assert.ok(ids(worktreePlan).includes("diff-check-staged"));
  assert.equal(ids(stagedPlan).includes("diff-check-staged"), false);
  assert.deepEqual(stagedPlan.checks[0].command.args, ["diff", "--cached", "--check"]);
  assert.deepEqual(stagedPlan.checks[1].command.args, ["run", "security:secrets", "--", "--staged-only"]);
});

test("budget decision is deterministic and FULL has no global budget", () => {
  assert.equal(getBudgetDecision({ elapsedSeconds: 179, estimatedSeconds: 2, budgetSeconds: 180 }).status, "NOT_RUN_TIME_BUDGET");
  assert.equal(getBudgetDecision({ elapsedSeconds: 10, estimatedSeconds: 2, budgetSeconds: null }).decision, "execute");
  assert.equal(VALIDATION_MODE_BUDGETS.FULL, null);
});

test("foreign failures require a verified pre-existing proof", () => {
  assert.equal(classifyValidationFailure({
    candidateChangedFiles: ["apps/web/src/example.ts"],
    failureFiles: ["apps/mobile/src/parallel.ts"],
  }), "FAIL");
  assert.equal(classifyValidationFailure({
    candidateChangedFiles: ["apps/web/src/example.ts"],
    failureFiles: ["apps/mobile/src/parallel.ts"],
    preexistingProof: { verified: true, kind: "baseline", source: "baseline" },
  }), "PREEXISTING_PARALLEL_FAILURE");
});
