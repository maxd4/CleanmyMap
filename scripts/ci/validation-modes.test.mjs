import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyValidationFailure,
  createModeValidationPlan,
  getBudgetDecision,
  VALIDATION_MODE_BUDGETS,
} from "./validation-modes.mjs";
import { resolveAssociatedWebTestFiles, resolveMigrationContracts } from "./validation-resolution.mjs";

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
  assert.ok(!ids(plan).includes("semgrep-architecture"));
  assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS.FAST);
});

test("RAPIDE TypeScript uses targeted evidence without a full suite", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/src/lib/chat/polls.ts"],
  });
  assert.ok(ids(plan).includes("typecheck"));
  assert.ok(ids(plan).includes("semgrep-architecture"));
  assert.ok(ids(plan).includes("lint-targeted"));
  assert.ok(ids(plan).includes("vitest-targeted"));
  assert.deepEqual(
    plan.checks.find((check) => check.id === "quality-complexity").command,
    { executable: "npm", args: ["run", "quality:complexity", "--changed-only"] },
  );
  assert.ok(!ids(plan).includes("vitest-full"));
  assert.ok(!ids(plan).includes("build"));
  const lint = plan.checks.find((check) => check.id === "lint-targeted");
  assert.deepEqual(lint.command.args, ["eslint", "--max-warnings=0", "--config", "apps/web/eslint.config.mjs", "apps/web/src/lib/chat/polls.ts"]);
});

test("RAPIDE Motion/reveal changes run the canonical Motion governance check", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/src/lib/animations/use-gsap-reveal.ts"],
  });

  assert.ok(ids(plan).includes("check:motion"));
  assert.deepEqual(
    plan.checks.find((check) => check.id === "check:motion").command,
    { executable: "npm", args: ["run", "check:motion"] },
  );
});

test("RAPIDE resolves an unchanged co-located sibling test", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/src/lib/chat/polls.ts"],
  });
  const targeted = plan.checks.find((check) => check.id === "vitest-targeted");
  assert.ok(targeted);
  assert.deepEqual(targeted.testFiles, ["src/lib/chat/polls.test.ts"]);
});

test("RAPIDE excludes deleted Web files from ESLint targets", () => {
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: [
      "apps/web/src/lib/actions/geometry/route-geometry.test.ts",
      "apps/web/src/lib/chat/polls.ts",
    ],
  });
  const lint = plan.checks.find((check) => check.id === "lint-targeted");
  assert.deepEqual(lint.command.args, ["eslint", "--max-warnings=0", "--config", "apps/web/eslint.config.mjs", "apps/web/src/lib/chat/polls.ts"]);
});

test("a source without a sibling test does not invent one", () => {
  assert.deepEqual(
    resolveAssociatedWebTestFiles(["apps/web/src/lib/does-not-exist.ts"], {
      existingFiles: ["apps/web/src/lib/does-not-exist.ts"],
    }),
    [],
  );
});

test("co-located test resolution deduplicates multiple sources", () => {
  assert.deepEqual(
    resolveAssociatedWebTestFiles(
      ["apps/web/src/lib/chat/polls.ts", "apps/web/src/lib/chat/polls.tsx"],
      { existingFiles: ["apps/web/src/lib/chat/polls.test.ts"] },
    ),
    ["src/lib/chat/polls.test.ts"],
  );
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
  assert.ok(ids(plan).includes("semgrep-architecture"));
  assert.ok(ids(plan).includes("supabase-migration-tree"));
  assert.equal(new Set(ids(plan)).size, ids(plan).length);
});

test("migration families select their specialized contract", () => {
  const contracts = resolveMigrationContracts([
    "apps/web/supabase/migrations/20260915000021_action_registrations_browser_deny_policy.sql",
  ]);
  assert.deepEqual(contracts, [{
    family: "action_registrations",
    scriptTests: ["scripts/checks/action-registrations-contract.test.mjs"],
    vitestTests: [],
  }]);
  const plan = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/supabase/migrations/20260915000021_action_registrations_browser_deny_policy.sql"],
  });
  assert.ok(ids(plan).includes("action-registrations-contract"));
  assert.equal(ids(plan).includes("scripts-tests"), false);
  assert.deepEqual(
    plan.checks.find((check) => check.id === "action-registrations-contract").command,
    { executable: "node", args: ["--test", "scripts/checks/action-registrations-contract.test.mjs"] },
  );
});

