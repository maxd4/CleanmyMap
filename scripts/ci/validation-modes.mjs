#!/usr/bin/env node

import {
  getVitestFiles,
  isDependencyGraphRelevantFile,
  isBuildRelevantFile,
  isWebRelevantFile,
} from "../checks/validation-policy.mjs";
import {
  resolveAssociatedWebTestFiles,
  resolveAssociatedScriptTestFiles,
  resolveMigrationContracts,
} from "./validation-resolution.mjs";
import fs from "node:fs";

export const VALIDATION_MODE_BUDGETS = Object.freeze({
  FAST: 180,
  FULL: null,
});

const SECURITY_GROUP_FILES = new Set(getVitestFiles({ groups: ["security"] }));
const REGRESSION_GROUP_FILES = new Set(getVitestFiles({ groups: ["regression"] }));

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function isDocumentationFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("documentation/") || /\.(md|mdx)$/.test(normalized);
}

function isPagesSiteFile(file) {
  return normalizePath(file).startsWith("documentation/pages_site/");
}

function isTypeScriptFile(file) {
  return /\.(ts|tsx)$/.test(normalizePath(file));
}

function isWebSourceFile(file) {
  return normalizePath(file).startsWith("apps/web/src/");
}

function isMobileRelevantFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/mobile/") && !isDocumentationFile(normalized);
}

function isMotionRelevantFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized === "apps/web/src/styles/base.css" ||
    normalized.startsWith("apps/web/src/styles/motion") ||
    normalized.startsWith("apps/web/src/styles/display-modes") ||
    normalized.startsWith("apps/web/src/lib/animations/") ||
    normalized.startsWith("apps/web/src/components/accueil/") ||
    normalized.startsWith("apps/web/src/components/dashboard/") ||
    normalized === "apps/web/src/app/(app)/dashboard/page.tsx" ||
    normalized === "e2e/homepage-reveal.spec.ts" ||
    normalized === "playwright.config.ts"
  );
}

function isScriptRelevantFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("scripts/") && !isDocumentationFile(normalized);
}

function isPythonRelevantFile(file) {
  return /^maintenance\/python\/(src|scripts)\/.*\.py$/.test(normalizePath(file));
}

function isSupabaseRelevantFile(file) {
  return normalizePath(file).startsWith("apps/web/supabase/");
}

function isMigrationRelevantFile(file) {
  return normalizePath(file).startsWith("apps/web/supabase/migrations/");
}

export function isSecurityRelevantFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("apps/web/src/app/api/") ||
    normalized.startsWith("apps/web/src/lib/auth") ||
    normalized.startsWith("apps/web/src/lib/security/") ||
    normalized.startsWith("apps/web/src/lib/supabase/") ||
    normalized.startsWith("apps/web/src/lib/actions/") ||
    normalized.startsWith("apps/web/src/lib/validation/") ||
    normalized.includes("/permissions") ||
    normalized.startsWith("apps/web/supabase/") ||
    normalized.startsWith("scripts/checks/secret-")
  );
}

function isSemgrepRelevantFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("apps/web/src/") ||
    normalized.startsWith("apps/mobile/") ||
    normalized.startsWith("scripts/security/semgrep/") ||
    normalized === "scripts/security/run-semgrep-fixtures.mjs" ||
    normalized === "scripts/checks/check-semgrep-architecture.mjs"
  );
}

function isArchitectureImportRelevantFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/web/src/")
    || normalized.startsWith("apps/mobile/")
    || normalized === "apps/web/eslint.config.mjs"
    || normalized === "scripts/checks/architecture-import-boundary-baseline.json"
    || normalized === "scripts/checks/check-architecture-import-boundary.mjs"
    || normalized === "scripts/checks/architecture-import-boundary.test.mjs"
    || normalized === "scripts/reports/generate-architecture-import-graph.mjs";
}

function isRegressionRelevantFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("apps/web/src/proxy") ||
    normalized.includes("navigation") ||
    normalized.includes("sections-registry") ||
    normalized.includes("vercel") ||
    normalized.includes("actions/contracts/")
  );
}

