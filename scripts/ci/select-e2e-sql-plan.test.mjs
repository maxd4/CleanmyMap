import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ALL_CI_E2E_PROJECTS,
  CI_EXECUTABLE_PROJECTS,
  isLocalOnlyE2eSpec,
  matchCiProjectsForFile,
} from "./e2e-project-catalog.mjs";
import {
  isPureDocumentationFile,
  planE2eAndSql,
  resolveCandidateSha,
} from "./select-e2e-sql-plan.mjs";

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
  assert.equal(mixedPlan.unmapped_e2e_files, "e2e/unmapped-new-scenario.spec.ts");

  const fullPlan = planE2eAndSql({ eventName: "workflow_dispatch", validationMode: "FULL" });
  for (const required of ["local public", "settings authenticated", "homepage chromium"]) {
    assert.ok(fullPlan.playwright_projects.split(",").includes(required), `FULL missing ${required}`);
  }

  const workflow = fs.readFileSync(path.join(root, ".github/workflows/e2e-supabase.yml"), "utf8");
  const sqlWorkflow = fs.readFileSync(path.join(root, ".github/workflows/supabase-sql-proof.yml"), "utf8");
  const pushSection = workflow.slice(workflow.indexOf("  push:"), workflow.indexOf("  pull_request:"));
  const prSection = workflow.slice(workflow.indexOf("  pull_request:"), workflow.indexOf("env:"));

  for (const trigger of [
    "e2e/*.spec.ts",
    "e2e/*.test.ts",
    "scripts/ci/e2e-project-catalog.mjs",
    "apps/web/src/lib/spogomi/**",
    "apps/web/src/app/api/spogomi/**",
    "apps/web/src/app/api/gamification/spogomi/**",
    "apps/web/src/components/spogomi/**",
    "apps/web/src/app/(app)/spogomi/**",
    "apps/web/src/app/(app)/dashboard/spogomi/**",
    "apps/web/src/lib/auth/**",
    "apps/web/src/components/auth/**",
    "apps/web/src/app/(auth)/**",
    "apps/web/src/lib/profiles*",
    "apps/web/src/lib/partners/**",
    "apps/web/src/components/sections/rubriques/annuaire/**",
  ]) {
    assert.ok(pushSection.includes(trigger), `e2e-supabase.yml push.paths missing trigger: ${trigger}`);
    assert.ok(prSection.includes(trigger), `e2e-supabase.yml pull_request.paths missing trigger: ${trigger}`);
  }
  assert.ok(sqlWorkflow.includes("scripts/ci/e2e-project-catalog.mjs"), "supabase-sql-proof.yml missing e2e-project-catalog.mjs");
});

test("catalog changes, SPOGOMI UI/pages, PR SHA digest, and Playwright project alignment stay consistent", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const catalogPlan = planE2eAndSql({
    eventName: "pull_request",
    changedFiles: ["scripts/ci/e2e-project-catalog.mjs"],
  });
  assert.equal(catalogPlan.e2e_should_run, true);
  assert.equal(catalogPlan.run_persistent_e2e, true);
  assert.equal(catalogPlan.sql_should_run, true);
  assert.equal(catalogPlan.validate_all_sql, true);
  assert.deepEqual(catalogPlan.playwright_projects.split(",").sort(), [...ALL_CI_E2E_PROJECTS].sort());

  for (const spogomiFile of [
    "apps/web/src/components/spogomi/spogomi-event-cockpit.tsx",
    "apps/web/src/app/(app)/spogomi/[eventSlug]/espace/page.tsx",
    "apps/web/src/app/(app)/dashboard/spogomi/page.tsx",
    "apps/web/src/app/api/gamification/spogomi/collection/route.ts",
  ]) {
    const plan = planE2eAndSql({ changedFiles: [spogomiFile] });
    assert.equal(plan.e2e_should_run, true, `Expected E2E to run for ${spogomiFile}`);
    assert.equal(plan.run_spogomi_integration, true, `Expected SPOGOMI integration for ${spogomiFile}`);
    assert.ok(
      plan.playwright_projects.split(",").includes("authenticated campaign"),
      `Expected authenticated campaign for ${spogomiFile}`,
    );
  }

  assert.equal(
    resolveCandidateSha({
      eventName: "pull_request",
      eventSha: "merge-commit-sha",
      prHeadSha: "pr-head-sha",
      githubSha: "merge-commit-sha",
    }),
    "pr-head-sha",
  );
  assert.equal(
    resolveCandidateSha({
      eventName: "push",
      eventSha: "push-sha",
      prHeadSha: "",
      githubSha: "push-sha",
    }),
    "push-sha",
  );

  // Parse Playwright projects and verify every CI-cataloged spec matches its Playwright project testMatch.
  const pwConfigSource = fs.readFileSync(path.join(root, "playwright.config.ts"), "utf8");
  const pwProjects = new Map();
  const projectBlockRegex = /\{\s*name:\s*"([^"]+)",\s*testMatch:\s*(\/[^\r\n]+\/[gimsuy]*),/g;
  for (const match of pwConfigSource.matchAll(projectBlockRegex)) {
    const [, name, literal] = match;
    const lastSlash = literal.lastIndexOf("/");
    const regex = new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));
    pwProjects.set(name, regex);
  }

  const e2eFiles = fs.readdirSync(path.join(root, "e2e"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:spec|test)\.ts$/.test(entry.name))
    .map((entry) => `e2e/${entry.name}`);

  for (const project of CI_EXECUTABLE_PROJECTS) {
    const pwTestMatch = pwProjects.get(project.name);
    assert.ok(pwTestMatch, `playwright.config.ts missing CI project: ${project.name}`);
    const catalogMatched = e2eFiles.filter((file) => project.specPatterns.some((pattern) => pattern.test(file)));
    const pwMatched = e2eFiles.filter((file) => pwTestMatch.test(file));
    assert.deepEqual(
      pwMatched.sort(),
      catalogMatched.sort(),
      `Playwright project "${project.name}" testMatch diverges from e2e-project-catalog.mjs`,
    );
  }

  // Every spec matched by non-CI Playwright projects must still be explicitly accounted for.
  const ciSet = new Set(ALL_CI_E2E_PROJECTS);
  for (const [name, pwTestMatch] of pwProjects.entries()) {
    if (ciSet.has(name) || name === "global setup" || name === "global teardown") continue;
    const matchedFiles = e2eFiles.filter((file) => pwTestMatch.test(file));
    for (const file of matchedFiles) {
      assert.ok(
        matchCiProjectsForFile(file).length > 0 || isLocalOnlyE2eSpec(file),
        `Playwright project "${name}" matches ${file} which is omitted from CI catalog and LOCAL_ONLY_E2E_SPECS`,
      );
    }
  }

  const runnerSource = fs.readFileSync(path.join(root, "e2e/run-github-actions-persistent.mjs"), "utf8");
  assert.ok(runnerSource.includes("UNMAPPED_E2E_FILES"), "persistent runner must enforce UNMAPPED_E2E_FILES coverage");
});