test("COMPLET Supabase-only stays in the DB/security domain", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: [
      "apps/web/supabase/migrations/20260915000021_action_registrations_browser_deny_policy.sql",
    ],
  });
  assert.ok(ids(plan).includes("supabase-migration-tree"));
  assert.ok(ids(plan).includes("action-registrations-contract"));
  assert.ok(ids(plan).includes("test:security"));
  assert.ok(!ids(plan).some((id) => ["vitest-full", "typecheck", "lint", "build", "mobile-typecheck"].includes(id)));
});

test("COMPLET Web plus Supabase includes affected consumers without mobile fan-out", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: [
      "apps/web/src/app/api/example/route.ts",
      "apps/web/supabase/migrations/20260915000099_example.sql",
    ],
  });
  assert.ok(ids(plan).includes("vitest-full"));
  assert.deepEqual(
    plan.checks.find((check) => check.id === "quality-complexity").command,
    { executable: "npm", args: ["run", "quality:complexity"] },
  );
  assert.deepEqual(
    plan.checks.find((check) => check.id === "quality-duplication").command,
    { executable: "npm", args: ["run", "quality:duplication"] },
  );
  assert.deepEqual(
    plan.checks.find((check) => check.id === "quality-cycles").command,
    { executable: "npm", args: ["run", "quality:cycles"] },
  );
  assert.deepEqual(
    plan.checks.find((check) => check.id === "quality-dead-code").command,
    { executable: "npm", args: ["run", "quality:dead-code"] },
  );
  assert.deepEqual(
    plan.checks.find((check) => check.id === "vitest-full").command,
    { executable: "npm", args: ["run", "quality:coverage"] },
  );
  assert.ok(ids(plan).includes("supabase-migration-tree"));
  assert.ok(!ids(plan).includes("mobile-typecheck"));
  assert.ok(!ids(plan).includes("test:security"));
});

test("COMPLET stays blast-radius aware and strengthens the affected Web domain", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["apps/web/src/app/example/page.tsx"],
  });
  assert.ok(ids(plan).includes("vitest-full"));
  assert.deepEqual(
    plan.checks.find((check) => check.id === "vitest-full").command,
    { executable: "npm", args: ["run", "quality:coverage"] },
  );
  assert.ok(ids(plan).includes("lint"));
  assert.ok(ids(plan).includes("build"));
  assert.ok(ids(plan).includes("root-file-hygiene"));
  assert.ok(ids(plan).includes("vercel-ci-audit"));
  assert.ok(!ids(plan).includes("mobile-typecheck"));
  assert.ok(!ids(plan).includes("test:security"));
  assert.ok(!ids(plan).includes("test:regression-gates"));
  assert.deepEqual(plan.deduplicated.map((entry) => entry.status), [
    "ALREADY_PROVEN",
    "ALREADY_PROVEN",
  ]);
  assert.ok(plan.plannedSeconds <= VALIDATION_MODE_BUDGETS.FULL);
});

test("COMPLET script-only changes include the dead-code ratchet", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["scripts/checks/dead-code-policy.mjs"],
  });
  assert.ok(ids(plan).includes("quality-dead-code"));
  assert.equal(plan.domains.deadCodeRelevant, true);
});

test("COMPLET docs-only does not fan out to Web, mobile, or build", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["documentation/development/TESTING.md"],
  });
  assert.ok(ids(plan).includes("documentation-governance"));
  assert.ok(ids(plan).includes("root-file-hygiene"));
  assert.ok(!ids(plan).some((id) => ["vitest-full", "typecheck", "build", "mobile-typecheck"].includes(id)));
  assert.ok(!ids(plan).includes("semgrep-architecture"));
});

test("COMPLET mobile-only does not add Web checks", () => {
  const plan = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["apps/mobile/src/App.tsx"],
  });
  assert.ok(ids(plan).includes("mobile-typecheck"));
  assert.ok(ids(plan).includes("semgrep-architecture"));
  assert.ok(!ids(plan).some((id) => ["vitest-full", "typecheck", "lint", "build"].includes(id)));
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

test("foreign failures require a verified pre-existing proof", () => {
  assert.equal(
    classifyValidationFailure({
      candidateChangedFiles: ["apps/web/src/example.ts"],
      failureFiles: ["apps/mobile/src/parallel.ts"],
    }),
    "FAIL",
  );
  assert.equal(
    classifyValidationFailure({
      candidateChangedFiles: ["apps/web/src/example.ts"],
      failureFiles: ["apps/mobile/src/parallel.ts"],
      preexistingProof: { verified: true, kind: "baseline", source: "baseline" },
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
