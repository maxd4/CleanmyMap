#!/usr/bin/env node
/**
 * Rapport informatif des fichiers volumineux.
 * Les seuils et la mesure sont partagés avec le checker qualité.
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
  measureContent,
  collectMeasuredRows,
} from "../checks/top-heavy-measurement.mjs";
import {
  HARD_THRESHOLD,
  REVIEW_THRESHOLD,
  isAboveThreshold,
} from "../checks/top-heavy-policy.mjs";

const SCAN_ROOTS = ["apps/web/src"];
const BASELINE_PATH = "scripts/checks/heavy-files-baseline.json";

export function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath);
    const measurement = measureContent(content);
    const text = content.toString("utf8");

    return {
      path: filePath,
      exists: true,
      size: measurement.bytes,
      bytes: measurement.bytes,
      lines: measurement.lines,
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
      if (isAboveThreshold(analysis, REVIEW_THRESHOLD)) {
        results.push(analysis);
      }
    }
  }

  return results;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function formatRow(row) {
  return `- ${row.file} [${classifyFileKind(row.file)}] — ${row.lines} lignes / ${formatBytes(row.bytes)}`;
}

function getRatchetFindings(rows, baseline) {
  if (baseline instanceof Error) return [`INVALID: ${baseline.message}`];

  const hardRows = rows.filter((row) => isAboveThreshold(row, HARD_THRESHOLD));
  const hardPaths = new Set(hardRows.map((row) => row.file));
  const findings = [];
  for (const row of hardRows) {
    const exception = baseline.get(row.file);
    if (!exception) {
      findings.push(`NEW_HARD ${formatRow(row)}`);
    } else if (row.lines > exception.maxLines || row.bytes > exception.maxBytes) {
      findings.push(`GROWTH ${formatRow(row)} — plafond ${exception.maxLines} lignes / ${formatBytes(exception.maxBytes)}`);
    }
  }
  for (const entry of baseline.values()) {
    if (!hardPaths.has(entry.path)) findings.push(`STALE ${entry.path}`);
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
  return {
    rows,
    reviewRows: rows.filter((row) => isAboveThreshold(row, REVIEW_THRESHOLD) && !isAboveThreshold(row, HARD_THRESHOLD)),
    hardRows: rows.filter((row) => isAboveThreshold(row, HARD_THRESHOLD)),
    baselineFindings: getRatchetFindings(rows, baseline),
    ref: ref ?? "WORKTREE",
  };
}

export function main(args = process.argv.slice(2)) {
  const ref = parseRepositoryRef(args);
  const report = analyzeRepository({ ref });
  const sortedReview = [...report.reviewRows].sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);
  const sortedHard = [...report.hardRows].sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);

  console.log(`Top-heavy informative report — REF=${report.ref}`);
  console.log(`Policy: REVIEW >${REVIEW_THRESHOLD.lines} lines or >${REVIEW_THRESHOLD.bytes / 1024} KiB; HARD_LIMIT >${HARD_THRESHOLD.lines} lines or >${HARD_THRESHOLD.bytes / 1024} KiB`);
  console.log("\nREVIEW");
  console.log(sortedReview.length === 0 ? "- none" : sortedReview.map(formatRow).join("\n"));
  console.log("\nHARD_LIMIT");
  console.log(sortedHard.length === 0 ? "- none" : sortedHard.map(formatRow).join("\n"));
  console.log("\nBASELINE_RATCHET");
  console.log(report.baselineFindings.length === 0 ? "- PASS: no finding" : report.baselineFindings.map((finding) => `- ${finding}`).join("\n"));
  console.log("\nNo architectural decision or automatic split is produced by this report.");
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) main();
