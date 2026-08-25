#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = path.join(REPO_ROOT, "apps", "web");

export const FULL_SUITE_INCLUDE_GLOBS = Object.freeze([
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
]);

export const VITEST_GROUPS = Object.freeze({
  security: Object.freeze([
    "src/lib/security/validation.test.ts",
    "src/lib/security/indexation-invariants.test.ts",
    "src/lib/seo/indexability.test.ts",
    "src/lib/auth/protected-routes.test.ts",
    "src/lib/community/discussion-rate-limit.test.ts",
    "src/proxy.protected-routes.test.ts",
    "src/proxy.app-shell.test.ts",
    "src/app/api/public-form-security.test.ts",
    "src/app/api/api-boundary.test.ts",
    "src/app/api/actions/route.submit.test.ts",
    "src/app/api/account/profile-role/route.test.ts",
    "src/lib/botid/protected-routes.test.ts",
    "src/lib/botid/server.test.ts",
    "src/app/api/chat/route.test.ts",
  ]),
  regression: Object.freeze([
    "src/lib/actions/contract-regression-gates.test.ts",
    "src/lib/sections-registry.invariants.test.ts",
    "src/lib/navigation.registry-consistency.test.ts",
    "src/lib/vercel-regression-gates.test.ts",
    "src/proxy.protected-routes.test.ts",
  ]),
});

const PARALLEL_STATIC_LABELS = Object.freeze([
  "check:lockfile-policy",
  "typecheck",
  "lint",
  "audit:vercel:ci",
  "quality:top-heavy",
]);

const HEAVY_SERIAL_LABELS = Object.freeze([
  "test:scripts",
  "vitest",
  "build",
  "test:e2e",
]);

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function isDocumentationFile(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("documentation/") ||
    normalized.endsWith(".md") ||
    normalized.endsWith(".mdx")
  );
}

function isWebTestFile(file) {
  return /^apps\/web\/src\/.*\.test\.(ts|tsx)$/.test(normalizePath(file));
}

export function isWebRelevantFile(file) {
  const normalized = normalizePath(file);
  if (isDocumentationFile(normalized)) {
    return false;
  }

  return (
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized.startsWith("apps/web/src/") ||
    normalized.startsWith("apps/web/public/") ||
    normalized.startsWith("apps/web/supabase/") ||
    normalized.startsWith("apps/web/scripts/") ||
    normalized === "apps/web/package.json" ||
    normalized === "apps/web/package-lock.json" ||
    normalized === "apps/web/vitest.config.ts" ||
    /^apps\/web\/(next|postcss|tailwind|tsconfig|eslint|sentry)[^.]*\./.test(normalized)
  );
}

export function isBuildRelevantFile(file) {
  const normalized = normalizePath(file);
  if (isDocumentationFile(normalized) || isWebTestFile(normalized)) {
    return false;
  }

  return (
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized === "apps/web/package.json" ||
    normalized === "apps/web/package-lock.json" ||
    normalized.startsWith("apps/web/public/") ||
    normalized.startsWith("apps/web/scripts/") ||
    (normalized.startsWith("apps/web/src/") && !normalized.includes("/__tests__/")) ||
    /^apps\/web\/(next|postcss|tailwind|tsconfig|eslint|sentry|instrumentation|middleware|proxy)[^/]*\./.test(normalized)
  );
}

function isScriptRelevantFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("scripts/") && !isDocumentationFile(normalized);
}

function isPythonRelevantFile(file) {
  const normalized = normalizePath(file);
  return /^maintenance\/python\/(src|scripts)\/.*\.py$/.test(normalized);
}

function getChangedWebTestFiles(changedFiles) {
  return changedFiles
    .map(normalizePath)
    .filter(isWebTestFile)
    .map((file) => file.slice("apps/web/".length));
}

