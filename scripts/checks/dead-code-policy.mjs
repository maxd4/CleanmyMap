#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveCandidateSha, writeQualityEvidence } from "./quality-evidence.mjs";

export const DEAD_CODE_BASELINE_SCHEMA_VERSION = 1;
export const DEAD_CODE_JUSTIFICATION_SCHEMA_VERSION = 1;
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
const justificationsPath = path.join(repositoryRoot, "scripts", "checks", "dead-code-justifications.json");
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
  const ids = new Set();
  for (const finding of baseline.findings) {
    const key = findingKey(finding);
    if (keys.has(key)) throw new Error(`Duplicate dead-code baseline finding: ${key}`);
    keys.add(key);
    if (!/^[0-9a-f]{24}$/i.test(finding.id ?? "")) {
      throw new Error(`Dead-code baseline finding has an invalid stable id: ${key}`);
    }
    if (ids.has(finding.id)) throw new Error(`Duplicate dead-code baseline finding id: ${finding.id}`);
    ids.add(finding.id);
    if (finding.classification !== "historical-debt") {
      throw new Error(`Dead-code baseline finding is not classified as historical debt: ${key}`);
    }
  }
  return baseline;
}

export function validateDeadCodeJustifications(registry) {
  if (!registry || registry.schemaVersion !== DEAD_CODE_JUSTIFICATION_SCHEMA_VERSION) {
    throw new Error("Dead-code justification registry schema mismatch.");
  }
  if (!Array.isArray(registry.justifications)) {
    throw new Error("Dead-code justification registry is malformed: expected a justifications array.");
  }

  const ids = new Set();
  for (const justification of registry.justifications) {
    if (!justification || typeof justification !== "object" || Array.isArray(justification)) {
      throw new Error("Dead-code justification registry entry is malformed.");
    }
    if (!/^[0-9a-f]{24}$/i.test(justification.id ?? "")) {
      throw new Error("Dead-code justification id must be a 24-character hexadecimal stable finding id.");
    }
    if (ids.has(justification.id)) {
      throw new Error(`Duplicate dead-code justification id: ${justification.id}`);
    }
    ids.add(justification.id);
    if (justification.classification !== "KEEP_JUSTIFIED") {
      throw new Error(`Dead-code justification ${justification.id} must use KEEP_JUSTIFIED classification.`);
    }
    if (typeof justification.reason !== "string" || justification.reason.trim().length === 0) {
      throw new Error(`Dead-code justification ${justification.id} requires a non-empty reason.`);
    }
    if (typeof justification.evidence !== "string" || justification.evidence.trim().length === 0) {
      throw new Error(`Dead-code justification ${justification.id} requires non-empty evidence.`);
    }
    if (!/^[0-9a-f]{40}$/i.test(justification.reviewedRef ?? "")) {
      throw new Error(`Dead-code justification ${justification.id} requires a complete reviewedRef SHA.`);
    }
  }
  return registry;
}

