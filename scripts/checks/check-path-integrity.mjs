import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_BASELINE_PATH,
  listTrackedFiles,
  loadBaseline,
} from "./check-file-naming.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

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

export function formatPathIntegritySummary(result, { auditedSha = "NOT_MEASURED", dryRun = false, maxDetails = 8 } = {}) {
  const blockingCount = result.newViolations.length + result.configurationErrors.length + result.staleExceptions.length;
  const status = blockingCount > 0 ? "FAIL" : "PASS";
  const lines = [
    `PATH_INTEGRITY_MODE: ${dryRun ? "DRY_RUN" : "CHECK"}`,
    "Path integrity — synthèse humaine",
    `SHA: ${auditedSha} | scope: tracked repository paths | statut: ${status} | mode: ${dryRun ? "DRY_RUN" : "CHECK"}`,
    `Chemins suivis: ${result.trackedFiles.length} | nouvelles violations: ${result.newViolations.length} | exceptions historiques acceptées: ${result.accepted.length} | exceptions périmées: ${result.staleExceptions.length} | erreurs de configuration: ${result.configurationErrors.length}`,
  ];
  if (blockingCount === 0) {
    lines.push("Aucune violation; la liste détaillée des chemins reste disponible dans la sortie JSON.");
    return lines.join("\n");
  }

  for (const violation of result.newViolations.slice(0, maxDetails)) {
    const related = violation.relatedPaths?.length ? `; lié à ${violation.relatedPaths.slice(0, 3).join(", ")}` : "";
    lines.push(`- NOUVEAU ${violation.path} [${violation.rule}] — ${violation.reason}${related}; décision attendue: corriger le chemin ou la collision.`);
  }
  if (result.newViolations.length > maxDetails) lines.push(`- … ${result.newViolations.length - maxDetails} autres violations dans le JSON.`);
  for (const accepted of result.accepted.slice(0, maxDetails)) {
    lines.push(`- HISTORIQUE ${accepted.path} [${accepted.rule}] — ${accepted.exception?.reason ?? accepted.reason ?? "exception du baseline"}; réexamen attendu lors d'une correction naturelle.`);
  }
  if (result.accepted.length > maxDetails) lines.push(`- … ${result.accepted.length - maxDetails} exceptions historiques dans le JSON.`);
  for (const error of result.configurationErrors.slice(0, maxDetails)) lines.push(`- CONFIGURATION — ${error}`);
  for (const stale of result.staleExceptions.slice(0, maxDetails)) {
    const [file, rule] = stale.split("\0");
    lines.push(`- EXCEPTION PÉRIMÉE — ${file} [${rule}]; vérifier le baseline.`);
  }
  lines.push("Preuves détaillées: violations, chemins liés, exceptions et erreurs dans la sortie JSON.");
  return lines.join("\n");
}

function currentHead(root) {
  try {
    return execFileSync(gitExecutable(), ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "NOT_MEASURED";
  }
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
  else console.log(formatPathIntegritySummary(result, { auditedSha: currentHead(options.root), dryRun: options.dryRun }));
  const errors = [
    ...result.configurationErrors,
    ...result.newViolations.map((violation) => `new path integrity violation (${violation.rule}): ${violation.path}`),
    ...result.staleExceptions.map((exception) => `stale path integrity exception: ${exception}`),
  ];
  if (errors.length > 0) {
    console.error("Path integrity check failed.");
    if (options.json) for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) main();
