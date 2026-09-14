#!/usr/bin/env node

import path from "node:path";
import {
  createRepositoryView,
  normalizeRepositoryPath,
  parseRepositoryRef,
} from "./repository-view.mjs";
import {
  HARD_THRESHOLD,
  REVIEW_THRESHOLD,
  isAboveThreshold,
} from "./top-heavy-policy.mjs";

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const ALLOWED_BASELINE_DECISIONS = new Set([
  "COHESIVE_SINGLE_FILE",
  "DEFERRED_SPLIT",
]);

function readArg(name, fallback) {
  const prefixed = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefixed));
  return raw ? raw.slice(prefixed.length) : fallback;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function readPositiveNumber(name, fallback) {
  const value = Number(readArg(name, fallback));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} doit être un nombre positif.`);
  }
  return value;
}

const warnLines = readPositiveNumber("--warn-lines", REVIEW_THRESHOLD.lines);
const warnKb = readPositiveNumber("--warn-kb", REVIEW_THRESHOLD.bytes / 1024);
const maxLines = readPositiveNumber("--max-lines", HARD_THRESHOLD.lines);
const maxKb = readPositiveNumber("--max-kb", HARD_THRESHOLD.bytes / 1024);
const topCount = readPositiveNumber("--top", 20);
const enforce = hasFlag("--enforce");
const baselinePath = normalizeRepositoryPath(
  readArg("--baseline", "scripts/checks/heavy-files-baseline.json"),
);
const scanRoots = (readArg("--roots", "apps/web/src") ?? "apps/web/src")
  .split(",")
  .map((value) => normalizeRepositoryPath(value.trim()))
  .filter(Boolean);

const includedExts = new Set([".ts", ".tsx"]);

if (warnLines >= maxLines || warnKb >= maxKb) {
  throw new Error("Les seuils REVIEW_THRESHOLD doivent être inférieurs aux seuils HARD_THRESHOLD.");
}

function collectFiles(view, root) {
  return view.listFiles(root)
    .filter((file) => includedExts.has(path.posix.extname(file)))
    .filter((file) => !/(?:^|\/)(?:\.git|node_modules|\.next|dist|build|coverage|maintenance)(?:\/|$)/.test(file));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value, field, index) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`entrée ${index}: ${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requirePositiveInteger(value, field, index) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`entrée ${index}: ${field} doit être un entier positif.`);
  }
  return value;
}

