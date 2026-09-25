#!/usr/bin/env node
/**
 * Rapport informatif des fichiers volumineux.
 * Les seuils, la mesure et la classification KIND sont partagés avec le
 * checker qualité.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRepositoryView,
  parseRepositoryRef,
} from "../checks/repository-view.mjs";
import { loadHeavyFilesBaseline } from "../checks/top-heavy-baseline.mjs";
import {
  HEAVY_FILE_EXTENSIONS,
  classifyFileKind,
  isRegenerableGeneratedFile,
  measureContent,
  collectMeasuredRows,
} from "../checks/top-heavy-measurement.mjs";
import {
  FILE_KIND_POLICY,
  isAboveHard,
  isAboveReview,
  isExcludedGeneratedRow,
} from "../checks/top-heavy-policy.mjs";

const SCAN_ROOTS = ["apps/web/src"];
const BASELINE_PATH = "scripts/checks/heavy-files-baseline.json";

export function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath);
    const measurement = measureContent(content);
    const text = content.toString("utf8");
    const kind = classifyFileKind(filePath);

    return {
      path: filePath,
      exists: true,
      size: measurement.bytes,
      bytes: measurement.bytes,
      lines: measurement.lines,
      kind,
      generated: isRegenerableGeneratedFile(filePath, content),
      imports: (text.match(/^import /gm) || []).length,
      exports: (text.match(/^export /gm) || []).length,
    };
  } catch {
    return { exists: false };
  }
}

export function scanDirectory(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      scanDirectory(fullPath, results);
    } else if (
      entry.isFile() &&
      HEAVY_FILE_EXTENSIONS.has(`.${entry.name.split(".").pop()}`.toLowerCase())
    ) {
      const analysis = analyzeFile(fullPath);
      if (isAboveReview(analysis)) results.push(analysis);
    }
  }

  return results;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function formatRow(row) {
  const generatedLabel = isExcludedGeneratedRow(row) ? ", généré/régénérable" : "";
  return `- ${row.file ?? row.path} [${row.kind}${generatedLabel}] — ${row.lines} lignes / ${formatBytes(row.bytes)}`;
}

function formatPolicy() {
  return Object.entries(FILE_KIND_POLICY)
    .map(([kind, policy]) => policy.review === null
      ? `- ${kind}: résumé informatif; exclusion seulement si provenance régénérable prouvée`
      : `- ${kind}: REVIEW >${policy.review.lines} lignes ou >${policy.review.bytes / 1024} KiB ; HARD >${policy.hard.lines} lignes ou >${policy.hard.bytes / 1024} KiB`)
    .join("\n");
}

export function getRadarGroups(rows) {
  return {
    architectural: rows
      .filter((row) => !isExcludedGeneratedRow(row) && row.kind !== "test" && isAboveReview(row))
      .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes),
    tests: rows
      .filter((row) => row.kind === "test" && isAboveReview(row))
      .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes),
    generated: rows
      .filter((row) => row.kind === "generated")
      .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes),
  };
}

function getRatchetFindings(rows, baseline) {
  if (baseline instanceof Error) return [`INVALID: ${baseline.message}`];

  const { allowed, review } = baseline;
  const checkedRows = rows.filter((row) => !isExcludedGeneratedRow(row));
  const hardRows = checkedRows.filter(isAboveHard);
  const hardPaths = new Set(hardRows.map((row) => row.file));
  const findings = [];
  for (const row of hardRows) {
    const exception = allowed.get(row.file);
    if (!exception) {
      findings.push(`NEW_HARD ${formatRow(row)}`);
    } else if (row.lines > exception.maxLines || row.bytes > exception.maxBytes) {
      findings.push(`GROWTH ${formatRow(row)} — plafond ${exception.maxLines} lignes / ${formatBytes(exception.maxBytes)}`);
    }
  }
  for (const entry of allowed.values()) {
    if (!hardPaths.has(entry.path)) findings.push(`STALE ${entry.path}`);
  }
  const reviewRows = checkedRows.filter(isAboveReview);
  const reviewPaths = new Set(reviewRows.map((row) => row.file));
  for (const row of reviewRows) {
    const entry = review.get(row.file);
    if (!entry && !allowed.has(row.file)) findings.push(`NEW_REVIEW ${formatRow(row)}`);
    if (entry && (row.lines > entry.maxLines || row.bytes > entry.maxBytes)) {
      findings.push(`REVIEW_GROWTH ${formatRow(row)} — plafond ${entry.maxLines} lignes / ${formatBytes(entry.maxBytes)}`);
    }
  }
  for (const entry of review.values()) {
    const row = rows.find((candidate) => candidate.file === entry.path);
    if (!reviewPaths.has(entry.path) && entry.status === "REVIEW") findings.push(`STALE_REVIEW ${entry.path}`);
    if (!row) findings.push(`MISSING_REVIEW ${entry.path}`);
  }
  return findings;
}

export function analyzeRepository({ root = process.cwd(), ref = null } = {}) {
  const view = createRepositoryView({ root, ref });
  const rows = collectMeasuredRows(view, SCAN_ROOTS);
  let baseline;
  try {
    baseline = loadHeavyFilesBaseline(view, BASELINE_PATH, SCAN_ROOTS);
  } catch (error) {
    baseline = error;
  }
  const groups = getRadarGroups(rows);
  return {
    rows,
    ...groups,
    reviewRows: [...groups.architectural, ...groups.tests],
    hardRows: rows.filter(isAboveHard),
    baselineFindings: getRatchetFindings(rows, baseline),
    ref: ref ?? "WORKTREE",
  };
}

export function main(args = process.argv.slice(2)) {
  const ref = parseRepositoryRef(args);
  const report = analyzeRepository({ ref });

  console.log(`Top-heavy informative report — REF=${report.ref}`);
  console.log("Politique par KIND:");
  console.log(formatPolicy());
  console.log("\nRADAR ARCHITECTURAL (runtime + data/config)");
  console.log(report.architectural.length === 0 ? "- none" : report.architectural.map(formatRow).join("\n"));
  console.log("\nTESTS VOLUMINEUX (signal de lisibilité/cohésion)");
  console.log(report.tests.length === 0 ? "- none" : report.tests.map(formatRow).join("\n"));
  console.log("\nGENERATED (résumé informatif; exclusion seulement si régénérabilité prouvée)");
  console.log(report.generated.length === 0 ? "- none" : report.generated.map(formatRow).join("\n"));
  console.log("\nBASELINE_RATCHET");
  console.log(report.baselineFindings.length === 0 ? "- PASS: no finding" : report.baselineFindings.map((finding) => `- ${finding}`).join("\n"));
  console.log("\nCycles, complexity, dead-code, duplication et coverage restent des corrélations séparées; aucun score numérique ni décision architecturale n'est produit par ce rapport.");
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) main();
