#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  ALL_CI_E2E_PROJECTS,
  isLocalOnlyE2eSpec,
  matchCiProjectsForFile,
} from "./e2e-project-catalog.mjs";
import { gitExecutable } from "./git-executable.mjs";

const SHARED_BOOTSTRAP_INFRA_FILES = [
  "scripts/ci/start-supabase-ephemeral.sh",
  "scripts/ci/supabase-config.mjs",
  "scripts/ci/supabase-config.test.mjs",
  "scripts/ci/diagnose-supabase-start.mjs",
  "scripts/ci/diagnose-supabase-start.test.mjs",
  "package.json",
  "package-lock.json",
];

const SHARED_E2E_INFRA_FILES = new Set([
  ...SHARED_BOOTSTRAP_INFRA_FILES,
  "playwright.config.ts",
  "e2e/global.setup.ts",
  "e2e/global.teardown.ts",
  "e2e/run-github-actions-persistent.mjs",
  "e2e/spogomi-cachan-local-app.mjs",
  ".github/workflows/e2e-supabase.yml",
]);

const SHARED_SQL_INFRA_FILES = new Set([
  ...SHARED_BOOTSTRAP_INFRA_FILES,
  "apps/web/supabase/config.toml",
  "apps/web/supabase/seed.sql",
  ".github/workflows/supabase-sql-proof.yml",
  "scripts/ci/run-supabase-sql-proof.mjs",
  "scripts/ci/run-supabase-sql-proof.test.mjs",
  "scripts/ci/isolate-supabase-migration-failure.mjs",
  "scripts/ci/isolate-supabase-migration-failure.test.mjs",
  "scripts/ci/validate-sql-syntax.mjs",
]);

const SPOGOMI_SQL_CONTRACTS = Object.freeze([
  "apps/web/supabase/tests/spogomi-division-regulation-configuration.pgtap.sql",
  "apps/web/supabase/tests/spogomi-mapping-coherence.pgtap.sql",
  "apps/web/supabase/tests/spogomi-registration-quiz.sql",
  "apps/web/supabase/tests/spogomi-referee-qualification.sql",
  "apps/web/supabase/tests/spogomi-team-referees.sql",
  "apps/web/supabase/tests/spogomi-transactional-contract.sql",
  "apps/web/supabase/tests/spogomi-volunteer-help-proposals.pgtap.sql",
  "apps/web/supabase/tests/spogomi-mixed-division-smoke.sql",
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
    file.startsWith("apps/web/src/lib/auth/") ||
    file.startsWith("apps/web/src/components/auth/") ||
    file.startsWith("apps/web/src/app/(auth)/") ||
    file.startsWith("apps/web/src/lib/profiles") ||
    file.startsWith("apps/web/src/lib/supabase/") ||
    file.startsWith("apps/web/src/lib/http/api-errors")
  );
}

function findUnmappedActiveE2eFiles(activeE2eFiles = []) {
  return [...new Set(activeE2eFiles.map(normalizePath).filter(Boolean))]
    .filter(
      (file) =>
        /^e2e\/.*\.(?:spec|test)\.ts$/.test(file) &&
        matchCiProjectsForFile(file).length === 0 &&
        !isLocalOnlyE2eSpec(file),
    )
    .sort();
}

function fullConservativePlan(reason, { runSpogomiBusinessTests = false, activeE2eFiles = [] } = {}) {
  return {
    docs_only: false,
    e2e_should_run: true,
    run_spogomi_integration: true,
    run_spogomi_business_tests: runSpogomiBusinessTests,
    run_persistent_e2e: true,
    playwright_projects: ALL_CI_E2E_PROJECTS.join(","),
    unmapped_e2e_files: findUnmappedActiveE2eFiles(activeE2eFiles).join(","),
    sql_should_run: true,
    sql_proof_targets: "",
    validate_all_sql: true,
    reason,
  };
}