function loadBaseline(view) {
  if (!view.isFile(baselinePath)) {
    throw new Error(`baseline absente: ${baselinePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(view.readText(baselinePath));
  } catch (error) {
    throw new Error(`baseline JSON invalide (${baselinePath}): ${error.message}`);
  }

  if (!isPlainObject(parsed) || parsed.version !== 1 || !Array.isArray(parsed.allowed)) {
    throw new Error(`baseline malformée (${baselinePath}): version 1 et allowed[] sont requis.`);
  }

  const entries = new Map();
  parsed.allowed.forEach((rawEntry, index) => {
    if (!isPlainObject(rawEntry)) {
      throw new Error(`entrée ${index}: objet requis.`);
    }

    const rawPath = requireNonEmptyString(rawEntry.path, "path", index);
    const file = normalizeRepositoryPath(rawPath);
    if (file !== rawPath || !view.isFile(file)) {
      throw new Error(`entrée ${index}: path absent ou non canonique (${rawPath}).`);
    }
    if (!scanRoots.some((root) => isCoveredByScanRoot(file, root))) {
      throw new Error(`entrée ${index}: path hors des roots scannés (${file}).`);
    }
    if (!ALLOWED_BASELINE_DECISIONS.has(rawEntry.decision)) {
      throw new Error(`entrée ${index}: decision non autorisée (${String(rawEntry.decision)}).`);
    }

    const entry = {
      path: file,
      decision: rawEntry.decision,
      reason: requireNonEmptyString(rawEntry.reason, "reason", index),
      reviewedRef: requireNonEmptyString(rawEntry.reviewedRef, "reviewedRef", index),
      maxLines: requirePositiveInteger(rawEntry.maxLines, "maxLines", index),
      maxBytes: requirePositiveInteger(rawEntry.maxBytes, "maxBytes", index),
    };
    if (entries.has(file)) {
      throw new Error(`entrée ${index}: path dupliqué (${file}).`);
    }
    entries.set(file, entry);
  });

  return entries;
}

function isCoveredByScanRoot(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

function formatThreshold(threshold) {
  return `>${threshold.lines} lignes ou >${threshold.bytes / 1024} KiB`;
}

function main() {
  const ref = parseRepositoryRef(args);
  const view = createRepositoryView({ root: repoRoot, ref });
  const files = [...new Set(scanRoots.flatMap((root) => collectFiles(view, root)))];
  const rows = files.map((file) => {
    const content = view.readBinary(file);
    return {
      file,
      lines: content.toString("utf8").split(/\r?\n/).length,
      bytes: content.length,
    };
  });

  rows.sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);
  const reviewThreshold = { lines: warnLines, bytes: Math.round(warnKb * 1024) };
  const hardThreshold = { lines: maxLines, bytes: Math.round(maxKb * 1024) };
  const baseline = loadBaseline(view);
  const hardOffenders = rows.filter((row) => isAboveThreshold(row, hardThreshold));
  const reviewWarnings = rows.filter((row) => isAboveThreshold(row, reviewThreshold));
  const hardOffenderPaths = new Set(hardOffenders.map((row) => row.file));
  const newHardOffenders = hardOffenders.filter((row) => !baseline.has(row.file));
  const ratchetViolations = hardOffenders.filter((row) => {
    const exception = baseline.get(row.file);
    return exception && (row.lines > exception.maxLines || row.bytes > exception.maxBytes);
  });
  const staleBaselineEntries = [...baseline.values()].filter(
    (entry) => !hardOffenderPaths.has(entry.path),
  );

  console.log(
    `Top heavy files (${scanRoots.join(", ")}): REVIEW ${formatThreshold(reviewThreshold)}; HARD ${formatThreshold(hardThreshold)}`,
  );
  for (const row of rows.slice(0, Math.max(1, Math.floor(topCount)))) {
    const reviewFlag = isAboveThreshold(row, reviewThreshold) ? "!" : " ";
    const hardFlag = isAboveThreshold(row, hardThreshold) ? "!" : " ";
    const kb = (row.bytes / 1024).toFixed(1);
    console.log(` ${reviewFlag}${hardFlag} ${row.lines.toString().padStart(5, " ")} lignes | ${kb.padStart(6, " ")} KB | ${row.file}`);
  }

  if (reviewWarnings.length > 0) {
    console.log(`\nREVIEW_REQUIRED: ${reviewWarnings.length} fichier(s) dépassent le seuil d'audit; aucun split automatique.`);
  }
  if (newHardOffenders.length > 0) {
    console.log(`Nouveaux dépassements HARD hors baseline (${newHardOffenders.length}):`);
    for (const row of newHardOffenders) console.log(` - ${row.file} (${row.lines} lignes, ${(row.bytes / 1024).toFixed(1)} KB)`);
  }
  if (ratchetViolations.length > 0) {
    console.log(`Dépassements des plafonds ratifiés (${ratchetViolations.length}):`);
    for (const row of ratchetViolations) {
      const exception = baseline.get(row.file);
      console.log(` - ${row.file} (${row.lines} lignes/${row.bytes} octets; plafond ${exception.maxLines} lignes/${exception.maxBytes} octets)`);
    }
  }
  if (staleBaselineEntries.length > 0) {
    console.log(`Entrées baseline stale à retirer (${staleBaselineEntries.length}):`);
    for (const entry of staleBaselineEntries) console.log(` - ${entry.path}`);
  }

  const blockingFindings = [
    ...(newHardOffenders.length > 0 ? ["nouveau dépassement HARD"] : []),
    ...(ratchetViolations.length > 0 ? ["croissance au-delà d'un plafond ratifié"] : []),
    ...(staleBaselineEntries.length > 0 ? ["baseline stale"] : []),
  ];
  if (enforce && blockingFindings.length > 0) {
    console.error(`FAIL --enforce: ${blockingFindings.join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS: ${hardOffenders.length} fichier(s) HARD, ${reviewWarnings.length} fichier(s) REVIEW_REQUIRED; warnings non bloquants.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[top-heavy] BASELINE_INVALID: ${error.message}`);
  process.exitCode = 1;
}