function isLockfileRelevantFile(file) {
  const normalized = normalizePath(file);
  return normalized === "package-lock.json" || normalized.endsWith("/package-lock.json");
}

function isWebRuntimeRelevantFile(file) {
  const normalized = normalizePath(file);
  return isWebRelevantFile(normalized) && !normalized.startsWith("apps/web/supabase/");
}

function npmCommand(script, args = []) {
  return {
    executable: "npm",
    args: ["run", script, ...args],
  };
}

const CHECK_POLICIES = Object.freeze({
  "test:coverage": { category: "Web", resources: ["web-coverage"], parallelizable: false },
  "quality:coverage": { category: "Quality", dependencies: ["test:coverage"], resources: ["web-coverage"], parallelizable: false },
  typecheck: { category: "Web", resources: ["web-runtime"], parallelizable: false },
  lint: { category: "Web", resources: ["web-lint"], parallelizable: true },
  build: { category: "Build", resources: ["web-runtime"], parallelizable: false },
  "test:e2e": { category: "E2E", resources: ["web-runtime"], parallelizable: false },
  "quality:mutation": { category: "Quality", resources: ["web-runtime", "web-coverage"], parallelizable: false },
  "quality:top-heavy": { category: "Quality", resources: ["quality-ratchets"], parallelizable: false },
  "quality:complexity": { category: "Quality", resources: ["quality-ratchets"], parallelizable: false },
  "quality:dead-code": { category: "Quality", resources: ["quality-ratchets"], parallelizable: false },
  "quality:duplication": { category: "Quality", resources: ["quality-ratchets"], parallelizable: false },
  "quality:cycles": { category: "Quality", resources: ["gitnexus"], parallelizable: false },
  "mobile:typecheck": { category: "Mobile", resources: ["mobile-runtime"], parallelizable: false },
  "mobile:test": { category: "Mobile", resources: ["mobile-runtime"], parallelizable: false },
  "mobile:security": { category: "Security", resources: ["mobile-runtime"], parallelizable: false },
  "mobile:lint": { category: "Mobile", resources: ["mobile-runtime"], parallelizable: false },
  "quality:mobile-coverage": { category: "Quality", dependencies: ["mobile:test"], resources: ["mobile-runtime"], parallelizable: false },
  "audit:vercel-ci": { category: "External", resources: ["external-vercel"], parallelizable: false },
  "vercel-deploy-preflight": { category: "External", resources: ["external-vercel"], parallelizable: false },
  "github-security-full": { category: "External", resources: ["external-github"], parallelizable: false },
  "supabase-full": { category: "External", resources: ["external-supabase"], parallelizable: false },
  "python-tests": { category: "Python", resources: ["python-runtime"], parallelizable: false },
  "test:scripts": { category: "Governance", resources: ["script-tests"], parallelizable: false },
  "scripts-tests-targeted": { category: "Governance", resources: ["script-tests"], parallelizable: false },
  "semgrep-architecture": { category: "Security", resources: ["semgrep"], parallelizable: false },
});

function inferCheckCategory(id) {
  if (id.startsWith("mobile:")) return "Mobile";
  if (id.startsWith("quality:") || id.includes("coverage")) return "Quality";
  if (id.startsWith("test:") || id.includes("security")) return "Security";
  if (id.includes("e2e")) return "E2E";
  if (id.includes("vercel") || id.includes("github") || id.includes("supabase")) return "External";
  if (id === "typecheck" || id === "lint" || id === "vitest-full") return "Web";
  if (id === "build") return "Build";
  if (id.includes("python")) return "Python";
  return "Governance";
}

function decorateCheck(check) {
  const policy = CHECK_POLICIES[check.id] ?? {};
  return {
    ...check,
    category: check.category ?? policy.category ?? inferCheckCategory(check.id),
    dependencies: Object.freeze([...(check.dependencies ?? policy.dependencies ?? [])]),
    resources: Object.freeze([...(check.resources ?? policy.resources ?? [])]),
    parallelizable: check.parallelizable ?? policy.parallelizable ?? true,
  };
}

