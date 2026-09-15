#!/usr/bin/env node

import {
  getVitestFiles,
  isBuildRelevantFile,
  isWebRelevantFile,
} from "../checks/validation-policy.mjs";

export const VALIDATION_MODE_BUDGETS = Object.freeze({
  FAST: 180,
  FULL: 600,
});

const MIGRATION_CONTRACT_TESTS = Object.freeze([
  "src/lib/chat/action-conversations-migration.test.ts",
  "src/lib/chat/action-message-reference-migration.test.ts",
  "src/lib/chat/dm-inbox-migration.test.ts",
  "src/lib/chat/feedback-private-reply-migration.test.ts",
  "src/lib/supabase/territory-context-migration.test.ts",
  "src/lib/supabase/supabase-security-advisors.test.ts",
]);

const SECURITY_GROUP_FILES = new Set(getVitestFiles({ groups: ["security"] }));
const REGRESSION_GROUP_FILES = new Set(getVitestFiles({ groups: ["regression"] }));

export function normalizePath(file) {
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

function getChangedWebTestFiles(changedFiles) {
  return changedFiles
    .map(normalizePath)
    .filter((file) => /^apps\/web\/src\/.*\.test\.(ts|tsx)$/.test(file))
    .map((file) => file.slice("apps/web/".length));
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

function isSecurityRelevantFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("apps/web/src/app/api/") ||
    normalized.startsWith("apps/web/src/lib/auth") ||
    normalized.startsWith("apps/web/src/lib/security/") ||
    normalized.includes("/permissions") ||
    normalized.startsWith("apps/web/supabase/") ||
    normalized.startsWith("scripts/checks/secret-")
  );
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

function npmCommand(script, args = []) {
  return {
    executable: "npm",
    args: ["run", script, ...args],
  };
}

function addCheck(checks, check) {
  if (checks.some((entry) => entry.id === check.id)) return;
  checks.push(Object.freeze(check));
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

export function createModeValidationPlan({
  mode = "FAST",
  candidateScope = "WORKTREE",
  changedFiles = [],
} = {}) {
  const normalizedMode = String(mode).toUpperCase();
  const normalizedScope = String(candidateScope).toUpperCase();
  if (!(normalizedMode in VALIDATION_MODE_BUDGETS)) {
    throw new Error(`Unsupported validation mode: ${mode}`);
  }
  if (!["WORKTREE", "STAGED"].includes(normalizedScope)) {
    throw new Error(`Unsupported candidate scope: ${candidateScope}`);
  }

  const files = [...new Set(changedFiles.map(normalizePath))];
  const full = normalizedMode === "FULL";
  const docsRelevant = full || files.some(isDocumentationFile);
  const pagesSiteRelevant = full || files.some(isPagesSiteFile);
  const webRelevant = full || files.some(isWebRelevantFile);
  const webSourceRelevant = full || files.some(isWebSourceFile);
  const buildRelevant = full || files.some(isBuildRelevantFile);
  const scriptsRelevant = full || files.some(isScriptRelevantFile);
  const pythonRelevant = full || files.some(isPythonRelevantFile);
  const supabaseRelevant = full || files.some(isSupabaseRelevantFile);
  const migrationRelevant = full || files.some(isMigrationRelevantFile);
  const securityRelevant = full || files.some(isSecurityRelevantFile);
  const regressionRelevant = full || files.some(isRegressionRelevantFile);
  const githubRelevant = full || files.some((file) => normalizePath(file).startsWith(".github/"));
  const mobileRelevant = full || files.some((file) => normalizePath(file).startsWith("apps/mobile/"));
  const lockfileRelevant = full || files.some(isLockfileRelevantFile);
  const checks = [];
  const deduplicated = [];

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

  if (docsRelevant) {
    addCheck(checks, {
      id: "documentation-governance",
      label: "Gouvernance documentaire",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("check:doc-governance"),
    });
  }
  if (pagesSiteRelevant) {
    addCheck(checks, {
      id: "pages-site-drift",
      label: "Dérive pages_site",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("check:pages-site-drift"),
    });
  }
  if (githubRelevant) {
    addCheck(checks, {
      id: "github-actions-security",
      label: "Sécurité GitHub Actions",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("check:github-actions"),
    });
  }
  if (lockfileRelevant) {
    addCheck(checks, {
      id: "lockfile-policy",
      label: "Politique lockfile",
      estimatedSeconds: 4,
      critical: true,
      command: npmCommand("check:lockfile-policy"),
    });
  }
  if (full) {
    addCheck(checks, {
      id: "root-file-hygiene",
      label: "Hygiène des fichiers racine",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("check:root-files"),
    });
    addCheck(checks, {
      id: "stack-documentation-drift",
      label: "Dérive stack/documentation",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("check:stack-doc-drift"),
    });
  }
  if (scriptsRelevant) {
    addCheck(checks, {
      id: "scripts-tests",
      label: "Tests déterministes des scripts",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:scripts"),
    });
  }
  if (pythonRelevant) {
    addCheck(checks, {
      id: "python-tests",
      label: "Tests Python",
      estimatedSeconds: 30,
      critical: true,
      command: { executable: "python", args: ["-m", "pytest", "-q", "maintenance/python/tests"] },
    });
  }
  if (mobileRelevant) {
    addCheck(checks, {
      id: "mobile-typecheck",
      label: "Typecheck mobile",
      estimatedSeconds: 20,
      critical: true,
      command: npmCommand("mobile:typecheck"),
    });
  }
  if (supabaseRelevant) {
    addCheck(checks, {
      id: "supabase-migration-tree",
      label: "Arbre des migrations Supabase",
      estimatedSeconds: 5,
      critical: true,
      command: npmCommand("audit:supabase-migration-trees"),
    });
  }
  if (migrationRelevant && !full) {
    addTargetedVitest(checks, MIGRATION_CONTRACT_TESTS, 25);
  } else if (migrationRelevant) {
    deduplicated.push({
      id: "migration-contracts",
      status: "ALREADY_PROVEN",
      reason: "couvert par vitest-full et audit de l'arbre",
    });
  }

  if (webRelevant) {
    if (full) {
      addCheck(checks, {
        id: "vercel-ci-audit",
        label: "Audit Vercel CI",
        estimatedSeconds: 10,
        critical: true,
        command: npmCommand("audit:vercel:ci"),
      });
    }
    if (full) {
      addCheck(checks, {
        id: "typecheck",
        label: "Typecheck web",
        estimatedSeconds: 35,
        critical: true,
        command: npmCommand("typecheck"),
      });
      addCheck(checks, {
        id: "lint",
        label: "ESLint web",
        estimatedSeconds: 45,
        critical: true,
        command: npmCommand("lint"),
      });
    } else {
      const tsChanged = files.some(isTypeScriptFile);
      if (tsChanged) {
        addCheck(checks, {
          id: "typecheck",
          label: "Typecheck web",
          estimatedSeconds: 35,
          critical: true,
          command: npmCommand("typecheck"),
        });
      }
      if (webSourceRelevant) {
        const lintFiles = files
          .filter((file) => isWebSourceFile(file) && /\.(js|jsx|ts|tsx)$/.test(file))
          .map((file) => file.slice("apps/web/".length));
        addCheck(checks, {
          id: "lint-targeted",
          label: "ESLint web ciblé",
          estimatedSeconds: 15,
          critical: true,
          command: {
            executable: "npx",
            args: ["eslint", ...(lintFiles.length > 0 ? lintFiles : ["src"])],
          },
        });
      }
    }
    if (webSourceRelevant) {
      addCheck(checks, {
        id: "quality-top-heavy",
        label: "Qualité des fichiers lourds",
        estimatedSeconds: 5,
        critical: true,
        command: npmCommand("quality:top-heavy"),
      });
    }
    if (full) {
      addCheck(checks, {
        id: "vitest-full",
        label: "Vitest Web complet",
        estimatedSeconds: 120,
        critical: true,
        command: npmCommand("test"),
      });
      if (buildRelevant) {
        addCheck(checks, {
          id: "build",
          label: "Build production",
          estimatedSeconds: 150,
          critical: true,
          command: npmCommand("build"),
        });
      }
      deduplicated.push(
        { id: "test:security", status: "ALREADY_PROVEN", reason: "couvert par vitest-full" },
        { id: "test:regression-gates", status: "ALREADY_PROVEN", reason: "couvert par vitest-full" },
      );
    } else {
      const changedTests = getChangedWebTestFiles(files);
      const targetedFiles = changedTests.filter(
        (file) => !SECURITY_GROUP_FILES.has(file) && !REGRESSION_GROUP_FILES.has(file),
      );
      addTargetedVitest(checks, targetedFiles);
    }
  }

  if (!full && securityRelevant) {
    addCheck(checks, {
      id: "test:security",
      label: "Tests de sécurité",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:security"),
    });
  }
  if (!full && regressionRelevant) {
    addCheck(checks, {
      id: "test:regression-gates",
      label: "Tests de régression",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:regression-gates"),
    });
  }

  const budgetSeconds = VALIDATION_MODE_BUDGETS[normalizedMode];
  const plannedSeconds = checks.reduce((total, check) => total + check.estimatedSeconds, 0);
  return Object.freeze({
    mode: normalizedMode,
    candidateScope: normalizedScope,
    changedFiles: files,
    budgetSeconds,
    plannedSeconds,
    checks: Object.freeze(checks),
    deduplicated: Object.freeze(deduplicated),
  });
}

export function getBudgetDecision({
  elapsedSeconds,
  estimatedSeconds,
  budgetSeconds,
} = {}) {
  const remainingSeconds = Number(budgetSeconds) - Number(elapsedSeconds);
  if (remainingSeconds <= 0 || Number(estimatedSeconds) > remainingSeconds) {
    return Object.freeze({ decision: "skip", status: "NOT_RUN_TIME_BUDGET", remainingSeconds });
  }
  return Object.freeze({ decision: "execute", status: "READY", remainingSeconds });
}

export function classifyValidationFailure({ candidateChangedFiles = [], failureFiles = [] } = {}) {
  const candidate = new Set(candidateChangedFiles.map(normalizePath));
  const foreignOnly = failureFiles.length > 0 && failureFiles.every((file) => !candidate.has(normalizePath(file)));
  return foreignOnly ? "PREEXISTING_PARALLEL_FAILURE" : "FAIL";
}
