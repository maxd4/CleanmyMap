import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_BASELINE_PATH,
  listTrackedFiles,
  loadBaseline,
} from "./check-file-naming.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WINDOWS_RESERVED_BASENAME = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i;
const WINDOWS_FORBIDDEN_CHARACTER = /[<>:"|?*\u0000-\u001f]/;

function normalizeGitPath(file) {
  return String(file).replaceAll("\\", "/");
}

function windowsSegments(file) {
  return String(file).split(/[\\/]/u).filter(Boolean);
}

function windowsComparableSegment(segment) {
  return segment.replace(/[ .]+$/u, "");
}

function addGroupViolations(violations, files, rule, message) {
  if (files.length < 2) return;
  for (const file of files) {
    violations.push({
      path: file,
      rule,
      blocking: true,
      relatedPaths: files.filter((candidate) => candidate !== file),
      reason: message,
    });
  }
}

export function findPathIntegrityViolations(trackedFiles) {
  const files = [...new Set(trackedFiles.map(String))].sort((left, right) => left.localeCompare(right, "en"));
  const violations = [];
  const caseGroups = new Map();
  const unicodeGroups = new Map();
  const combinedGroups = new Map();

  for (const file of files) {
    const slashPath = normalizeGitPath(file);
    const caseKey = slashPath.toLocaleLowerCase("en-US");
    const unicodeKey = slashPath.normalize("NFC");
    const combinedKey = unicodeKey.toLocaleLowerCase("en-US");
    caseGroups.set(caseKey, [...(caseGroups.get(caseKey) ?? []), file]);
    unicodeGroups.set(unicodeKey, [...(unicodeGroups.get(unicodeKey) ?? []), file]);
    combinedGroups.set(combinedKey, [...(combinedGroups.get(combinedKey) ?? []), file]);

    if (String(file).includes("\\")) {
      violations.push({
        path: file,
        rule: "windows-backslash-separator",
        blocking: true,
        reason: "A backslash is interpreted as a path separator on Windows",
      });
    }

    for (const segment of windowsSegments(file)) {
      const comparable = windowsComparableSegment(segment);
      const basename = comparable.split(".", 1)[0];
      if (WINDOWS_RESERVED_BASENAME.test(comparable) || WINDOWS_RESERVED_BASENAME.test(basename)) {
        violations.push({
          path: file,
          rule: "windows-reserved-name",
          blocking: true,
          reason: `Windows device name reserved in path segment '${segment}'`,
        });
      }
      if (WINDOWS_FORBIDDEN_CHARACTER.test(segment)) {
        violations.push({
          path: file,
          rule: "windows-forbidden-character",
          blocking: true,
          reason: `Windows-forbidden character in path segment '${segment}'`,
        });
      }
      if (/[. ]$/u.test(segment)) {
        violations.push({
          path: file,
          rule: "windows-forbidden-suffix",
          blocking: true,
          reason: "Windows path segments cannot end with a dot or space",
        });
      }
    }
  }

  const combinedCollisionGroups = [...combinedGroups.values()]
    .filter((filesForKey) => new Set(filesForKey.map((file) => normalizeGitPath(file).normalize("NFC"))).size > 1
      && new Set(filesForKey.map((file) => normalizeGitPath(file).toLocaleLowerCase("en-US"))).size > 1);
  const coveredByCombinedCollision = (filesForKey) => combinedCollisionGroups.some((combinedFiles) => {
    const combinedSet = new Set(combinedFiles);
    return filesForKey.every((file) => combinedSet.has(file));
  });
  for (const filesForKey of caseGroups.values()) {
    if (!coveredByCombinedCollision(filesForKey)) addGroupViolations(violations, filesForKey, "case-collision", "Paths collide when compared case-insensitively");
  }
  for (const filesForKey of unicodeGroups.values()) {
    if (!coveredByCombinedCollision(filesForKey)) addGroupViolations(violations, filesForKey, "unicode-normalization-collision", "Paths collide after Unicode NFC normalization");
  }
  for (const filesForKey of combinedCollisionGroups) {
    addGroupViolations(violations, filesForKey, "case-unicode-normalization-collision", "Paths collide after NFC normalization and case-insensitive comparison");
  }

  const unique = new Map();
  for (const violation of violations) unique.set(`${violation.path}\0${violation.rule}`, violation);
  return [...unique.values()].sort((left, right) => left.path.localeCompare(right.path, "en") || left.rule.localeCompare(right.rule, "en"));
}

function pathIntegrityExceptions(baseline) {
  return Array.isArray(baseline?.pathIntegrityExceptions) ? baseline.pathIntegrityExceptions : [];
}

export function validatePathIntegrity({ trackedFiles, baseline }) {
  const normalizedFiles = [...new Set(trackedFiles.map(String))].sort((left, right) => left.localeCompare(right, "en"));
  const violations = findPathIntegrityViolations(normalizedFiles);
  const exceptions = pathIntegrityExceptions(baseline);
  const baselineByKey = new Map();
  const configurationErrors = [];
  for (const exception of exceptions) {
    const exceptionPath = String(exception?.path ?? "");
    const rule = String(exception?.rule ?? "");
    const key = `${exceptionPath}\0${rule}`;
    if (!exceptionPath || !rule || baselineByKey.has(key)) {
      configurationErrors.push(`duplicate or incomplete path integrity exception: ${key || "<empty>"}`);
      continue;
    }
    baselineByKey.set(key, { ...exception, path: exceptionPath, rule });
  }
  const violationsByKey = new Map(violations.map((violation) => [`${violation.path}\0${violation.rule}`, violation]));
  const accepted = [];
  const newViolations = [];
  for (const violation of violations) {
    const exception = baselineByKey.get(`${violation.path}\0${violation.rule}`);
    if (exception) accepted.push({ ...violation, exception });
    else newViolations.push(violation);
  }
  const staleExceptions = exceptions
    .map((exception) => `${String(exception?.path ?? "")}\0${String(exception?.rule ?? "")}`)
    .filter((key) => !violationsByKey.has(key));
  return {
    trackedFiles: normalizedFiles,
    violations,
    accepted,
    newViolations,
    staleExceptions,
    configurationErrors,
  };
}

export function runPathIntegrityCheck({ root = repositoryRoot, baselinePath = DEFAULT_BASELINE_PATH } = {}) {
  return validatePathIntegrity({
    trackedFiles: listTrackedFiles(root, { normalize: false }),
    baseline: loadBaseline(root, baselinePath),
  });
}

function parseArgs(argv) {
  const options = { root: repositoryRoot, baselinePath: DEFAULT_BASELINE_PATH, dryRun: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--root" && next) { options.root = path.resolve(next); index += 1; }
    else if (arg.startsWith("--root=")) options.root = path.resolve(arg.slice("--root=".length));
    else if (arg === "--baseline" && next) { options.baselinePath = next; index += 1; }
    else if (arg.startsWith("--baseline=")) options.baselinePath = arg.slice("--baseline=".length);
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runPathIntegrityCheck(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`PATH_INTEGRITY_MODE: ${options.dryRun ? "DRY_RUN" : "CHECK"}`);
    console.log(`Path integrity audit: ${result.trackedFiles.length} tracked file(s).`);
    console.log(`- Objective violations: ${result.newViolations.length}`);
    console.log(`- Historical exceptions accepted: ${result.accepted.length}`);
  }
  const errors = [
    ...result.configurationErrors,
    ...result.newViolations.map((violation) => `new path integrity violation (${violation.rule}): ${violation.path}`),
    ...result.staleExceptions.map((exception) => `stale path integrity exception: ${exception}`),
  ];
  if (errors.length > 0) {
    console.error("Path integrity check failed.");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log("Path integrity check passed: no new objective cross-platform path violation.");
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) main();
