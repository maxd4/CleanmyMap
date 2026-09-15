import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyValidationFailure,
  createModeValidationPlan,
  getBudgetDecision,
  VALIDATION_MODE_BUDGETS,
} from "./validation-modes.mjs";

function ids(plan) {
  return plan.checks.map((check) => check.id);
}

test("RAPIDE docs-only avoids Vitest and build", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["documentation/development/TESTING.md"],
  });
  assert.ok(ids(plan).includes("documentation-governance"));
  assert.ok(!ids(plan).includes("vitest-full"));
  assert.ok(!ids(plan).includes("vitest-targeted"));
  assert.ok(!ids(plan).includes("build"));
  assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS.FAST);
});

test("RAPIDE TypeScript uses targeted evidence without a full suite", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/src/app/example/page.tsx", "apps/web/src/app/example/page.test.tsx"],
  });
  assert.ok(ids(plan).includes("typecheck"));
  assert.ok(ids(plan).includes("lint-targeted"));
  assert.ok(ids(plan).includes("vitest-targeted"));
  assert.ok(!ids(plan).includes("vitest-full"));
  assert.ok(!ids(plan).includes("build"));
});

test("RAPIDE security and Supabase changes select their contracts", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: [
      "apps/web/src/app/api/example/route.ts",
      "apps/web/supabase/migrations/20260915000099_example.sql",
    ],
  });
  assert.ok(ids(plan).includes("test:security"));
  assert.ok(ids(plan).includes("supabase-migration-tree"));
  assert.ok(ids(plan).includes("vitest-targeted"));
  assert.equal(new Set(ids(plan)).size, ids(plan).length);
});

test("COMPLET runs shared web evidence once and marks security groups already proven", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["apps/web/src/app/example/page.tsx"],
  });
  assert.ok(ids(plan).includes("vitest-full"));
  assert.ok(ids(plan).includes("lint"));
  assert.ok(ids(plan).includes("build"));
  assert.ok(ids(plan).includes("mobile-typecheck"));
  assert.ok(ids(plan).includes("root-file-hygiene"));
  assert.ok(ids(plan).includes("vercel-ci-audit"));
  assert.ok(!ids(plan).includes("test:security"));
  assert.ok(!ids(plan).includes("test:regression-gates"));
  assert.deepEqual(plan.deduplicated.map((entry) => entry.status), [
    "ALREADY_PROVEN",
    "ALREADY_PROVEN",
    "ALREADY_PROVEN",
  ]);
  assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS.FULL);
});

test("both plans have unique checks and stay within their hard budgets", () => {
  for (const mode of ["FAST", "FULL"]) {
    const plan = createModeValidationPlan({ mode, changedFiles: ["package.json"] });
    assert.equal(new Set(ids(plan)).size, ids(plan).length);
    assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS[mode]);
  }
});

test("candidate scopes select the matching diff and secret boundaries", () => {
  const worktreePlan = createModeValidationPlan({ mode: "FAST", candidateScope: "WORKTREE" });
  const stagedPlan = createModeValidationPlan({ mode: "FAST", candidateScope: "STAGED" });
  assert.ok(ids(worktreePlan).includes("diff-check-staged"));
  assert.equal(ids(stagedPlan).includes("diff-check-staged"), false);
  assert.equal(stagedPlan.checks[0].command.executable, "git");
  assert.deepEqual(stagedPlan.checks[0].command.args, ["diff", "--cached", "--check"]);
  assert.deepEqual(stagedPlan.checks[1].command.args, ["run", "security:secrets", "--", "--staged-only"]);
});

test("the runner keeps a cleanup boundary for timeout and command failure", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./run_validation_mode.mjs", import.meta.url), "utf8");
  assert.match(source, /finally\s*\{/);
  assert.match(source, /TIME_BUDGET_EXCEEDED/);
});

test("budget decision is deterministic and reports time-budget skips", () => {
  assert.equal(
    getBudgetDecision({ elapsedSeconds: 179, estimatedSeconds: 2, budgetSeconds: 180 }).status,
    "NOT_RUN_TIME_BUDGET",
  );
  assert.equal(
    getBudgetDecision({ elapsedSeconds: 10, estimatedSeconds: 2, budgetSeconds: 180 }).decision,
    "execute",
  );
});

test("foreign failures are classified as pre-existing parallel failures", () => {
  assert.equal(
    classifyValidationFailure({
      candidateChangedFiles: ["apps/web/src/example.ts"],
      failureFiles: ["apps/mobile/src/parallel.ts"],
    }),
    "PREEXISTING_PARALLEL_FAILURE",
  );
  assert.equal(
    classifyValidationFailure({
      candidateChangedFiles: ["apps/web/src/example.ts"],
      failureFiles: ["apps/web/src/example.ts"],
    }),
    "FAIL",
  );
});
