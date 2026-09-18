#!/usr/bin/env node

import {
  createRepositoryView,
  normalizeRepositoryPath,
  parseRepositoryRef,
} from "./repository-view.mjs";
import { loadHeavyFilesBaseline } from "./top-heavy-baseline.mjs";
import { collectMeasuredRows } from "./top-heavy-measurement.mjs";
import {
  HARD_THRESHOLD,
  REVIEW_THRESHOLD,
  isAboveThreshold,
} from "./top-heavy-policy.mjs";

const repoRoot = process.cwd();
const args = process.argv.slice(2);

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

if (warnLines >= maxLines || warnKb >= maxKb) {
  throw new Error("Les seuils REVIEW_THRESHOLD doivent être inférieurs aux seuils HARD_THRESHOLD.");
}

function formatThreshold(threshold) {
  return `>${threshold.lines} lignes ou >${threshold.bytes / 1024} KiB`;
}

function main() {
  const ref = parseRepositoryRef(args);
  const view = createRepositoryView({ root: repoRoot, ref });
  const rows = collectMeasuredRows(view, scanRoots);
  rows.sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);

  const reviewThreshold = { lines: warnLines, bytes: Math.round(warnKb * 1024) };
  const hardThreshold = { lines: maxLines, bytes: Math.round(maxKb * 1024) };
  const { allowed: allowedBaseline, review: reviewBaseline } = loadHeavyFilesBaseline(
    view,
    baselinePath,
    scanRoots,
  );
  const hardOffenders = rows.filter((row) => isAboveThreshold(row, hardThreshold));
  const reviewWarnings = rows.filter((row) => isAboveThreshold(row, reviewThreshold));
  const hardOffenderPaths = new Set(hardOffenders.map((row) => row.file));
  const newHardOffenders = hardOffenders.filter((row) => !allowedBaseline.has(row.file));
  const ratchetViolations = hardOffenders.filter((row) => {
    const exception = allowedBaseline.get(row.file);
    return exception && (row.lines > exception.maxLines || row.bytes > exception.maxBytes);
  });
  const staleBaselineEntries = [...allowedBaseline.values()].filter(
    (entry) => !hardOffenderPaths.has(entry.path),
  );
  const newReviewOffenders = reviewWarnings.filter(
    (row) => !reviewBaseline.has(row.file) && !allowedBaseline.has(row.file),
  );
  const reviewRatchetViolations = reviewWarnings.filter((row) => {
    const entry = reviewBaseline.get(row.file);
    return entry && (row.lines > entry.maxLines || row.bytes > entry.maxBytes);
  });
  const improvedReviewRegressions = reviewWarnings.filter((row) => {
    const entry = reviewBaseline.get(row.file);
    return entry?.status === "IMPROVED";
  });
  const reviewImprovements = [...reviewBaseline.values()].filter((entry) => {
    const row = rows.find((candidate) => candidate.file === entry.path);
    return row && !isAboveThreshold(row, reviewThreshold) && entry.status === "REVIEW";
  });
  const acquiredReviewImprovements = [...reviewBaseline.values()].filter((entry) => {
    const row = rows.find((candidate) => candidate.file === entry.path);
    return row && !isAboveThreshold(row, reviewThreshold) && entry.status === "IMPROVED";
  });
  const staleReviewBaselineEntries = [...reviewBaseline.values()].filter(
    (entry) => !rows.some((row) => row.file === entry.path),
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
  if (newReviewOffenders.length > 0) {
    console.log(`Nouveaux dépassements REVIEW hors baseline (${newReviewOffenders.length}):`);
    for (const row of newReviewOffenders) console.log(` - ${row.file} (${row.lines} lignes, ${(row.bytes / 1024).toFixed(1)} KB)`);
  }
  if (reviewRatchetViolations.length > 0) {
    console.log(`Dépassements des plafonds REVIEW ratifiés (${reviewRatchetViolations.length}):`);
    for (const row of reviewRatchetViolations) {
      const entry = reviewBaseline.get(row.file);
      console.log(` - ${row.file} (${row.lines} lignes/${row.bytes} octets; plafond ${entry.maxLines} lignes/${entry.maxBytes} octets)`);
    }
  }
  if (improvedReviewRegressions.length > 0) {
    console.log(`Retours au-dessus du seuil REVIEW après amélioration (${improvedReviewRegressions.length}):`);
    for (const row of improvedReviewRegressions) console.log(` - ${row.file} (${row.lines} lignes, ${(row.bytes / 1024).toFixed(1)} KB)`);
  }
  if (reviewImprovements.length > 0) {
    console.log(`Améliorations REVIEW détectées; mise à jour explicite de la baseline possible (${reviewImprovements.length}):`);
    for (const entry of reviewImprovements) console.log(` - ${entry.path}`);
  }
  if (acquiredReviewImprovements.length > 0) {
    console.log(`Améliorations REVIEW acquises (${acquiredReviewImprovements.length}):`);
    for (const entry of acquiredReviewImprovements) console.log(` - ${entry.path}`);
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
  if (staleReviewBaselineEntries.length > 0) {
    console.log(`Entrées baseline REVIEW stale à retirer (${staleReviewBaselineEntries.length}):`);
    for (const entry of staleReviewBaselineEntries) console.log(` - ${entry.path}`);
  }

  const blockingFindings = [
    ...(newHardOffenders.length > 0 ? ["nouveau dépassement HARD"] : []),
    ...(ratchetViolations.length > 0 ? ["croissance au-delà d'un plafond ratifié"] : []),
    ...(newReviewOffenders.length > 0 ? ["nouveau dépassement REVIEW"] : []),
    ...(reviewRatchetViolations.length > 0 ? ["croissance au-delà d'un plafond REVIEW ratifié"] : []),
    ...(improvedReviewRegressions.length > 0 ? ["retour au-dessus du seuil REVIEW après amélioration"] : []),
    ...(staleBaselineEntries.length > 0 ? ["baseline stale"] : []),
    ...(staleReviewBaselineEntries.length > 0 ? ["baseline REVIEW stale"] : []),
  ];
  if (enforce && blockingFindings.length > 0) {
    console.error(`FAIL --enforce: ${blockingFindings.join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS: ${hardOffenders.length} fichier(s) HARD, ${reviewWarnings.length} fichier(s) REVIEW_REQUIRED; ratchets HARD/REVIEW respectés.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[top-heavy] BASELINE_INVALID: ${error.message}`);
  process.exitCode = 1;
}
