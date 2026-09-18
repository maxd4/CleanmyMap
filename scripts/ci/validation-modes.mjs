#!/usr/bin/env node

import {
  getVitestFiles,
  isBuildRelevantFile,
  isWebRelevantFile,
} from "../checks/validation-policy.mjs";
import {
  resolveAssociatedWebTestFiles,
  resolveMigrationContracts,
} from "./validation-resolution.mjs";
import fs from "node:fs";

export const VALIDATION_MODE_BUDGETS = Object.freeze({
  FAST: 180,
  FULL: 720,
});

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
  const docsRelevant = files.some(isDocumentationFile);
  const pagesSiteRelevant = files.some(isPagesSiteFile);
  const webRelevant = files.some(isWebRelevantFile);
  const webRuntimeRelevant = files.some(isWebRuntimeRelevantFile);
  const webSourceRelevant = files.some(isWebSourceFile);
  const motionRelevant = files.some(isMotionRelevantFile);
  const buildRelevant = files.some(isBuildRelevantFile);
  const scriptsRelevant = files.some(isScriptRelevantFile);
  const pythonRelevant = files.some(isPythonRelevantFile);
  const supabaseRelevant = files.some(isSupabaseRelevantFile);
  const migrationRelevant = files.some(isMigrationRelevantFile);
  const securityRelevant = files.some(isSecurityRelevantFile);
  const regressionRelevant = files.some(isRegressionRelevantFile);
  const githubRelevant = files.some((file) => normalizePath(file).startsWith(".github/"));
  const mobileRelevant = files.some((file) => normalizePath(file).startsWith("apps/mobile/"));
  const lockfileRelevant = files.some(isLockfileRelevantFile);
  const deadCodeRelevant =
    webRuntimeRelevant ||
    scriptsRelevant ||
    mobileRelevant ||
    lockfileRelevant ||
    files.includes("package.json") ||
    files.includes("scripts/knip.json");
  const checks = [];
  const deduplicated = [];
  const migrationContracts = resolveMigrationContracts(files);

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
  if (full && files.length > 0) {
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
  if (migrationRelevant) {
    const migrationVitestTests = migrationContracts.flatMap((entry) => entry.vitestTests);
    for (const contract of migrationContracts.flatMap((entry) => entry.scriptTests)) {
      const contractName = contract.split("/").at(-1).replace(/\.test\.mjs$/, "");
      addCheck(checks, {
        id: `${contractName}`,
        label: `Contrat migration ${contractName}`,
        estimatedSeconds: 10,
        critical: true,
        command: { executable: "node", args: ["--test", contract] },
        contractTest: contract,
      });
    }
    if (full && webRuntimeRelevant) {
      for (const testFile of migrationVitestTests) {
        deduplicated.push({
          id: `migration-contract:${testFile}`,
          status: "ALREADY_PROVEN",
          reason: "couvert par vitest-full + quality:coverage",
        });
      }
    } else {
      addTargetedVitest(checks, migrationVitestTests, 25);
    }
  }

  if (webRuntimeRelevant) {
    if (motionRelevant) {
      addCheck(checks, {
        id: "check:motion",
        label: "Gouvernance Motion/reveal",
        estimatedSeconds: 5,
        critical: true,
        command: npmCommand("check:motion"),
      });
    }
    if (full) {
      if (webSourceRelevant || scriptsRelevant) {
        addCheck(checks, {
          id: "quality-duplication",
          label: "Ratchet duplication jscpd",
          estimatedSeconds: 5,
          critical: true,
          command: npmCommand("quality:duplication"),
        });
        addCheck(checks, {
          id: "quality-cycles",
          label: "Ratchet cycles GitNexus",
          estimatedSeconds: 35,
          critical: true,
          command: npmCommand("quality:cycles"),
        });
      }
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
    }
    if (webSourceRelevant) {
      addCheck(checks, {
        id: "quality-top-heavy",
        label: "Qualité des fichiers lourds",
        estimatedSeconds: 5,
        critical: true,
        command: npmCommand("quality:top-heavy"),
      });
      addCheck(checks, {
        id: "quality-complexity",
        label: full ? "Ratchet complexité/longueur complet" : "Ratchet complexité/longueur ciblé",
        estimatedSeconds: full ? 90 : 20,
        critical: true,
        command: npmCommand("quality:complexity", full ? [] : ["--changed-only"]),
      });
    }
    if (full) {
      addCheck(checks, {
        id: "vitest-full",
        label: "Vitest Web complet + couverture",
        estimatedSeconds: 190,
        critical: true,
        command: npmCommand("quality:coverage"),
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
        { id: "test:security", status: "ALREADY_PROVEN", reason: "couvert par vitest-full + quality:coverage" },
        { id: "test:regression-gates", status: "ALREADY_PROVEN", reason: "couvert par vitest-full + quality:coverage" },
      );
    } else {
      const changedTests = resolveAssociatedWebTestFiles(files);
      const targetedFiles = changedTests.filter(
        (file) => !SECURITY_GROUP_FILES.has(file) && !REGRESSION_GROUP_FILES.has(file),
      );
      addTargetedVitest(checks, targetedFiles);
    }
  }

  if (full && deadCodeRelevant) {
    addCheck(checks, {
      id: "quality-dead-code",
      label: "Ratchet dead-code Knip",
      estimatedSeconds: 30,
      critical: true,
      command: npmCommand("quality:dead-code"),
    });
  }

  if (securityRelevant && (!webRuntimeRelevant || normalizedMode === "FAST")) {
    addCheck(checks, {
      id: "test:security",
      label: "Tests de sécurité",
      estimatedSeconds: 45,
      critical: true,
      command: npmCommand("test:security"),
    });
  }
  if (regressionRelevant && (!webRuntimeRelevant || normalizedMode === "FAST")) {
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
    domains: Object.freeze({
      docsRelevant,
      pagesSiteRelevant,
      webRelevant,
      webRuntimeRelevant,
      webSourceRelevant,
      motionRelevant,
      buildRelevant,
      scriptsRelevant,
      pythonRelevant,
      supabaseRelevant,
      migrationRelevant,
      securityRelevant,
      regressionRelevant,
      githubRelevant,
      mobileRelevant,
      lockfileRelevant,
      deadCodeRelevant,
    }),
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