export function loadDeadCodeJustifications(filePath = justificationsPath) {
  return validateDeadCodeJustifications(JSON.parse(fs.readFileSync(filePath, "utf8")));
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

export function compareDeadCodeFindings(
  currentFindings,
  baseline,
  justifications = { schemaVersion: DEAD_CODE_JUSTIFICATION_SCHEMA_VERSION, justifications: [] },
) {
  validateDeadCodeBaseline(baseline);
  validateDeadCodeJustifications(justifications);
  const baselineByKey = new Map(baseline.findings.map((finding) => [findingKey(finding), finding]));
  const baselineById = new Map(baseline.findings.map((finding) => [finding.id, finding]));
  const currentByKey = new Map(currentFindings.map((finding) => [findingKey(finding), finding]));
  const newFindings = currentFindings.filter((finding) => !baselineByKey.has(findingKey(finding)));
  const resolvedFindings = baseline.findings.filter((finding) => !currentByKey.has(findingKey(finding)));
  for (const justification of justifications.justifications) {
    if (!baselineById.has(justification.id)) {
      throw new Error(`Dead-code justification targets a finding absent from the historical baseline: ${justification.id}`);
    }
  }

  const currentByBaselineId = new Map();
  for (const finding of currentFindings) {
    const historicalFinding = baselineByKey.get(findingKey(finding));
    if (historicalFinding) currentByBaselineId.set(historicalFinding.id, finding);
  }
  const justifiedIds = new Set(justifications.justifications.map((justification) => justification.id));
  const keepJustifiedFindings = currentFindings.filter((finding) => {
    const historicalFinding = baselineByKey.get(findingKey(finding));
    return historicalFinding && justifiedIds.has(historicalFinding.id);
  });
  const historicalActionableFindings = currentFindings.filter((finding) => {
    const historicalFinding = baselineByKey.get(findingKey(finding));
    return historicalFinding && !justifiedIds.has(historicalFinding.id);
  });
  const staleKeepJustifications = justifications.justifications
    .filter((justification) => !currentByBaselineId.has(justification.id))
    .map((justification) => ({ ...justification, status: "STALE_KEEP_JUSTIFIED" }));

  return {
    newFindings,
    resolvedFindings,
    historicalActionableFindings,
    keepJustifiedFindings,
    staleKeepJustifications,
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
    `Historical actionable findings: ${comparison.historicalActionableFindings.length}.`,
    `KEEP_JUSTIFIED findings: ${comparison.keepJustifiedFindings.length}.`,
    `Resolved historical findings: ${comparison.resolvedFindings.length}.`,
    `New findings: ${comparison.newFindings.length}.`,
    `STALE_KEEP_JUSTIFIED: ${comparison.staleKeepJustifications.length}.`,
  ];
  for (const finding of comparison.newFindings.slice(0, 50)) lines.push(`NEW_DEAD_CODE: ${formatFinding(finding)}`);
  if (comparison.newFindings.length > 50) lines.push(`NEW_DEAD_CODE: ... ${comparison.newFindings.length - 50} more`);
  for (const finding of comparison.staleKeepJustifications) {
    lines.push(`STALE_KEEP_JUSTIFIED: ${finding.id}`);
  }
  return lines.join("\n");
}

export function hasBlockingDeadCodeFindings(comparison) {
  return comparison.newFindings.length > 0 || comparison.staleKeepJustifications.length > 0;
}

export function runDeadCodePolicy({
  report,
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")),
  justifications = loadDeadCodeJustifications(),
} = {}) {
  const currentFindings = normalizeKnipReport(report);
  const comparison = compareDeadCodeFindings(currentFindings, baseline, justifications);
  if (!comparison.baselineFresh) throw new Error(`Dead-code baseline stale: ${baseline.sourceCommit} is not an ancestor of HEAD.`);
  return { baseline, currentFindings, justifications, comparison };
}

async function main() {
  try {
    const report = runKnipReport();
    const result = runDeadCodePolicy({ report });
    console.log(formatDeadCodeReport(result));
    const blocking = hasBlockingDeadCodeFindings(result.comparison);
    writeQualityEvidence({
      gate: "dead-code",
      candidateSha: resolveCandidateSha(repositoryRoot),
      status: blocking ? "FAIL" : "PASS",
      metrics: {
        currentFindings: result.comparison.currentCount,
        baselineFindings: result.comparison.baselineCount,
        historicalActionable: result.comparison.historicalActionableFindings.length,
        keepJustified: result.comparison.keepJustifiedFindings.length,
        staleKeepJustified: result.comparison.staleKeepJustifications.length,
      },
      newFindings: result.comparison.newFindings.length,
      resolvedFindings: result.comparison.resolvedFindings.length,
      historicalFindings: result.comparison.historicalActionableFindings.length,
      baseline: {
        sourceCommit: result.baseline.sourceCommit,
        tool: result.baseline.tool,
        toolVersion: result.baseline.toolVersion,
        config: result.baseline.config,
      },
      details: {
        newFindingIds: result.comparison.newFindings.map(findingId),
        resolvedFindingIds: result.comparison.resolvedFindings.map(findingId),
        staleKeepJustifiedIds: result.comparison.staleKeepJustifications.map((finding) => finding.id),
      },
    });
    if (blocking) {
      console.error(
        `FAIL: ${result.comparison.newFindings.length} new dead-code finding(s); ` +
        `${result.comparison.staleKeepJustifications.length} stale KEEP_JUSTIFIED finding(s).`,
      );
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