export function planE2eAndSql({
  changedFiles = [],
  activeE2eFiles = null,
  deletedFiles = [],
  eventName = "push",
  validationMode = "DEVELOPMENT",
  scopeUncertain = false,
} = {}) {
  const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))].sort();
  const deletedSet = new Set(deletedFiles.map(normalizePath).filter(Boolean));
  const activeE2eList = Array.isArray(activeE2eFiles)
    ? activeE2eFiles.map(normalizePath).filter((file) => Boolean(file) && !deletedSet.has(file))
    : null;
  const activeE2eSet = activeE2eList ? new Set(activeE2eList) : null;
  const mode = String(validationMode ?? "DEVELOPMENT").trim().toUpperCase() || "DEVELOPMENT";
  const event = String(eventName ?? "push").trim();

  if (event === "schedule" || mode === "FULL") {
    return fullConservativePlan(
      event === "schedule" ? "scheduled-full-campaign" : "full-validation-mode",
      { runSpogomiBusinessTests: true, activeE2eFiles: activeE2eList ?? [] },
    );
  }

  if (scopeUncertain) {
    return fullConservativePlan("uncertain-scope-conservative", {
      activeE2eFiles: activeE2eList ?? [],
    });
  }

  if (files.length === 0) {
    return {
      docs_only: false,
      e2e_should_run: false,
      run_spogomi_integration: false,
      run_spogomi_business_tests: false,
      run_persistent_e2e: false,
      playwright_projects: "",
      unmapped_e2e_files: "",
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
      unmapped_e2e_files: "",
      sql_should_run: false,
      sql_proof_targets: "",
      validate_all_sql: false,
      reason: "docs-only",
    };
  }

  const projects = new Set();
  const sqlTargets = new Set();
  const unmappedE2eFiles = new Set();
  let runSpogomiIntegration = false;
  let runAllSql = false;
  let validateAllSql = false;

  const hasSharedSchema = files.some(isSharedSupabaseSchemaFile);
  const enterpriseOrganizationMigrations = files.filter((file) =>
    /^apps\/web\/supabase\/migrations\/\d+_enterprise_(?:organization|member)_[^/]+\.sql$/.test(file),
  );
  const spogomiMigrations = files.filter((file) =>
    /^apps\/web\/supabase\/migrations\/\d+_[^/]*spogomi_[^/]+\.sql$/.test(file),
  );
  const recognizedDomainMigrations = new Set([...enterpriseOrganizationMigrations, ...spogomiMigrations]);
  const hasOnlyRecognizedDomainSchema =
    recognizedDomainMigrations.size > 0 &&
    files.filter(isSharedSupabaseSchemaFile).every((file) => recognizedDomainMigrations.has(file)) &&
    !files.some((file) => SHARED_SQL_INFRA_FILES.has(file) || SHARED_E2E_INFRA_FILES.has(file));
  const hasSharedAuth = files.some(isSharedAuthOrRuntimeFile);
  const hasSharedE2eInfra = files.some(
    (file) => SHARED_E2E_INFRA_FILES.has(file) || file.startsWith("e2e/fixtures/") || file.startsWith("scripts/dev/"),
  );
  const hasSharedSqlInfra = files.some((file) => SHARED_SQL_INFRA_FILES.has(file));

  if ((hasSharedSchema && !hasOnlyRecognizedDomainSchema) || hasSharedAuth || hasSharedE2eInfra) {
    for (const project of ALL_CI_E2E_PROJECTS) projects.add(project);
    runSpogomiIntegration = true;
    for (const unmapped of findUnmappedActiveE2eFiles(activeE2eList ?? [])) {
      unmappedE2eFiles.add(unmapped);
    }
  }

  if (hasOnlyRecognizedDomainSchema && enterpriseOrganizationMigrations.length > 0 && spogomiMigrations.length === 0) {
    sqlTargets.add("apps/web/supabase/tests/enterprise-organization-foundation.pgtap.sql");
  } else if (
    hasOnlyRecognizedDomainSchema &&
    spogomiMigrations.length > 0 && enterpriseOrganizationMigrations.length === 0 &&
    files.filter(isSharedSupabaseSchemaFile).every((file) => spogomiMigrations.includes(file)) &&
    !files.some((file) => SHARED_SQL_INFRA_FILES.has(file) || SHARED_E2E_INFRA_FILES.has(file))
  ) {
    const migrationNames = spogomiMigrations.join(" ").toLowerCase();
    const targetedContracts = /referee|reviewer|team/.test(migrationNames)
      ? SPOGOMI_SQL_CONTRACTS.filter((target) => /referee-qualification|team-referees/.test(target))
      : /registration|admission|volunteer|capacity|quiz/.test(migrationNames)
        ? SPOGOMI_SQL_CONTRACTS.filter((target) => /registration-quiz|volunteer-help-proposals/.test(target))
        : /division|regulation|mixed|mapping/.test(migrationNames)
          ? SPOGOMI_SQL_CONTRACTS.filter((target) => /division-regulation|mapping-coherence|mixed-division/.test(target))
          : SPOGOMI_SQL_CONTRACTS;
    for (const target of targetedContracts) {
      sqlTargets.add(target);
    }
  } else if (hasOnlyRecognizedDomainSchema) {
    runAllSql = true;
    validateAllSql = true;
  } else if (hasSharedSchema || hasSharedSqlInfra) {
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

    const matchedProjects = matchCiProjectsForFile(file);
    for (const projectName of matchedProjects) {
      projects.add(projectName);
    }
    if (matchedProjects.includes("spogomi authenticated")) {
      runSpogomiIntegration = true;
    }

    if (
      /^e2e\/.*\.(?:spec|test)\.ts$/.test(file) &&
      !deletedSet.has(file) &&
      (!activeE2eSet || activeE2eSet.has(file)) &&
      matchedProjects.length === 0 &&
      !isLocalOnlyE2eSpec(file)
    ) {
      unmappedE2eFiles.add(file);
      for (const project of ALL_CI_E2E_PROJECTS) projects.add(project);
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
    unmapped_e2e_files: [...unmappedE2eFiles].sort().join(","),
    sql_should_run: sqlShouldRun,
    sql_proof_targets: runAllSql ? "" : [...sqlTargets].join(","),
    validate_all_sql: validateAllSql,
    reason: e2eShouldRun || sqlShouldRun ? "targeted-diff" : "unrelated-to-e2e-sql",
  };
}

