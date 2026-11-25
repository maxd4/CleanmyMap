import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ALL_CI_E2E_PROJECTS,
  isLocalOnlyE2eSpec,
  matchCiProjectsForFile,
} from "./e2e-project-catalog.mjs";
import { isPureDocumentationFile, planE2eAndSql } from "./select-e2e-sql-plan.mjs";

test("pure documentation changes skip all E2E and SQL runs", () => {
  assert.equal(isPureDocumentationFile("documentation/features/annuaire.md"), true);
  assert.equal(isPureDocumentationFile("README.md"), true);
  assert.equal(isPureDocumentationFile("documentation/features/spogomi-references/fixtures/cachan.json"), false);

  const plan = planE2eAndSql({
    eventName: "push",
    validationMode: "DEVELOPMENT",
    changedFiles: [
      "documentation/features/paris-cleanwalk-network-3d.md",
      "AGENTS.md",
    ],
  });

  assert.equal(plan.docs_only, true);
  assert.equal(plan.e2e_should_run, false);
  assert.equal(plan.sql_should_run, false);
  assert.equal(plan.reason, "docs-only");
});

test("local E2E spec change selects only the directly affected Playwright project", () => {
  const plan = planE2eAndSql({
    eventName: "pull_request",
    validationMode: "DEVELOPMENT",
    changedFiles: ["e2e/action-sharing.spec.ts"],
  });

  assert.equal(plan.docs_only, false);
  assert.equal(plan.e2e_should_run, true);
  assert.equal(plan.run_spogomi_integration, false);
  assert.equal(plan.run_spogomi_business_tests, false);
  assert.equal(plan.run_persistent_e2e, true);
  assert.equal(plan.playwright_projects, "action sharing");
  assert.equal(plan.sql_should_run, false);
});

test("local SQL contract change selects only that SQL proof without triggering E2E", () => {
  const plan = planE2eAndSql({
    eventName: "push",
    validationMode: "DEVELOPMENT",
    changedFiles: ["apps/web/supabase/tests/reports-persistent-contract.sql"],
  });

  assert.equal(plan.e2e_should_run, false);
  assert.equal(plan.sql_should_run, true);
  assert.equal(plan.sql_proof_targets, "apps/web/supabase/tests/reports-persistent-contract.sql");
  assert.equal(plan.validate_all_sql, false);
});

test("shared migration change runs full SQL proof and E2E integration/projects", () => {
  const plan = planE2eAndSql({
    eventName: "push",
    validationMode: "DEVELOPMENT",
    changedFiles: ["apps/web/supabase/migrations/20261125000005_fix.sql"],
  });

  assert.equal(plan.e2e_should_run, true);
  assert.equal(plan.run_spogomi_integration, true);
  assert.equal(plan.run_persistent_e2e, true);
  assert.equal(plan.sql_should_run, true);
  assert.equal(plan.sql_proof_targets, "");
  assert.equal(plan.validate_all_sql, true);
});

test("FULL validation mode or schedule runs the complete campaign", () => {
  for (const input of [
    { eventName: "workflow_dispatch", validationMode: "FULL", changedFiles: ["README.md"] },
    { eventName: "schedule", validationMode: "DEVELOPMENT", changedFiles: [] },
  ]) {
    const plan = planE2eAndSql(input);
    assert.equal(plan.e2e_should_run, true);
    assert.equal(plan.run_spogomi_integration, true);
    assert.equal(plan.run_spogomi_business_tests, true);
    assert.equal(plan.run_persistent_e2e, true);
    assert.equal(plan.sql_should_run, true);
    assert.equal(plan.sql_proof_targets, "");
    assert.equal(plan.validate_all_sql, true);
  }
});

test("signalements API, route-reference-action-sharing spec, bootstrap infra, and uncertain scope select safely", () => {
  const signalementPlan = planE2eAndSql({
    changedFiles: ["apps/web/src/app/api/signalements/me/route.ts"],
  });
  assert.equal(signalementPlan.e2e_should_run, true);
  assert.equal(signalementPlan.playwright_projects, "signalement campaign 2");

  const routeRefPlan = planE2eAndSql({
    changedFiles: ["e2e/route-reference-action-sharing.spec.ts"],
  });
  assert.equal(routeRefPlan.e2e_should_run, true);
  assert.equal(routeRefPlan.playwright_projects, "action sharing");

  const bootstrapPlan = planE2eAndSql({
    changedFiles: ["scripts/ci/start-supabase-ephemeral.sh"],
  });
  assert.equal(bootstrapPlan.e2e_should_run, true);
  assert.equal(bootstrapPlan.run_spogomi_integration, true);
  assert.equal(bootstrapPlan.run_persistent_e2e, true);
  assert.equal(bootstrapPlan.sql_should_run, true);

  const uncertainPlan = planE2eAndSql({
    eventName: "push",
    changedFiles: [],
    scopeUncertain: true,
  });
  assert.equal(uncertainPlan.e2e_should_run, true);
  assert.equal(uncertainPlan.sql_should_run, true);
  assert.equal(uncertainPlan.reason, "uncertain-scope-conservative");

  const annuairePlan = planE2eAndSql({
    changedFiles: ["e2e/annuaire-public-cleanliness.spec.ts"],
  });
  assert.equal(annuairePlan.e2e_should_run, true);
  assert.equal(annuairePlan.playwright_projects, "local public");

  const authPlan = planE2eAndSql({
    changedFiles: ["apps/web/src/lib/auth/session.ts"],
  });
  assert.equal(authPlan.e2e_should_run, true);
  assert.equal(authPlan.run_spogomi_integration, true);
});

test("every active E2E spec on disk is classified and mixed commits never skip unmapped specs", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const e2eFiles = fs.readdirSync(path.join(root, "e2e"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:spec|test)\.ts$/.test(entry.name))
    .map((entry) => `e2e/${entry.name}`);

  for (const file of e2eFiles) {
    const matched = matchCiProjectsForFile(file);
    assert.ok(
      matched.length > 0 || isLocalOnlyE2eSpec(file),
      `Unclassified E2E spec on disk: ${file}`,
    );
  }

  const mixedPlan = planE2eAndSql({
    changedFiles: ["e2e/action-sharing.spec.ts", "e2e/unmapped-new-scenario.spec.ts"],
  });
  assert.deepEqual(mixedPlan.playwright_projects.split(",").sort(), [...ALL_CI_E2E_PROJECTS].sort());

  const fullPlan = planE2eAndSql({ eventName: "workflow_dispatch", validationMode: "FULL" });
  for (const required of ["local public", "settings authenticated", "homepage chromium"]) {
    assert.ok(fullPlan.playwright_projects.split(",").includes(required), `FULL missing ${required}`);
  }

  const workflow = fs.readFileSync(path.join(root, ".github/workflows/e2e-supabase.yml"), "utf8");
  for (const trigger of [
    "apps/web/src/lib/auth/**",
    "apps/web/src/components/auth/**",
    "apps/web/src/app/(auth)/**",
    "apps/web/src/lib/profiles*",
    "apps/web/src/lib/partners/**",
    "apps/web/src/components/sections/rubriques/annuaire/**",
  ]) {
    assert.ok(workflow.includes(trigger), `e2e-supabase.yml missing trigger: ${trigger}`);
  }
});
