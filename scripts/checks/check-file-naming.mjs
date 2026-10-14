import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_BASELINE_PATH = "scripts/checks/file-naming-baseline.json";

export const NEXT_RESERVED_BASENAMES = new Set([
  "page", "layout", "loading", "error", "global-error", "not-found", "template", "default",
  "route", "middleware", "proxy", "instrumentation", "icon", "sitemap", "robots", "manifest",
  "opengraph-image", "twitter-image",
]);

function normalizePath(file) {
  return String(file).replaceAll("\\", "/");
}

function fileName(file) {
  return normalizePath(file).split("/").at(-1);
}

function extensionlessName(file) {
  return fileName(file).replace(/\.(?:[cm]?ts|tsx|[cm]?js|jsx|py|sql|json|ya?ml|mdx?|txt|toml|ini)$/, "");
}

function isTypeScriptFile(file) {
  return /\.(?:[cm]?ts|tsx)$/.test(fileName(file));
}

function isPythonFile(file) {
  return fileName(file).endsWith(".py");
}

function isGeneratedOrVendor(file) {
  return /(^|\/)(node_modules|vendor|generated|dist|build)(\/|$)/.test(file)
    || /\.generated\./.test(file);
}

function isDocumentationFile(file) {
  return /(^|\/)documentation(\/|$)/.test(file)
    || /\.(?:md|mdx|txt)$/.test(fileName(file));
}

function isMigrationFile(file) {
  return /(^|\/)apps\/web\/supabase\/migrations\//.test(file)
    && fileName(file).endsWith(".sql");
}

const TEST_SUPPORT_SEGMENTS = new Set([
  "fixture", "fixtures", "helper", "helpers", "harness", "harnesses", "mock", "mocks",
  "scenario", "scenarios", "support",
]);
const TEST_CONTEXT_SEGMENTS = new Set(["__tests__", "e2e", "fixture", "fixtures", "tests"]);

function testNameTokens(file) {
  return fileName(file).split(".").slice(0, -1).flatMap((part) => part.split("-"));
}

function isTestSupportFile(file) {
  if (isTypeScriptFile(file) && testNameIsValid(fileName(file))) return false;
  const segments = normalizePath(file).split("/");
  const hasTestContext = segments.some((segment) => TEST_CONTEXT_SEGMENTS.has(segment));
  const hasSupportDirectory = segments.some((segment) => TEST_SUPPORT_SEGMENTS.has(segment));
  const tokens = testNameTokens(file);
  const hasTestMarker = tokens.includes("test") || tokens.includes("tests");
  const hasSupportMarker = tokens.some((token) => TEST_SUPPORT_SEGMENTS.has(token));
  return (hasTestContext && (hasSupportDirectory || hasSupportMarker))
    || (hasTestMarker && hasSupportMarker);
}

function isTestFile(file) {
  if (isTestSupportFile(file)) return false;
  return /(^|\/)(__tests__|tests)(\/|$)/.test(file)
    || /\.(?:test|spec)(?:\.[^.]+)*\.(?:[cm]?[jt]sx?)$/.test(fileName(file));
}

function isConfigFile(file) {
  const name = fileName(file);
  return /^(?:package(?:-lock)?|tsconfig(?:\.[^.]+)?|next\.config|vite\.config|vitest\.config|eslint\.config|prettier\.config|postcss\.config|tailwind\.config|vercel|docker-compose|turbo|Makefile|Dockerfile|\.env[^/]*|\.editorconfig|\.gitignore|\.gitattributes|\.npmrc|\.nvmrc|pnpm-workspace|biome\.json)/.test(name)
    || /\.(?:json|ya?ml|toml|ini|config\.[cm]?[jt]s)$/.test(name);
}

function kebabSegment(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function classifyStyle(stem) {
  const parts = stem.split(".");
  if (parts.length > 1 && parts.every(kebabSegment)) return "kebab-case";
  if (parts.length > 1) return "exception";
  if (kebabSegment(stem)) return "kebab-case";
  if (/^[A-Z][A-Za-z0-9]*$/.test(stem)) return "PascalCase";
  if (/^[a-z][A-Za-z0-9]*$/.test(stem) && /[A-Z]/.test(stem)) return "camelCase";
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(stem) || /^__[^_]+__$/.test(stem)) return "snake_case";
  return "exception";
}

export function classifyFile(file) {
  const normalized = normalizePath(file);
  const name = fileName(normalized);
  const stem = extensionlessName(normalized);
  if (isGeneratedOrVendor(normalized)) return "generated/vendor";
  if (isDocumentationFile(normalized)) return "documentation";
  if (isMigrationFile(normalized)) return "migrations SQL";
  if (isTypeScriptFile(normalized) && NEXT_RESERVED_BASENAMES.has(stem)) return "Next reserved";
  if (isPythonFile(normalized)) return "Python";
  if (isTestSupportFile(normalized)) return "test support";
  if (isTestFile(normalized)) return "tests";
  if (isConfigFile(normalized)) return "config";
  if (isTypeScriptFile(normalized)) return "TS/TSX";
  if (name.endsWith(".sql")) return "SQL";
  return "other";
}

function pythonNameIsValid(stem) {
  return /^_?[a-z0-9]+(?:_[a-z0-9]+)*$/.test(stem) || stem === "__init__";
}

