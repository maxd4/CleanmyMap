#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { gitExecutable } from "./git-executable.mjs";

const ALL_PERSISTENT_PROJECTS = [
  "action sharing",
  "authenticated campaign",
  "signalement campaign 2",
  "personal AI authenticated",
];

const SHARED_E2E_INFRA_FILES = new Set([
  "playwright.config.ts",
  "e2e/global.setup.ts",
  "e2e/global.teardown.ts",
  "e2e/run-github-actions-persistent.mjs",
  "e2e/spogomi-cachan-local-app.mjs",
  ".github/workflows/e2e-supabase.yml",
  "package.json",
  "package-lock.json",
  "scripts/ci/select-e2e-sql-plan.mjs",
]);

const SHARED_SQL_INFRA_FILES = new Set([
  "apps/web/supabase/config.toml",
  "apps/web/supabase/seed.sql",
  ".github/workflows/supabase-sql-proof.yml",
  "scripts/ci/run-supabase-sql-proof.mjs",
  "scripts/ci/supabase-sql-proof-lifecycle.mjs",
  "scripts/ci/start-supabase-ephemeral.sh",
  "scripts/ci/supabase-config.mjs",
  "scripts/ci/validate-sql-syntax.mjs",
  "scripts/ci/select-e2e-sql-plan.mjs",
  "package.json",
  "package-lock.json",
]);

function normalizePath(filePath) {
  return String(filePath ?? "").trim().replaceAll("\\", "/");
}

export function isPureDocumentationFile(filePath) {
  const file = normalizePath(filePath);
  if (!file) return false;
  if (file.startsWith("documentation/features/spogomi-references/fixtures/")) return false;
  return file.startsWith("documentation/") || /\.(md|mdx)$/i.test(file);
}

function isSqlProofTargetFile(filePath) {
  const file = normalizePath(filePath);
  return (
    (file.startsWith("apps/web/supabase/tests/") && file.endsWith(".sql")) ||
    /^e2e\/[^/]+\.sql$/.test(file) ||
    /^e2e\/[^/]+-concurrency\.mjs$/.test(file) ||
    file === "e2e/security-02-two-sessions.mjs"
  );
}

function isSharedSupabaseSchemaFile(filePath) {
  const file = normalizePath(filePath);
  return (
    file.startsWith("apps/web/supabase/migrations/") ||
    file === "apps/web/supabase/config.toml" ||
    file === "apps/web/supabase/seed.sql"
  );
}

function isSharedAuthOrRuntimeFile(filePath) {
  const file = normalizePath(filePath);
  return (
    file === "apps/web/src/proxy.ts" ||
    file.startsWith("apps/web/src/lib/authz") ||
    file.startsWith("apps/web/src/lib/supabase/") ||
    file.startsWith("apps/web/src/lib/http/api-errors")
  );
}

