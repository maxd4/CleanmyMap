#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DEAD_CODE_BASELINE_SCHEMA_VERSION = 1;
export const DEAD_CODE_TOOL = "knip";
export const DEAD_CODE_TOOL_VERSION = "6.37.0";
export const DEAD_CODE_CONFIG = "scripts/knip.json";

const ISSUE_TYPES = Object.freeze([
  "binaries",
  "dependencies",
  "devDependencies",
  "duplicates",
  "enumMembers",
  "exports",
  "files",
  "namespaceMembers",
  "nsExports",
  "nsTypes",
  "types",
  "unlisted",
  "unresolved",
]);

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "dead-code-baseline.json");
const knipPath = path.join(repositoryRoot, "node_modules", "knip", "bin", "knip.js");

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeText(value) {
  return value == null || value === "" ? null : String(value);
}

function normalizeSymbol(symbol) {
  return {
    name: normalizeText(symbol?.name ?? symbol?.symbol),
    namespace: normalizeText(symbol?.namespace ?? symbol?.parentSymbol),
    kind: normalizeText(symbol?.kind),
    specifier: normalizeText(symbol?.specifier),
  };
}

function createFinding(type, file, item) {
  if (Array.isArray(item)) {
    const symbols = item
      .map(normalizeSymbol)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return { type, file: normalizePath(file), symbols };
  }

  const symbol = normalizeSymbol(item);
  return {
    type,
    file: normalizePath(file),
    name: symbol.name ?? normalizePath(file),
    namespace: symbol.namespace,
    kind: symbol.kind,
    specifier: symbol.specifier,
  };
}

export function findingKey(finding) {
  return JSON.stringify({
    type: finding.type,
    file: normalizePath(finding.file),
    name: finding.name ?? null,
    namespace: finding.namespace ?? null,
    kind: finding.kind ?? null,
    specifier: finding.specifier ?? null,
    symbols: finding.symbols ?? null,
  });
}

export function findingId(finding) {
  return crypto.createHash("sha256").update(findingKey(finding)).digest("hex").slice(0, 24);
}

export function normalizeKnipReport(report) {
  if (!report || !Array.isArray(report.issues)) {
    throw new Error("Knip JSON report is malformed: expected an issues array.");
  }

  const findings = [];
  for (const row of report.issues) {
    if (!row || typeof row.file !== "string") {
      throw new Error("Knip JSON report is malformed: every issue row needs a file.");
    }
    for (const type of ISSUE_TYPES) {
      for (const item of Array.isArray(row[type]) ? row[type] : []) {
        findings.push(createFinding(type, row.file, item));
      }
    }
  }

  const unique = new Map(findings.map((finding) => [findingKey(finding), finding]));
  return [...unique.values()].sort((left, right) => findingKey(left).localeCompare(findingKey(right)));
}

export function createDeadCodeBaseline({ report, sourceCommit }) {
  const findings = normalizeKnipReport(report);
  return {
    schemaVersion: DEAD_CODE_BASELINE_SCHEMA_VERSION,
    tool: DEAD_CODE_TOOL,
    toolVersion: DEAD_CODE_TOOL_VERSION,
    config: DEAD_CODE_CONFIG,
    sourceCommit,
    source: "provided Knip audit snapshot",
    findings: findings.map((finding) => ({
      ...finding,
      id: findingId(finding),
      classification: "historical-debt",
    })),
  };
}

export function validateDeadCodeBaseline(baseline) {
  if (!baseline || baseline.schemaVersion !== DEAD_CODE_BASELINE_SCHEMA_VERSION) {
    throw new Error("Dead-code baseline schema mismatch.");
  }
  if (baseline.tool !== DEAD_CODE_TOOL || baseline.toolVersion !== DEAD_CODE_TOOL_VERSION) {
    throw new Error("Dead-code baseline tool/version mismatch.");
  }
  if (baseline.config !== DEAD_CODE_CONFIG || typeof baseline.sourceCommit !== "string") {
    throw new Error("Dead-code baseline provenance is malformed.");
  }
  if (!Array.isArray(baseline.findings)) {
    throw new Error("Dead-code baseline findings are malformed.");
  }

  const keys = new Set();
  for (const finding of baseline.findings) {
    const key = findingKey(finding);
    if (keys.has(key)) throw new Error(`Duplicate dead-code baseline finding: ${key}`);
    keys.add(key);
    if (finding.classification !== "historical-debt") {
      throw new Error(`Dead-code baseline finding is not classified as historical debt: ${key}`);
    }
  }
  return baseline;
}