function parseGroups(groups) {
  const values = Array.isArray(groups) ? groups : [groups];
  return values
    .flatMap((value) => String(value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getVitestFiles({ groups = [], testFiles = [] } = {}) {
  const files = [];
  for (const group of parseGroups(groups)) {
    const groupFiles = VITEST_GROUPS[group];
    if (!groupFiles) {
      throw new Error(`Unknown Vitest validation group: ${group}`);
    }
    files.push(...groupFiles);
  }

  files.push(...testFiles.map((file) => normalizePath(file)));
  return [...new Set(files)];
}

function matchesFullSuiteGlob(file, glob) {
  const normalized = normalizePath(file);
  if (glob === "src/**/*.test.ts") {
    return normalized.startsWith("src/") && normalized.endsWith(".test.ts");
  }
  if (glob === "src/**/*.test.tsx") {
    return normalized.startsWith("src/") && normalized.endsWith(".test.tsx");
  }
  return false;
}

export function fullSuiteCoversFiles(files, includeGlobs = FULL_SUITE_INCLUDE_GLOBS) {
  return files.every((file) => includeGlobs.some((glob) => matchesFullSuiteGlob(file, glob)));
}

export function assertFullSuiteCoverage({ configText } = {}) {
  const source = configText ?? readFileSync(path.join(WEB_ROOT, "vitest.config.ts"), "utf8");
  const missingGlobs = FULL_SUITE_INCLUDE_GLOBS.filter((glob) => !source.includes(glob));
  const groupFiles = getVitestFiles({ groups: Object.keys(VITEST_GROUPS) });
  const uncoveredFiles = groupFiles.filter(
    (file) => !fullSuiteCoversFiles([file], FULL_SUITE_INCLUDE_GLOBS),
  );

  if (missingGlobs.length > 0 || uncoveredFiles.length > 0) {
    throw new Error(
      [
        "The full Vitest suite no longer covers all security/regression groups.",
        missingGlobs.length > 0 ? `Missing include globs: ${missingGlobs.join(", ")}` : "",
        uncoveredFiles.length > 0 ? `Uncovered group files: ${uncoveredFiles.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  return { includeGlobs: FULL_SUITE_INCLUDE_GLOBS, groupFiles };
}

export function createValidationPlan({ scope = "changed", changedFiles = [] } = {}) {
  if (scope !== "changed" && scope !== "full") {
    throw new Error(`Unsupported validation scope: ${scope}`);
  }

  const normalizedFiles = changedFiles.map(normalizePath);
  const full = scope === "full";
  const webRelevant = full || normalizedFiles.some(isWebRelevantFile);
  const buildRelevant = full || normalizedFiles.some(isBuildRelevantFile);
  const scriptsRelevant = full || normalizedFiles.some(isScriptRelevantFile);
  const pythonRelevant = full || normalizedFiles.some(isPythonRelevantFile);
  const fullVitest = full || normalizedFiles.includes("apps/web/vitest.config.ts");
  const changedWebTestFiles = getChangedWebTestFiles(normalizedFiles);

  return {
    scope,
    webRelevant,
    buildRelevant,
    scriptsRelevant,
    pythonRelevant,
    testMode: webRelevant ? (fullVitest ? "full" : "targeted") : "skipped",
    targetedVitestFiles: getVitestFiles({
      groups: ["security", "regression"],
      testFiles: changedWebTestFiles,
    }),
    parallelStatic: {
      throttle: 3,
      labels: PARALLEL_STATIC_LABELS,
    },
    serialHeavy: HEAVY_SERIAL_LABELS.filter((label) => {
      if (label === "test:scripts") return scriptsRelevant;
      if (label === "vitest") return webRelevant;
      if (label === "build") return buildRelevant;
      return false;
    }),
  };
}

function parseCli(argv) {
  const options = {
    groups: [],
    testFiles: [],
    changedFiles: [],
    scope: "changed",
    runVitest: false,
    assert: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--groups" && next) {
      options.groups.push(next);
      index += 1;
    } else if (arg === "--test-file" && next) {
      options.testFiles.push(next);
      index += 1;
    } else if (arg === "--run-vitest") {
      options.runVitest = true;
    } else if (arg === "--assert-full-suite") {
      options.assert = true;
    } else if (arg === "--scope" && next) {
      options.scope = next;
      index += 1;
    } else if (arg === "--changed-file" && next) {
      options.changedFiles.push(next);
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    }
  }
  return options;
}

function runVitest({ groups, testFiles }) {
  const files = getVitestFiles({ groups, testFiles });
  if (files.length === 0) {
    throw new Error("No Vitest files selected.");
  }

  const args = ["run", "test", "-w", "apps/web", "--", ...files];
  let result;
  if (process.platform === "win32") {
    // The desktop runner cannot spawn .cmd files directly with Node. Invoke
    // cmd.exe explicitly while keeping every argument quoted as a data value.
    const quoteCmdArg = (value) => {
      const text = String(value);
      return /^[A-Za-z0-9_./:-]+$/.test(text)
        ? text
        : `"${text.replaceAll('"', '\\"')}"`;
    };
    const commandLine = ["npm.cmd", ...args.map(quoteCmdArg)].join(" ");
    result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
  } else {
    result = spawnSync("npm", args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
  }
  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    const options = parseCli(process.argv.slice(2));
    if (options.assert) {
      const result = assertFullSuiteCoverage();
      console.log(
        `[validation-policy] full Vitest coverage OK: ${result.groupFiles.length} grouped files covered`,
      );
    } else if (options.runVitest) {
      runVitest(options);
    } else if (options.json || options.changedFiles.length > 0 || options.scope === "full") {
      process.stdout.write(
        `${JSON.stringify(
          createValidationPlan({ scope: options.scope, changedFiles: options.changedFiles }),
        )}\n`,
      );
    } else {
      throw new Error("Use --run-vitest, --assert-full-suite or a validation scope.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
