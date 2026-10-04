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
import path from "node:path";
import { pathToFileURL } from "node:url";

function readArg(args, name, fallback) {
  const prefixed = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefixed));
  return raw ? raw.slice(prefixed.length) : fallback;
}

function hasFlag(args, flag) {
  return args.includes(flag);
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

function proximityScore(row) {
  const policy = FILE_KIND_POLICY[row.kind] ?? FILE_KIND_POLICY.runtime;
  if (isExcludedGeneratedRow(row) || !policy.review) return null;
  return Math.max(row.lines / policy.review.lines, row.bytes / policy.review.bytes);
}

function createProximityRows(rows, limit) {
  return rows
    .map((row) => ({
      ...row,
      review: isAboveReview(row) ? (isAboveHard(row) ? "HARD" : "REVIEW") : "NONE",
      proximity: proximityScore(row),
    }))
    .filter((row) => row.proximity !== null)
    .sort((left, right) => right.proximity - left.proximity || right.lines - left.lines || left.file.localeCompare(right.file))
    .slice(0, limit);
}

function evaluatePolicy({ rows, baseline }) {
  const { allowed: allowedBaseline, review: reviewBaseline } = baseline;
  const generatedRows = rows.filter((row) => row.kind === "generated");
  const checkedRows = rows.filter((row) => !isExcludedGeneratedRow(row));
  const hardOffenders = checkedRows.filter(isAboveHard);
  const reviewWarnings = checkedRows.filter(isAboveReview);
  const hardOffenderPaths = new Set(hardOffenders.map((row) => row.file));
  const newHardOffenders = hardOffenders.filter((row) => !allowedBaseline.has(row.file));
  const ratchetViolations = hardOffenders.filter((row) => {
    const exception = allowedBaseline.get(row.file);
    return exception && (row.lines > exception.maxLines || row.bytes > exception.maxBytes);
  });
  const staleBaselineEntries = [...allowedBaseline.values()].filter((entry) => !hardOffenderPaths.has(entry.path));
  const newReviewOffenders = reviewWarnings.filter((row) => !reviewBaseline.has(row.file) && !allowedBaseline.has(row.file));
  const reviewRatchetViolations = reviewWarnings.filter((row) => {
    const entry = reviewBaseline.get(row.file);
    return entry && (row.lines > entry.maxLines || row.bytes > entry.maxBytes);
  });
  const improvedReviewRegressions = reviewWarnings.filter((row) => reviewBaseline.get(row.file)?.status === "IMPROVED");
  const reviewImprovements = [...reviewBaseline.values()].filter((entry) => {
    const row = rows.find((candidate) => candidate.file === entry.path);
    return row && !isAboveReview(row) && entry.status === "REVIEW";
  });
  const acquiredReviewImprovements = [...reviewBaseline.values()].filter((entry) => {
    const row = rows.find((candidate) => candidate.file === entry.path);
    return row && !isAboveReview(row) && entry.status === "IMPROVED";
  });
  const staleReviewBaselineEntries = [...reviewBaseline.values()].filter((entry) => !rows.some((row) => row.file === entry.path));
  const blockingFindings = [
    ...(newHardOffenders.length > 0 ? ["nouveau dépassement HARD"] : []),
    ...(ratchetViolations.length > 0 ? ["croissance au-delà d'un plafond ratifié"] : []),
    ...(newReviewOffenders.length > 0 ? ["nouveau dépassement REVIEW"] : []),
    ...(reviewRatchetViolations.length > 0 ? ["croissance au-delà du plafond REVIEW ratifié"] : []),
    ...(improvedReviewRegressions.length > 0 ? ["retour au-dessus du seuil REVIEW après amélioration"] : []),
    ...(staleBaselineEntries.length > 0 ? ["baseline stale"] : []),
    ...(staleReviewBaselineEntries.length > 0 ? ["baseline REVIEW stale"] : []),
  ];

  return {
    generatedRows,
    hardOffenders,
    reviewWarnings,
    newHardOffenders,
    ratchetViolations,
    staleBaselineEntries,
    newReviewOffenders,
    reviewRatchetViolations,
    improvedReviewRegressions,
    reviewImprovements,
    acquiredReviewImprovements,
    staleReviewBaselineEntries,
    blockingFindings,
  };
}

export function runTopHeavyPolicy({ root = process.cwd(), args = [] } = {}) {
  const topCount = Number(readArg(args, "--top", 20));
  if (!Number.isFinite(topCount) || topCount <= 0) throw new Error("--top doit être un nombre positif.");
  const enforce = hasFlag(args, "--enforce");
  const baselinePath = normalizeRepositoryPath(readArg(args, "--baseline", "scripts/checks/heavy-files-baseline.json"));
  const scanRoots = (readArg(args, "--roots", "apps/web/src,apps/mobile") ?? "apps/web/src,apps/mobile")
    .split(",").map((value) => normalizeRepositoryPath(value.trim())).filter(Boolean);
  const ref = parseRepositoryRef(args);
  const view = createRepositoryView({ root, ref });
  const rows = collectMeasuredRows(view, scanRoots).sort((a, b) => b.lines - a.lines || b.bytes - a.bytes || a.file.localeCompare(b.file));
  const baseline = loadHeavyFilesBaseline(view, baselinePath, scanRoots);
  const evaluation = evaluatePolicy({ rows, baseline });
  return {
    ref: ref ?? "WORKTREE",
    scanRoots,
    topCount,
    enforce,
    status: enforce && evaluation.blockingFindings.length > 0 ? "FAIL" : "PASS",
    rows,
    topRows: rows.slice(0, Math.max(1, Math.floor(topCount))),
    proximityRows: createProximityRows(rows, 20),
    baseline: {
      state: "VALID",
      allowed: [...baseline.allowed.values()],
      review: [...baseline.review.values()],
      path: baselinePath,
    },
    evaluation,
  };
}

function printReport(report) {
  const { evaluation } = report;
  console.log(`Top heavy files (${report.scanRoots.join(", ")}): politique par KIND`);
  console.log(formatPolicy());
  for (const row of report.topRows) {
    const reviewFlag = isAboveReview(row) ? "!" : " ";
    const hardFlag = isAboveHard(row) ? "!" : " ";
    const kb = (row.bytes / 1024).toFixed(1);
    console.log(` ${reviewFlag}${hardFlag} ${row.lines.toString().padStart(5, " ")} lignes | ${kb.padStart(6, " ")} KB | ${row.kind.padEnd(10, " ")} | ${row.file}`);
  }
  if (evaluation.generatedRows.length > 0) {
    console.log(`\nGenerated: ${evaluation.generatedRows.length} fichier(s) classé(s) generated; ${evaluation.generatedRows.filter(isExcludedGeneratedRow).length} exclu(s) du radar architectural après preuve de régénérabilité.`);
    for (const row of evaluation.generatedRows) console.log(` - ${formatRow(row)}`);
  }
  if (evaluation.reviewWarnings.length > 0) console.log(`\nREVIEW_REQUIRED: ${evaluation.reviewWarnings.length} fichier(s) dépassent leur seuil KIND; aucun split automatique.`);
  const sections = [
    ["Nouveaux dépassements REVIEW hors baseline", evaluation.newReviewOffenders],
    ["Dépassements des plafonds REVIEW ratifiés", evaluation.reviewRatchetViolations],
    ["Retours au-dessus du seuil REVIEW après amélioration", evaluation.improvedReviewRegressions],
    ["Améliorations REVIEW détectées; mise à jour explicite de la baseline possible", evaluation.reviewImprovements],
    ["Améliorations REVIEW acquises", evaluation.acquiredReviewImprovements],
    ["Nouveaux dépassements HARD hors baseline", evaluation.newHardOffenders],
    ["Dépassements des plafonds ratifiés", evaluation.ratchetViolations],
    ["Entrées baseline stale à retirer", evaluation.staleBaselineEntries],
    ["Entrées baseline REVIEW stale à retirer", evaluation.staleReviewBaselineEntries],
  ];
  for (const [label, entries] of sections) {
    if (entries.length === 0) continue;
    console.log(`${label} (${entries.length}):`);
    for (const entry of entries) console.log(` - ${entry.file ? formatRow(entry) : entry.path}`);
  }
  if (report.enforce && evaluation.blockingFindings.length > 0) {
    console.error(`FAIL --enforce: ${evaluation.blockingFindings.join(", ")}.`);
    return;
  }
  console.log(`PASS: ${evaluation.hardOffenders.length} fichier(s) HARD, ${evaluation.reviewWarnings.length} fichier(s) REVIEW_REQUIRED; ratchets KIND HARD/REVIEW respectés.`);
}

function main(args = process.argv.slice(2)) {
  try {
    const report = runTopHeavyPolicy({ args });
    printReport(report);
    if (report.status === "FAIL") process.exitCode = 1;
  } catch (error) {
    console.error(`[top-heavy] BASELINE_INVALID: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