function addCheck(checks, check) {
  if (checks.some((entry) => entry.id === check.id)) return;
  checks.push(Object.freeze(decorateCheck(check)));
}

function addTargetedVitest(checks, files, estimatedSeconds = 30) {
  const uniqueFiles = [...new Set(files.map(normalizePath))];
  if (uniqueFiles.length === 0) return;
  addCheck(checks, {
    id: "vitest-targeted",
    label: "Vitest ciblé",
    estimatedSeconds,
    critical: true,
    command: npmCommand("test", ["-w", "apps/web", "--", ...uniqueFiles]),
    testFiles: uniqueFiles,
  });
}

function addFullCheck(checks, check) {
  addCheck(checks, {
    estimatedSeconds: 30,
    critical: true,
    ...check,
  });
}

function addFullPlanChecks(checks) {
  const commands = [
    ["root-file-hygiene", "Hygiène des fichiers racine", npmCommand("check:root-files"), 5],
    ["file-naming", "Convention de nommage des fichiers", npmCommand("check:file-naming"), 2],
    ["environment-contract", "Contrat d'environnement", npmCommand("check:env-contract"), 5],
    ["documentation-governance", "Gouvernance documentaire", npmCommand("check:doc-governance"), 10],
    ["stack-documentation-drift", "Dérive stack/documentation", npmCommand("check:stack-doc-drift"), 5],
    ["github-actions-security", "Sécurité GitHub Actions", npmCommand("check:github-actions"), 5],
    ["lockfile-policy", "Politique lockfile", npmCommand("check:lockfile-policy"), 5],
    ["semgrep-architecture", "Garde-fou architectural Semgrep", npmCommand("check:semgrep"), 45],
    ["security-deception", "Contrat de déception sécurité", npmCommand("check:security-deception"), 5],
    ["typecheck", "Typecheck web", npmCommand("typecheck"), 35],
    ["lint", "ESLint web", npmCommand("lint"), 45],
    ["test:coverage", "Vitest Web complet + couverture", npmCommand("test:coverage"), 240],
    ["quality:coverage", "Ratchet couverture Web", npmCommand("quality:coverage"), 45],
    ["test:scripts", "Tests déterministes des scripts", npmCommand("test:scripts"), 60],
    ["python-tests", "Tests Python complets", { executable: process.execPath, args: ["scripts/ci/run-python-tests.mjs"] }, 60],
    ["quality:top-heavy", "Qualité des fichiers lourds", npmCommand("quality:top-heavy"), 10],
    ["quality:complexity", "Ratchet complexité/longueur complet", npmCommand("quality:complexity"), 120],
    ["quality:dead-code", "Ratchet dead-code Knip", npmCommand("quality:dead-code"), 60],
    ["quality:duplication", "Ratchet duplication jscpd", npmCommand("quality:duplication"), 60],
    ["quality:cycles", "Ratchet cycles GitNexus", npmCommand("quality:cycles"), 60],
    ["architecture-import-boundary", "Graphe et frontières d'import", npmCommand("check:architecture-import-boundary"), 15],
    ["quality:mutation", "Mutation testing", npmCommand("quality:mutation"), 180],
    ["mobile:typecheck", "Typecheck mobile", npmCommand("mobile:typecheck"), 30],
    ["mobile:test", "Vitest mobile complet", npmCommand("mobile:test"), 60],
    ["mobile:security", "Tests de sécurité mobile", npmCommand("mobile:security"), 30],
    ["mobile:lint", "ESLint mobile", npmCommand("mobile:lint"), 30],
    ["quality:mobile-coverage", "Couverture mobile + ratchet", npmCommand("quality:mobile-coverage"), 60],
    ["audit:vercel-ci", "Audit Vercel CI", npmCommand("audit:vercel:ci"), 15],
    ["vercel-deploy-preflight", "Préflight Vercel", npmCommand("vercel:deploy:preflight"), 15],
    ["build", "Build production", npmCommand("build"), 180],
    ["test:e2e", "Campagne E2E locale", npmCommand("test:e2e"), 240],
    ["github-security-full", "Alertes et état GitHub", { executable: "node", args: ["scripts/ci/audit-github-release.mjs"] }, 30],
    ["supabase-full", "Audit Supabase distant", { executable: "node", args: ["scripts/ci/audit-supabase-release.mjs"] }, 60],
  ];

  for (const [id, label, command, estimatedSeconds] of commands) {
    addFullCheck(checks, { id, label, command, estimatedSeconds });
  }
}

