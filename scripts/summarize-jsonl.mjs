#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.join(os.homedir(), ".codex");

function parseArgs(argv) {
  const options = {
    root: DEFAULT_ROOT,
    format: "markdown",
    includeEmpty: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--root" && next) {
      options.root = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--format" && next) {
      options.format = next;
      index += 1;
      continue;
    }

    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--include-empty") {
      options.includeEmpty = true;
    }
  }

  return options;
}

function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function safeIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "n/a";
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m${String(remainder).padStart(2, "0")}s`;
}

function collectSignals(value, signals) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSignals(item, signals);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "timestamp" && typeof child === "string") {
      const iso = safeIso(child);
      if (iso) {
        signals.timestamps.push(iso);
      }
    }

    if (key === "model" && typeof child === "string") {
      signals.models.add(child);
    }

    if (typeof child === "string") {
      const loweredKey = key.toLowerCase();
      const loweredValue = child.toLowerCase();
      if (loweredKey.includes("token") || loweredKey.includes("usage")) {
        signals.tokenEvents += 1;
      } else if (loweredValue.includes("token") || loweredValue.includes("usage")) {
        signals.tokenEvents += 1;
      }
    }

    collectSignals(child, signals);
  }
}

function summarizeFile(filePath) {
  const summary = {
    path: filePath,
    lineCount: 0,
    validJsonLines: 0,
    invalidJsonLines: 0,
    timestamps: [],
    models: new Set(),
    tokenEvents: 0,
  };

  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const lines = raw.split(/\r?\n/);
  summary.lineCount = lines.length;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(line);
      summary.validJsonLines += 1;
    } catch {
      summary.invalidJsonLines += 1;
      continue;
    }

    collectSignals(parsed, summary);
  }

  if (summary.timestamps.length >= 2) {
    summary.timestamps.sort();
  }

  return summary;
}

function finalizeSummary(summary) {
  const start = summary.timestamps.length > 0 ? summary.timestamps[0] : null;
  const end = summary.timestamps.length > 0 ? summary.timestamps[summary.timestamps.length - 1] : null;
  const durationSeconds =
    summary.timestamps.length >= 2
      ? Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000)
      : null;

  return {
    path: summary.path,
    lineCount: summary.lineCount,
    validJsonLines: summary.validJsonLines,
    invalidJsonLines: summary.invalidJsonLines,
    start,
    end,
    durationSeconds,
    models: Array.from(summary.models).sort(),
    tokenEvents: summary.tokenEvents,
  };
}

export function escapeCell(value) {
  return String(value ?? "n/a")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/`/g, "\\`")
    .replace(/\r?\n/g, " ");
}

export function table(headers, rows) {
  const head = `| ${headers.map(escapeCell).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

function buildReport(fileSummaries, rootDir, includeEmpty = false) {
  const totals = {
    scannedFiles: fileSummaries.length,
    filesWithActivity: 0,
    filesWithTimestamps: 0,
    totalLines: 0,
    totalValidJsonLines: 0,
    totalInvalidJsonLines: 0,
    totalTokenEvents: 0,
    models: new Set(),
    timestamps: [],
  };

  const rows = [];
  for (const summary of fileSummaries) {
    const finalized = finalizeSummary(summary);
    const hasActivity =
      finalized.start || finalized.end || finalized.models.length > 0 || finalized.tokenEvents > 0;
    if (!hasActivity && !includeEmpty) {
      continue;
    }

    totals.filesWithActivity += 1;
    if (finalized.start || finalized.end) {
      totals.filesWithTimestamps += 1;
    }
    totals.totalLines += finalized.lineCount;
    totals.totalValidJsonLines += finalized.validJsonLines;
    totals.totalInvalidJsonLines += finalized.invalidJsonLines;
    totals.totalTokenEvents += finalized.tokenEvents;
    for (const model of finalized.models) {
      totals.models.add(model);
    }
    if (finalized.start) {
      totals.timestamps.push(finalized.start);
    }
    if (finalized.end) {
      totals.timestamps.push(finalized.end);
    }

    rows.push(finalized);
  }

  rows.sort((a, b) => {
    const aEnd = a.end ? Date.parse(a.end) : 0;
    const bEnd = b.end ? Date.parse(b.end) : 0;
    if (aEnd !== bEnd) {
      return bEnd - aEnd;
    }
    return a.path.localeCompare(b.path);
  });

  const earliest = totals.timestamps.length > 0 ? new Date(Math.min(...totals.timestamps.map(Date.parse))).toISOString() : null;
  const latest = totals.timestamps.length > 0 ? new Date(Math.max(...totals.timestamps.map(Date.parse))).toISOString() : null;

  return {
    rootDir,
    totals: {
      scannedFiles: totals.scannedFiles,
      filesWithActivity: totals.filesWithActivity,
      filesWithTimestamps: totals.filesWithTimestamps,
      totalLines: totals.totalLines,
      totalValidJsonLines: totals.totalValidJsonLines,
      totalInvalidJsonLines: totals.totalInvalidJsonLines,
      totalTokenEvents: totals.totalTokenEvents,
      models: Array.from(totals.models).sort(),
      earliest,
      latest,
    },
    files: rows,
  };
}

function printMarkdown(report) {
  console.log(`# JSONL summary`);
  console.log(`- root: \`${report.rootDir}\``);
  console.log(`- files scanned: ${report.totals.scannedFiles}`);
  console.log(`- files with activity: ${report.totals.filesWithActivity}`);
  console.log(`- files with timestamps: ${report.totals.filesWithTimestamps}`);
  console.log(`- total lines: ${report.totals.totalLines}`);
  console.log(`- valid JSON lines: ${report.totals.totalValidJsonLines}`);
  console.log(`- invalid JSON lines: ${report.totals.totalInvalidJsonLines}`);
  console.log(`- token/usage events: ${report.totals.totalTokenEvents}`);
  console.log(`- earliest timestamp: ${report.totals.earliest ?? "n/a"}`);
  console.log(`- latest timestamp: ${report.totals.latest ?? "n/a"}`);
  console.log(`- models: ${report.totals.models.length > 0 ? report.totals.models.join(", ") : "n/a"}`);
  console.log("");

  if (report.files.length === 0) {
    console.log("No JSONL files with activity were found.");
    return;
  }

  const rows = report.files.map((file) => [
    file.path,
    file.start ?? "n/a",
    file.end ?? "n/a",
    file.durationSeconds === null ? "n/a" : formatDuration(file.durationSeconds),
    file.models.length > 0 ? file.models.join(", ") : "n/a",
    String(file.tokenEvents),
  ]);
  console.log(table(["file", "start", "end", "duration", "models", "token/usage"], rows));
}

export function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.root)) {
    console.error(`Root directory not found: ${options.root}`);
    process.exitCode = 1;
    return;
  }

  const files = walkFiles(options.root);
  const summaries = files.map(summarizeFile).filter(Boolean);
  const report = buildReport(summaries, options.root, options.includeEmpty);

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printMarkdown(report);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main();
}