export function planE2eAndSql({
  changedFiles = [],
  eventName = "push",
  validationMode = "DEVELOPMENT",
} = {}) {
  const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))].sort();
  const mode = String(validationMode ?? "DEVELOPMENT").trim().toUpperCase() || "DEVELOPMENT";
  const event = String(eventName ?? "push").trim();

  if (event === "schedule" || mode === "FULL") {
    return {
      docs_only: false,
      e2e_should_run: true,
      run_spogomi_integration: true,
      run_spogomi_business_tests: true,
      run_persistent_e2e: true,
      playwright_projects: ALL_PERSISTENT_PROJECTS.join(","),
      sql_should_run: true,
      sql_proof_targets: "",
      validate_all_sql: true,
      reason: event === "schedule" ? "scheduled-full-campaign" : "full-validation-mode",
    };
  }

  if (files.length === 0) {
    return {
      docs_only: false,
      e2e_should_run: false,
      run_spogomi_integration: false,
      run_spogomi_business_tests: false,
      run_persistent_e2e: false,
      playwright_projects: "",
      sql_should_run: false,
      sql_proof_targets: "",
      validate_all_sql: false,
      reason: "no-changed-files",
    };
  }

  if (files.every(isPureDocumentationFile)) {
    return {
      docs_only: true,
      e2e_should_run: false,
      run_spogomi_integration: false,
      run_spogomi_business_tests: false,
      run_persistent_e2e: false,
      playwright_projects: "",
      sql_should_run: false,
      sql_proof_targets: "",
      validate_all_sql: false,
      reason: "docs-only",
    };
  }

  const projects = new Set();
  const sqlTargets = new Set();
  let runSpogomiIntegration = false;
  let runAllSql = false;
  let validateAllSql = false;

  const hasSharedSchema = files.some(isSharedSupabaseSchemaFile);
  const hasSharedAuth = files.some(isSharedAuthOrRuntimeFile);
  const hasSharedE2eInfra = files.some((file) => SHARED_E2E_INFRA_FILES.has(file) || file.startsWith("e2e/fixtures/"));
  const hasSharedSqlInfra = files.some((file) => SHARED_SQL_INFRA_FILES.has(file));

  if (hasSharedSchema || hasSharedAuth || hasSharedE2eInfra) {
    for (const project of ALL_PERSISTENT_PROJECTS) projects.add(project);
    runSpogomiIntegration = true;
  }

  if (hasSharedSchema || hasSharedSqlInfra) {
    runAllSql = true;
    validateAllSql = true;
  }

  for (const file of files) {
    if (isSqlProofTargetFile(file)) {
      sqlTargets.add(file);
    }

    if (
      file === "e2e/spogomi-cachan-integration.mjs" ||
      file === "e2e/spogomi-cachan-local-app.mjs" ||
      file === "e2e/spogomi-cachan-local-app.test.mjs" ||
      file.startsWith("documentation/features/spogomi-references/fixtures/")
    ) {
      runSpogomiIntegration = true;
    }

    if (
      file === "e2e/action-sharing.spec.ts" ||
      file === "e2e/action-finalization.spec.ts" ||
      file === "e2e/action-route-reference-images.spec.ts" ||
      file.startsWith("apps/web/src/lib/actions/") ||
      file.startsWith("apps/web/src/app/api/actions/")
    ) {
      projects.add("action sharing");
    }

    if (
      file === "e2e/authenticated-campaign.spec.ts" ||
      file === "e2e/authenticated-spogomi.spec.ts" ||
      file.startsWith("apps/web/src/lib/spogomi/") ||
      file.startsWith("apps/web/src/app/api/spogomi/")
    ) {
      projects.add("authenticated campaign");
      runSpogomiIntegration = true;
    }

    if (
      file === "e2e/signalement-campaign-2.spec.ts" ||
      file.startsWith("apps/web/src/lib/reports/") ||
      file.startsWith("apps/web/src/app/api/reports/")
    ) {
      projects.add("signalement campaign 2");
    }

    if (
      file === "e2e/personal-ai-authenticated.spec.ts" ||
      file.startsWith("apps/web/src/lib/personal-ai/")
    ) {
      projects.add("personal AI authenticated");
    }
  }

  const runPersistentE2e = projects.size > 0;
  const e2eShouldRun = runSpogomiIntegration || runPersistentE2e;
  const sqlShouldRun = runAllSql || sqlTargets.size > 0;

  return {
    docs_only: false,
    e2e_should_run: e2eShouldRun,
    run_spogomi_integration: runSpogomiIntegration,
    // Already covered by ci.yml web-tests on push/PR; reserved for FULL/schedule.
    run_spogomi_business_tests: false,
    run_persistent_e2e: runPersistentE2e,
    playwright_projects: [...projects].join(","),
    sql_should_run: sqlShouldRun,
    sql_proof_targets: runAllSql ? "" : [...sqlTargets].join(","),
    validate_all_sql: validateAllSql,
    reason: e2eShouldRun || sqlShouldRun ? "targeted-diff" : "unrelated-to-e2e-sql",
  };
}

function readChangedFilesFromGit({ eventName, eventBefore, eventSha, prBaseSha, prHeadSha }) {
  const head = eventName === "pull_request" ? prHeadSha : eventSha;
  const base = eventName === "pull_request" ? prBaseSha : eventBefore;
  if (!head) return [];
  if (!base || /^0+$/.test(base)) {
    const out = execFileSync(gitExecutable(), ["diff-tree", "--no-commit-id", "--name-only", "-r", head], {
      encoding: "utf8",
    });
    return out.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  }
  const out = execFileSync(gitExecutable(), ["diff", "--name-only", base, head], {
    encoding: "utf8",
  });
  return out.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function computeInputsDigest({ changedFiles, plan }) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify({ changedFiles: [...changedFiles].sort(), plan }));
  return hash.digest("hex");
}

function writeGithubOutputs(outputs) {
  const outputPath = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${String(value)}`);
  if (outputPath) {
    fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  }
}

function main() {
  const eventName = process.env.EVENT_NAME || "push";
  const validationMode = process.env.VALIDATION_MODE || "DEVELOPMENT";
  const changedFiles =
    eventName === "schedule" || validationMode.toUpperCase() === "FULL"
      ? []
      : readChangedFilesFromGit({
          eventName,
          eventBefore: process.env.EVENT_BEFORE || "",
          eventSha: process.env.EVENT_SHA || process.env.GITHUB_SHA || "",
          prBaseSha: process.env.PR_BASE_SHA || "",
          prHeadSha: process.env.PR_HEAD_SHA || "",
        });
  const plan = planE2eAndSql({ changedFiles, eventName, validationMode });
  const inputsDigest = computeInputsDigest({ changedFiles, plan });
  const outputs = {
    ...plan,
    inputs_digest: inputsDigest,
    changed_count: changedFiles.length,
  };
  writeGithubOutputs(outputs);
  console.log(`E2E_SQL_PLAN: ${JSON.stringify(outputs)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