function normalizePlanInput({ mode, candidateScope, changedFiles }) {
  const normalizedMode = String(mode).toUpperCase();
  const normalizedScope = String(candidateScope).toUpperCase();
  if (!(normalizedMode in VALIDATION_MODE_BUDGETS)) {
    throw new Error(`Unsupported validation mode: ${mode}`);
  }
  if (!["WORKTREE", "STAGED"].includes(normalizedScope)) {
    throw new Error(`Unsupported candidate scope: ${candidateScope}`);
  }
  return {
    normalizedMode,
    normalizedScope,
    files: [...new Set(changedFiles.map(normalizePath))],
  };
}

function classifyChangedFiles(files) {
  const docsRelevant = files.some(isDocumentationFile);
  const webRuntimeRelevant = files.some(isWebRuntimeRelevantFile);
  const scriptsRelevant = files.some(isScriptRelevantFile);
  const mobileRelevant = files.some(isMobileRelevantFile);
  const lockfileRelevant = files.some(isLockfileRelevantFile);
  return {
    docsRelevant,
    pagesSiteRelevant: files.some(isPagesSiteFile),
    webRelevant: files.some(isWebRelevantFile),
    webRuntimeRelevant,
    webSourceRelevant: files.some(isWebSourceFile),
    motionRelevant: files.some(isMotionRelevantFile),
    buildRelevant: files.some(isBuildRelevantFile),
    scriptsRelevant,
    pythonRelevant: files.some(isPythonRelevantFile),
    supabaseRelevant: files.some(isSupabaseRelevantFile),
    migrationRelevant: files.some(isMigrationRelevantFile),
    securityRelevant: files.some(isSecurityRelevantFile),
    semgrepRelevant: files.some(isSemgrepRelevantFile),
    regressionRelevant: files.some(isRegressionRelevantFile),
    githubRelevant: files.some((file) => file.startsWith(".github/")),
    mobileRelevant,
    lockfileRelevant: files.some(isLockfileRelevantFile),
    dependencyGraphRelevant: files.some(isDependencyGraphRelevantFile),
    architectureImportRelevant: files.some(isArchitectureImportRelevantFile),
    deadCodeRelevant: webRuntimeRelevant
      || scriptsRelevant
      || mobileRelevant
      || lockfileRelevant
      || files.includes("package.json")
      || files.includes("scripts/knip.json"),
  };
}

function createFullDomains(domains) {
  return {
    ...domains,
    webRelevant: true,
    webRuntimeRelevant: true,
    webSourceRelevant: true,
    motionRelevant: true,
    buildRelevant: true,
    scriptsRelevant: true,
    pythonRelevant: true,
    supabaseRelevant: true,
    migrationRelevant: true,
    securityRelevant: true,
    semgrepRelevant: true,
    regressionRelevant: true,
    githubRelevant: true,
    mobileRelevant: true,
    lockfileRelevant: true,
    dependencyGraphRelevant: true,
    deadCodeRelevant: true,
  };
}

function addInitialChecks({ checks, normalizedScope }) {
  addCheck(checks, {
    id: "diff-check",
    label: "Git diff --check",
    estimatedSeconds: 1,
    critical: true,
    command: {
      executable: "git",
      args: normalizedScope === "STAGED" ? ["diff", "--cached", "--check"] : ["diff", "--check"],
    },
    candidateScope: normalizedScope,
  });
  addCheck(checks, {
    id: "file-naming",
    label: "Convention de nommage des fichiers",
    estimatedSeconds: 2,
    critical: true,
    command: npmCommand("check:file-naming"),
  });
}