function isAncestor(sourceCommit) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", sourceCommit, "HEAD"], { cwd: repositoryRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function compareDeadCodeFindings(currentFindings, baseline) {
  validateDeadCodeBaseline(baseline);
  const baselineByKey = new Map(baseline.findings.map((finding) => [findingKey(finding), finding]));
  const currentByKey = new Map(currentFindings.map((finding) => [findingKey(finding), finding]));
  const newFindings = currentFindings.filter((finding) => !baselineByKey.has(findingKey(finding)));
  const resolvedFindings = baseline.findings.filter((finding) => !currentByKey.has(findingKey(finding)));

  return {
    newFindings,
    resolvedFindings,
    currentCount: currentFindings.length,
    baselineCount: baseline.findings.length,
    baselineFresh: isAncestor(baseline.sourceCommit),
  };
}

function parseJsonOutput(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Knip did not produce a JSON report.");
  return JSON.parse(output.slice(start, end + 1));
}

export function runKnipReport({ spawn = spawnSync } = {}) {
  if (!fs.existsSync(knipPath)) {
    throw new Error("HOST_ENVIRONMENT: Knip 6.37.0 is not installed.");
  }
  const result = spawn(process.execPath, [
    knipPath,
    "--config",
    DEAD_CODE_CONFIG,
    "--no-progress",
    "--no-config-hints",
    "--no-tag-hints",
    "--no-exit-code",
    "--reporter",
    "json",
  ], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  if (typeof result.stdout !== "string" || result.stdout.trim().length === 0) {
    throw new Error(`Knip produced no JSON report: ${result.stderr || "no output"}`);
  }
  return parseJsonOutput(result.stdout);
}

function formatFinding(finding) {
  if (finding.symbols) {
    return `${finding.type}: ${finding.file}: ${finding.symbols.map((symbol) => symbol.name ?? "?").join(", ")}`;
  }
  return `${finding.type}: ${finding.file}${finding.name ? `: ${finding.name}` : ""}`;
}

export function formatDeadCodeReport({ comparison }) {
  const lines = [
    `Knip dead-code: ${comparison.currentCount} current finding(s), ${comparison.baselineCount} historical baseline finding(s).`,
    `Resolved historical findings: ${comparison.resolvedFindings.length}.`,
  ];
  for (const finding of comparison.newFindings.slice(0, 50)) lines.push(`NEW_DEAD_CODE: ${formatFinding(finding)}`);
  if (comparison.newFindings.length > 50) lines.push(`NEW_DEAD_CODE: ... ${comparison.newFindings.length - 50} more`);
  return lines.join("\n");
}

export function runDeadCodePolicy({ report, baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) } = {}) {
  const currentFindings = normalizeKnipReport(report);
  const comparison = compareDeadCodeFindings(currentFindings, baseline);
  if (!comparison.baselineFresh) throw new Error(`Dead-code baseline stale: ${baseline.sourceCommit} is not an ancestor of HEAD.`);
  return { baseline, currentFindings, comparison };
}

async function main() {
  try {
    const report = runKnipReport();
    const result = runDeadCodePolicy({ report });
    console.log(formatDeadCodeReport(result));
    if (result.comparison.newFindings.length > 0) {
      console.error(`FAIL: ${result.comparison.newFindings.length} new dead-code finding(s).`);
      process.exitCode = 1;
      return;
    }
    console.log("PASS: no new dead-code finding or aggravation was detected.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
