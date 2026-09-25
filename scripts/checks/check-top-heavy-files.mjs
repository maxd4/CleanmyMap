#!/usr/bin/env node

import {
  createRepositoryView,
  normalizeRepositoryPath,
  parseRepositoryRef,
} from "./repository-view.mjs";
import { loadHeavyFilesBaseline } from "./top-heavy-baseline.mjs";
import { collectMeasuredRows } from "./top-heavy-measurement.mjs";
import {
  FILE_KIND_POLICY,
  isAboveHard,
  isAboveReview,
  isExcludedGeneratedRow,
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

const topCount = Number(readArg("--top", 20));
const enforce = hasFlag("--enforce");
const baselinePath = normalizeRepositoryPath(
  readArg("--baseline", "scripts/checks/heavy-files-baseline.json"),
);
const scanRoots = (readArg("--roots", "apps/web/src") ?? "apps/web/src")
  .split(",")
  .map((value) => normalizeRepositoryPath(value.trim()))
  .filter(Boolean);

if (!Number.isFinite(topCount) || topCount <= 0) {
  throw new Error("--top doit être un nombre positif.");
}

function formatThreshold(threshold) {
  return `>${threshold.lines} lignes ou >${threshold.bytes / 1024} KiB`;
}

function formatRow(row) {
  const generatedLabel = isExcludedGeneratedRow(row) ? ", généré/régénérable" : "";
  return `${row.file} [${row.kind}${generatedLabel}] (${row.lines} lignes, ${(row.bytes / 1024).toFixed(1)} KB)`;
}

function formatPolicy() {
  return Object.entries(FILE_KIND_POLICY)
    .map(([kind, policy]) => {
      const generatedNote = kind === "generated" ? "informatif; exclusion seulement si provenance régénérable prouvée" : `REVIEW ${formatThreshold(policy.review)}, HARD ${formatThreshold(policy.hard)}`;
      return `${kind}: ${generatedNote}`;
    })
    .join(" | ");
}

function main() {
  const ref = parseRepositoryRef(args);
  const view = createRepositoryView({ root: repoRoot, ref });
  const rows = collectMeasuredRows(view, scanRoots);
  rows.sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);

  const { allowed: allowedBaseline, review: reviewBaseline } = loadHeavyFilesBaseline(
    view,
    baselinePath,
    scanRoots,
  );
  const generatedRows = rows.filter((row) => row.kind === "generated");
  const hardOffenders = rows.filter(isAboveHard);
  const reviewWarnings = rows.filter(isAboveReview);
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
    return row && !isAboveReview(row) && entry.status === "REVIEW";
  });
  const acquiredReviewImprovements = [...reviewBaseline.values()].filter((entry) => {
    const row = rows.find((candidate) => candidate.file === entry.path);
    return row && !isAboveReview(row) && entry.status === "IMPROVED";
  });
  const staleReviewBaselineEntries = [...reviewBaseline.values()].filter(
    (entry) => !rows.some((row) => row.file === entry.path),
  );

  console.log(`Top heavy files (${scanRoots.join(", ")}): politique par KIND`);
  console.log(formatPolicy());
  for (const row of rows.slice(0, Math.max(1, Math.floor(topCount)))) {
    const reviewFlag = isAboveReview(row) ? "!" : " ";
    const hardFlag = isAboveHard(row) ? "!" : " ";
    const kb = (row.bytes / 1024).toFixed(1);
    console.log(` ${reviewFlag}${hardFlag} ${row.lines.toString().padStart(5, " ")} lignes | ${kb.padStart(6, " ")} KB | ${row.kind.padEnd(10, " ")} | ${row.file}`);
  }

  if (generatedRows.length > 0) {
    console.log(`\nGenerated: ${generatedRows.length} fichier(s) classé(s) generated; ${generatedRows.filter(isExcludedGeneratedRow).length} exclu(s) du radar architectural après preuve de régénérabilité.`);
    for (const row of generatedRows) console.log(` - ${formatRow(row)}`);
  }
  if (reviewWarnings.length > 0) {
    console.log(`\nREVIEW_REQUIRED: ${reviewWarnings.length} fichier(s) dépassent leur seuil KIND; aucun split automatique.`);
  }
  if (newReviewOffenders.length > 0) {
    console.log(`Nouveaux dépassements REVIEW hors baseline (${newReviewOffenders.length}):`);
    for (const row of newReviewOffenders) console.log(` - ${formatRow(row)}`);
  }
  if (reviewRatchetViolations.length > 0) {
    console.log(`Dépassements des plafonds REVIEW ratifiés (${reviewRatchetViolations.length}):`);
    for (const row of reviewRatchetViolations) {
      const entry = reviewBaseline.get(row.file);
      console.log(` - ${formatRow(row)}; plafond ${entry.maxLines} lignes/${entry.maxBytes} octets`);
    }
  }
  if (improvedReviewRegressions.length > 0) {
    console.log(`Retours au-dessus du seuil REVIEW après amélioration (${improvedReviewRegressions.length}):`);
    for (const row of improvedReviewRegressions) console.log(` - ${formatRow(row)}`);
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
    for (const row of newHardOffenders) console.log(` - ${formatRow(row)}`);
  }
  if (ratchetViolations.length > 0) {
    console.log(`Dépassements des plafonds ratifiés (${ratchetViolations.length}):`);
    for (const row of ratchetViolations) {
      const exception = allowedBaseline.get(row.file);
      console.log(` - ${formatRow(row)}; plafond ${exception.maxLines} lignes/${exception.maxBytes} octets`);
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
    ...(reviewRatchetViolations.length > 0 ? ["croissance au-delà du plafond REVIEW ratifié"] : []),
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
    `PASS: ${hardOffenders.length} fichier(s) HARD, ${reviewWarnings.length} fichier(s) REVIEW_REQUIRED; ratchets KIND HARD/REVIEW respectés.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[top-heavy] BASELINE_INVALID: ${error.message}`);
  process.exitCode = 1;
}