function addFullModeChecks({ checks, deduplicated, normalizedScope }) {
  if (normalizedScope === "WORKTREE") {
    addCheck(checks, {
      id: "diff-check-staged",
      label: "Git diff --cached --check",
      estimatedSeconds: 1,
      critical: true,
      command: { executable: "git", args: ["diff", "--cached", "--check"] },
      candidateScope: "STAGED",
    });
  }
  addFullCheck(checks, {
    id: "security-secrets",
    label: "Audit des secrets",
    estimatedSeconds: 5,
    command: npmCommand("security:secrets"),
  });
  addFullPlanChecks(checks);
  deduplicated.push(
    { id: "test:security", status: "ALREADY_PROVEN", reason: "couvert par test:coverage + FULL_SUITE_INCLUDE_GLOBS" },
    { id: "test:regression-gates", status: "ALREADY_PROVEN", reason: "couvert par test:coverage + FULL_SUITE_INCLUDE_GLOBS" },
  );
}

function addFastFoundationalChecks({ checks, normalizedScope, semgrepRelevant }) {
  if (semgrepRelevant) {
    addCheck(checks, {
      id: "semgrep-architecture",
      label: "Garde-fou architectural Semgrep",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("check:semgrep"),
    });
  }
  if (normalizedScope === "WORKTREE") {
    addCheck(checks, {
      id: "diff-check-staged",
      label: "Git diff --cached --check",
      estimatedSeconds: 1,
      critical: true,
      command: { executable: "git", args: ["diff", "--cached", "--check"] },
      candidateScope: "STAGED",
    });
  }
  addCheck(checks, {
    id: "security-secrets",
    label: "Audit des secrets",
    estimatedSeconds: 3,
    critical: true,
    command: npmCommand(
      "security:secrets",
      normalizedScope === "STAGED" ? ["--", "--staged-only"] : [],
    ),
  });
}

function addArchitectureImportCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "architecture-import-boundary",
    label: "Graphe et frontières d'import",
    estimatedSeconds: 15,
    critical: true,
    command: npmCommand("check:architecture-import-boundary"),
  });
}

function addDocumentationChecks({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "documentation-governance",
    label: "Gouvernance documentaire",
    estimatedSeconds: 5,
    critical: true,
    command: npmCommand("check:doc-governance"),
  });
}

function addPagesSiteCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "pages-site-drift",
    label: "Dérive pages_site",
    estimatedSeconds: 5,
    critical: true,
    command: npmCommand("check:pages-site-drift"),
  });
}

function addGitHubActionsCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "github-actions-security",
    label: "Sécurité GitHub Actions",
    estimatedSeconds: 5,
    critical: true,
    command: npmCommand("check:github-actions"),
  });
}

function addLockfileCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "lockfile-policy",
    label: "Politique lockfile",
    estimatedSeconds: 4,
    critical: true,
    command: npmCommand("check:lockfile-policy"),
  });
}

function addDependencyAuditCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "dependency-audit",
    label: "Audit des dépendances npm",
    estimatedSeconds: 15,
    critical: true,
    command: npmCommand("security:dependencies"),
  });
}

function addFastRepositoryChecks({ checks, domains }) {
  addArchitectureImportCheck({ checks, relevant: domains.architectureImportRelevant });
  addDocumentationChecks({ checks, relevant: domains.docsRelevant });
  addPagesSiteCheck({ checks, relevant: domains.pagesSiteRelevant });
  addGitHubActionsCheck({ checks, relevant: domains.githubRelevant });
  addLockfileCheck({ checks, relevant: domains.lockfileRelevant });
  addDependencyAuditCheck({ checks, relevant: domains.dependencyGraphRelevant });
}

function addFastScriptChecks({ checks, files, scriptsRelevant, pythonRelevant }) {
  if (scriptsRelevant) {
    const scriptTests = resolveAssociatedScriptTestFiles(files);
    if (scriptTests.length > 0) {
      addCheck(checks, {
        id: "scripts-tests-targeted",
        label: "Tests ciblés des scripts",
        estimatedSeconds: 30,
        critical: true,
        command: { executable: "node", args: ["--test", ...scriptTests] },
        testFiles: scriptTests,
      });
    }
  }
  if (pythonRelevant) {
    addCheck(checks, {
      id: "python-tests",
      label: "Tests Python",
      estimatedSeconds: 30,
      critical: true,
      command: { executable: process.execPath, args: ["scripts/ci/run-python-tests.mjs"] },
    });
  }
}