function readChangedFilesFromGit({ eventName, eventBefore, eventSha, prBaseSha, prHeadSha }) {
  const head = eventName === "pull_request" ? prHeadSha : eventSha;
  const base = eventName === "pull_request" ? prBaseSha : eventBefore;
  if (!head) {
    return { changedFiles: [], scopeUncertain: true };
  }
  try {
    if (!base || /^0+$/.test(base)) {
      if (eventName === "workflow_dispatch") {
        // Explicit manual DEVELOPMENT dispatch without a diff defaults conservatively.
        return { changedFiles: [], scopeUncertain: true };
      }
      const out = execFileSync(gitExecutable(), ["diff-tree", "--no-commit-id", "--name-only", "-r", head], {
        encoding: "utf8",
      });
      return {
        changedFiles: out.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean),
        scopeUncertain: false,
      };
    }
    const out = execFileSync(gitExecutable(), ["diff", "--name-only", base, head], {
      encoding: "utf8",
    });
    return {
      changedFiles: out.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean),
      scopeUncertain: false,
    };
  } catch {
    return { changedFiles: [], scopeUncertain: true };
  }
}

export function resolveCandidateSha({
  eventName = "push",
  eventSha = "",
  prHeadSha = "",
  githubSha = "",
} = {}) {
  if (String(eventName ?? "").trim() === "pull_request" && prHeadSha) {
    return prHeadSha;
  }
  return eventSha || githubSha || "";
}

export function listActiveCandidateE2eFiles(candidateSha) {
  if (!candidateSha || typeof candidateSha !== "string" || !candidateSha.trim()) {
    throw new Error("Cannot list active E2E files: candidateSha is required.");
  }
  try {
    const out = execFileSync(
      gitExecutable(),
      ["ls-tree", "-r", "--name-only", "-z", candidateSha.trim(), "--", "e2e"],
      { encoding: "utf8" },
    );
    return out
      .split("\0")
      .map(normalizePath)
      .filter((file) => /^e2e\/.*\.(?:spec|test)\.ts$/.test(file))
      .sort();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list active E2E files for ${candidateSha}: ${detail}`);
  }
}

export function computeContentDigest(candidateSha) {
  if (!candidateSha) return "UNAVAILABLE";
  const trackedRoots = [
    "apps/web/src",
    "apps/web/next.config.ts",
    "apps/web/package.json",
    "apps/web/supabase/migrations",
    "apps/web/supabase/seed.sql",
    "apps/web/supabase/config.toml",
    "apps/web/supabase/tests",
    "e2e",
    "scripts/ci",
    "scripts/checks",
    "scripts/dev",
    ".github/workflows/e2e-supabase.yml",
    ".github/workflows/supabase-sql-proof.yml",
    "playwright.config.ts",
    "package.json",
    "package-lock.json",
  ];
  const hash = createHash("sha256");
  try {
    const out = execFileSync(gitExecutable(), ["ls-tree", candidateSha, "--", ...trackedRoots], {
      encoding: "utf8",
    });
    hash.update(out);
    return hash.digest("hex");
  } catch {
    return "UNAVAILABLE";
  }
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
  const eventSha = process.env.EVENT_SHA || "";
  const prHeadSha = process.env.PR_HEAD_SHA || "";
  const githubSha = process.env.GITHUB_SHA || "";
  const candidateSha = resolveCandidateSha({ eventName, eventSha, prHeadSha, githubSha });
  const { changedFiles, scopeUncertain } =
    eventName === "schedule" || validationMode.toUpperCase() === "FULL"
      ? { changedFiles: [], scopeUncertain: false }
      : readChangedFilesFromGit({
          eventName,
          eventBefore: process.env.EVENT_BEFORE || "",
          eventSha,
          prBaseSha: process.env.PR_BASE_SHA || "",
          prHeadSha,
        });
  const activeE2eFiles = listActiveCandidateE2eFiles(candidateSha);
  const plan = planE2eAndSql({ changedFiles, activeE2eFiles, eventName, validationMode, scopeUncertain });
  const inputsDigest = computeContentDigest(candidateSha);
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