function migrationNameIsValid(name) {
  return /^\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/.test(name);
}

function testNameIsValid(name) {
  return /^.+\.test\.(?:ts|tsx)$/.test(name);
}

export function findNamingViolations(trackedFiles) {
  const violations = [];
  for (const rawFile of trackedFiles) {
    const file = normalizePath(rawFile);
    const category = classifyFile(file);
    const name = fileName(file);
    const stem = extensionlessName(file);
    if (category === "TS/TSX") {
      const observedStyle = classifyStyle(stem);
      if (observedStyle !== "kebab-case") violations.push({ path: file, rule: "ts-tsx-kebab-case", observedStyle });
    } else if (category === "test support" && isTypeScriptFile(file)) {
      const observedStyle = classifyStyle(stem);
      if (observedStyle !== "kebab-case") violations.push({ path: file, rule: "test-support-kebab-case", observedStyle });
    } else if (category === "tests" && isTypeScriptFile(file) && !testNameIsValid(name)) {
      violations.push({ path: file, rule: "test-suffix", observedStyle: "legacy-test-name" });
    } else if (category === "Python" && !pythonNameIsValid(stem)) {
      violations.push({ path: file, rule: "python-snake-case", observedStyle: classifyStyle(stem) });
    } else if (category === "migrations SQL" && !migrationNameIsValid(name)) {
      violations.push({ path: file, rule: "supabase-timestamped-migration", observedStyle: "legacy-migration-name" });
    }
  }
  return violations.sort((left, right) => left.path.localeCompare(right.path));
}

export function summarizeTrackedFiles(trackedFiles) {
  const categories = new Map();
  for (const file of trackedFiles) {
    const category = classifyFile(file);
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }
  return Object.fromEntries([...categories.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function validateNaming({ trackedFiles, baseline }) {
  const normalizedFiles = [...new Set(trackedFiles.map(normalizePath))].sort();
  const violations = findNamingViolations(normalizedFiles);
  const exceptions = Array.isArray(baseline?.exceptions) ? baseline.exceptions : [];
  const baselineByPath = new Map();
  const configurationErrors = [];
  for (const exception of exceptions) {
    const exceptionPath = normalizePath(exception?.path ?? "");
    if (!exceptionPath || baselineByPath.has(exceptionPath)) {
      configurationErrors.push(`duplicate or empty baseline exception: ${exceptionPath || "<empty>"}`);
      continue;
    }
    baselineByPath.set(exceptionPath, { ...exception, path: exceptionPath });
  }
  const violationsByPath = new Map(violations.map((violation) => [violation.path, violation]));
  const accepted = [];
  const newViolations = [];
  for (const violation of violations) {
    const exception = baselineByPath.get(violation.path);
    if (exception?.rule === violation.rule) accepted.push({ ...violation, exception });
    else newViolations.push(violation);
  }
  const staleExceptions = exceptions
    .map((exception) => normalizePath(exception?.path ?? ""))
    .filter((exceptionPath) => !violationsByPath.has(exceptionPath));
  return {
    trackedFiles: normalizedFiles,
    categories: summarizeTrackedFiles(normalizedFiles),
    violations,
    accepted,
    newViolations,
    staleExceptions,
    configurationErrors,
  };
}

export function listTrackedFiles(root = repositoryRoot) {
  return execFileSync("git", ["ls-files", "-z", "--"], { cwd: root })
    .toString("utf8").split("\0").filter(Boolean).map(normalizePath).sort();
}

export function loadBaseline(root = repositoryRoot, baselinePath = DEFAULT_BASELINE_PATH) {
  const absolutePath = path.isAbsolute(baselinePath) ? baselinePath : path.join(root, baselinePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

export function runNamingCheck({ root = repositoryRoot, baselinePath = DEFAULT_BASELINE_PATH } = {}) {
  return validateNaming({ trackedFiles: listTrackedFiles(root), baseline: loadBaseline(root, baselinePath) });
}

function parseArgs(argv) {
  const options = { root: repositoryRoot, baselinePath: DEFAULT_BASELINE_PATH, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--root" && next) { options.root = path.resolve(next); index += 1; }
    else if (arg.startsWith("--root=")) options.root = path.resolve(arg.slice("--root=".length));
    else if (arg === "--baseline" && next) { options.baselinePath = next; index += 1; }
    else if (arg.startsWith("--baseline=")) options.baselinePath = arg.slice("--baseline=".length);
    else if (arg === "--json") options.json = true;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runNamingCheck(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`File naming audit: ${result.trackedFiles.length} tracked file(s).`);
    for (const [category, count] of Object.entries(result.categories)) console.log(`- ${category}: ${count}`);
    console.log(`Historical naming exceptions accepted: ${result.accepted.length}`);
  }
  const errors = [
    ...result.configurationErrors,
    ...result.newViolations.map((violation) => `new naming violation (${violation.rule}): ${violation.path}`),
    ...result.staleExceptions.map((file) => `stale naming exception: ${file}`),
  ];
  if (errors.length > 0) {
    console.error("File naming check failed.");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log("File naming check passed: tracked files follow the current convention or an explicit baseline exception.");
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) main();