function addFastMobileChecks({ checks, mobileRelevant }) {
  if (!mobileRelevant) return;
  addCheck(checks, {
    id: "mobile-typecheck",
    label: "Typecheck mobile",
    estimatedSeconds: 20,
    critical: true,
    command: npmCommand("mobile:typecheck"),
  });
  addCheck(checks, {
    id: "mobile-test",
    label: "Vitest mobile",
    estimatedSeconds: 20,
    critical: true,
    command: npmCommand("mobile:test"),
  });
  addCheck(checks, {
    id: "mobile-security",
    label: "Tests de sécurité mobile",
    estimatedSeconds: 15,
    critical: true,
    command: npmCommand("mobile:security"),
  });
  addCheck(checks, {
    id: "mobile-lint",
    label: "ESLint mobile",
    estimatedSeconds: 20,
    critical: true,
    command: npmCommand("mobile:lint"),
  });
}

function addFastDatabaseChecks({ checks, supabaseRelevant }) {
  if (!supabaseRelevant) return;
  addCheck(checks, {
    id: "supabase-migration-tree",
    label: "Arbre des migrations Supabase",
    estimatedSeconds: 5,
    critical: true,
    command: npmCommand("audit:supabase-migration-trees"),
  });
}

function addFastMigrationChecks({ checks, migrationRelevant, migrationContracts }) {
  if (!migrationRelevant) return;
  const migrationVitestTests = migrationContracts.flatMap((entry) => entry.vitestTests);
  for (const contract of migrationContracts.flatMap((entry) => entry.scriptTests)) {
    const contractName = contract.split("/").at(-1).replace(/\.test\.mjs$/, "");
    addCheck(checks, {
      id: contractName,
      label: `Contrat migration ${contractName}`,
      estimatedSeconds: 10,
      critical: true,
      command: { executable: "node", args: ["--test", contract] },
      contractTest: contract,
    });
  }
  addTargetedVitest(checks, migrationVitestTests, 25);
}

function addMotionCheck({ checks, relevant }) {
  if (!relevant) return;
  addCheck(checks, {
    id: "check:motion",
    label: "Gouvernance Motion/reveal",
    estimatedSeconds: 5,
    critical: true,
    command: npmCommand("check:motion"),
  });
}

function addFastWebTypecheck({ checks, files }) {
  if (!files.some(isTypeScriptFile)) return;
  addCheck(checks, {
    id: "typecheck",
    label: "Typecheck web",
    estimatedSeconds: 35,
    critical: true,
    command: npmCommand("typecheck"),
  });
}

function addFastWebLint({ checks, files, relevant }) {
  if (!relevant) return;
  const lintFiles = files
    .filter(
      (file) =>
        isWebSourceFile(file) &&
        /\.(js|jsx|ts|tsx)$/.test(file) &&
        fs.existsSync(file),
    )
    .map((file) => file.slice("apps/web/".length));
  addCheck(checks, {
    id: "lint-targeted",
    label: "ESLint web ciblé",
    estimatedSeconds: 15,
    critical: true,
    command: {
      executable: "npx",
      args: [
        "eslint",
        "--max-warnings=0",
        "--config",
        "apps/web/eslint.config.mjs",
        ...(lintFiles.length > 0 ? lintFiles.map((file) => `apps/web/${file}`) : ["apps/web/src"]),
      ],
    },
  });
}

function addFastWebTests({ checks, files }) {
  const changedTests = resolveAssociatedWebTestFiles(files);
  const targetedFiles = changedTests.filter(
    (file) => !SECURITY_GROUP_FILES.has(file) && !REGRESSION_GROUP_FILES.has(file),
  );
  addTargetedVitest(checks, targetedFiles);
}

function addFastWebChecks({ checks, files, domains }) {
  if (!domains.webRuntimeRelevant) return;
  addMotionCheck({ checks, relevant: domains.motionRelevant });
  addFastWebTypecheck({ checks, files });
  addFastWebLint({ checks, files, relevant: domains.webSourceRelevant });
  addFastWebTests({ checks, files });
}

function addFastSafetyChecks({ checks, securityRelevant, regressionRelevant }) {
  if (securityRelevant) {
    addCheck(checks, {
      id: "test:security",
      label: "Tests de sécurité",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:security"),
    });
  }
  if (regressionRelevant) {
    addCheck(checks, {
      id: "test:regression-gates",
      label: "Tests de régression",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:regression-gates"),
    });
  }
}

function addFastModeChecks(context) {
  addFastFoundationalChecks(context);
  addFastRepositoryChecks({ checks: context.checks, domains: context });
  addFastScriptChecks(context);
  addFastMobileChecks(context);
  addFastDatabaseChecks(context);
  addFastMigrationChecks(context);
  addFastWebChecks({ checks: context.checks, files: context.files, domains: context });
  addFastSafetyChecks(context);
}

function finalizeModeValidationPlan({ normalizedMode, normalizedScope, files, domains, checks, deduplicated }) {
  const budgetSeconds = VALIDATION_MODE_BUDGETS[normalizedMode];
  const plannedSeconds = checks.reduce((total, check) => total + check.estimatedSeconds, 0);
  const publicDomains = Object.fromEntries(
    Object.entries(domains).filter(([key]) => key !== "architectureImportRelevant"),
  );
  return Object.freeze({
    mode: normalizedMode,
    candidateScope: normalizedScope,
    changedFiles: files,
    domains: Object.freeze(publicDomains),
    budgetSeconds,
    plannedSeconds,
    checks: Object.freeze(checks),
    deduplicated: Object.freeze(deduplicated),
  });
}

export function createModeValidationPlan({
  mode = "FAST",
  candidateScope = "WORKTREE",
  changedFiles = [],
} = {}) {
  const input = normalizePlanInput({ mode, candidateScope, changedFiles });
  const domains = classifyChangedFiles(input.files);
  const checks = [];
  const deduplicated = [];
  addInitialChecks({ checks, normalizedScope: input.normalizedScope });

  if (input.normalizedMode === "FULL") {
    addFullModeChecks({ checks, deduplicated, normalizedScope: input.normalizedScope });
    return finalizeModeValidationPlan({
      ...input,
      domains: createFullDomains(domains),
      checks,
      deduplicated,
    });
  }

  addFastModeChecks({
    checks,
    deduplicated,
    files: input.files,
    normalizedScope: input.normalizedScope,
    migrationContracts: resolveMigrationContracts(input.files),
    ...domains,
  });
  return finalizeModeValidationPlan({
    ...input,
    domains,
    checks,
    deduplicated,
  });
}

export function getBudgetDecision({
  elapsedSeconds,
  estimatedSeconds,
  budgetSeconds,
} = {}) {
  if (budgetSeconds === null) {
    return Object.freeze({ decision: "execute", status: "READY", remainingSeconds: Infinity });
  }
  const remainingSeconds = Number(budgetSeconds) - Number(elapsedSeconds);
  if (remainingSeconds <= 0 || Number(estimatedSeconds) > remainingSeconds) {
    return Object.freeze({ decision: "skip", status: "NOT_RUN_TIME_BUDGET", remainingSeconds });
  }
  return Object.freeze({ decision: "execute", status: "READY", remainingSeconds });
}

export function classifyValidationFailure({
  candidateChangedFiles = [],
  failureFiles = [],
  preexistingProof,
} = {}) {
  const candidate = new Set(candidateChangedFiles.map(normalizePath));
  const foreignOnly = failureFiles.length > 0 && failureFiles.every((file) => !candidate.has(normalizePath(file)));
  const proofPresent = preexistingProof?.verified === true
    && ["baseline", "reproduction", "canonical"].includes(preexistingProof.kind)
    && typeof preexistingProof.source === "string"
    && preexistingProof.candidateLinked !== true;
  return foreignOnly && proofPresent ? "PREEXISTING_PARALLEL_FAILURE" : "FAIL";
}
