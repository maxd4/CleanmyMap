#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { validateCoverageEvidence } from "./coverage-evidence.mjs";
import { COVERAGE_METRICS } from "./coverage-policy.mjs";
import { validateCoveragePublicationProof } from "../ci/coverage-publication.mjs";
import { REPORT_DEFINITIONS, validateSonarCoverageReports } from "./prepare-sonarqube-coverage.mjs";

const COVERAGE_INSIGHTS_SCHEMA_VERSION = 1;
export const COVERAGE_WARNING_THRESHOLD = 80;
export const DUPLICATION_WARNING_THRESHOLD = 3;

const DUPLICATION_SCOPES = Object.freeze(["runtime", "tests", "fixtures/data"]);

function normalize(value) { return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, ""); }

function repositoryPath(root, relativePath) { return path.join(root, ...normalize(relativePath).split("/")); }

function readJson(filePath, fsApi = fs) {
  return JSON.parse(fsApi.readFileSync(filePath, "utf8"));
}
function pathFromReport(raw, { root, sourceRoot }) {
  const value = normalize(raw);
  if (!value) throw new Error("coverage report contains an empty source path");
  const isAbsolute = path.isAbsolute(value) || path.win32.isAbsolute(value);
  const rootedValue = sourceRoot !== "." && !value.startsWith(`${normalize(sourceRoot)}/`)
    ? path.join(normalize(sourceRoot), value)
    : value;
  const absolute = isAbsolute ? path.resolve(value) : path.resolve(root, ...rootedValue.split("/"));
  const relative = normalize(path.relative(root, absolute));
  if (relative.startsWith("../") || relative === ".." || path.isAbsolute(relative)) throw new Error(`coverage source escapes repository: ${raw}`);
  if (sourceRoot !== "." && !relative.startsWith(`${normalize(sourceRoot)}/`)) throw new Error(`coverage source is outside ${sourceRoot}: ${raw}`);
  return relative;
}

function metric(covered, total, source, state) {
  if (state !== "MEASURED" || !Number.isInteger(total) || total < 0 || !Number.isInteger(covered) || covered < 0 || covered > total || total === 0) {
    return { covered: null, total: null, uncovered: null, pct: null, source: source ?? null, state };
  }
  return { covered, total, uncovered: total - covered, pct: Number(((covered / total) * 100).toFixed(2)), source: source ?? null, state };
}

function emptyMetrics(state, source = null) {
  return Object.fromEntries(COVERAGE_METRICS.map((name) => [name, metric(null, null, source, state)]));
}

function summaryMetric(row, name, state, source) {
  const value = row?.[name];
  return metric(Number(value?.covered), Number(value?.total), source, state);
}

function stableId(scope, file, line, block, branch) {
  return createHash("sha256").update(`${scope}|${file}|${line}|${block}|${branch}`).digest("hex").slice(0, 24);
}

function parseLcov(content, definition, root) {
  const records = new Map();
  let current = null;
  const finish = () => { if (current) { records.set(current.path, current); current = null; } };
  for (const rawLine of String(content).split(/\r?\n/)) {
    if (rawLine.startsWith("SF:")) {
      finish();
      const filePath = pathFromReport(rawLine.slice(3), { root, sourceRoot: definition.sourceRoot });
      current = { path: filePath, lines: new Map(), branches: [], functions: new Map() };
      continue;
    }
    if (rawLine === "end_of_record") { finish(); continue; }
    if (!current) continue;
    if (rawLine.startsWith("DA:")) {
      const [line, taken] = rawLine.slice(3).split(",");
      const lineNumber = Number(line);
      const count = Number(taken);
      if (!Number.isInteger(lineNumber) || !Number.isInteger(count) || count < 0) throw new Error(`${definition.scope} LCOV line metric is invalid`);
      current.lines.set(lineNumber, count);
    } else if (rawLine.startsWith("BRDA:")) {
      const [line, block, branch, taken] = rawLine.slice(5).split(",");
      const lineNumber = Number(line);
      const normalizedTaken = taken === "-" || taken === "-1" ? 0 : Number(taken);
      if (!Number.isInteger(lineNumber) || !block || !branch || (taken !== "-" && !/^-?\d+$/.test(taken ?? "")) || normalizedTaken < 0) throw new Error(`${definition.scope} LCOV branch metric is invalid`);
      current.branches.push({ line: lineNumber, block, branch, counter: normalizedTaken, taken, covered: normalizedTaken > 0 });
    } else if (rawLine.startsWith("FNDA:")) {
      const [count, ...nameParts] = rawLine.slice(5).split(",");
      const value = Number(count);
      if (!Number.isInteger(value) || value < 0) throw new Error(`${definition.scope} LCOV function metric is invalid`);
      current.functions.set(nameParts.join(","), value);
    }
  }
  finish();
  if (records.size === 0) throw new Error(`${definition.scope} LCOV is empty`);
  return records;
}

function parseCobertura(content, definition, root) {
  const records = new Map();
  for (const match of String(content).matchAll(/<class\b([^>]*)>([\s\S]*?)<\/class>/g)) {
    const filename = match[1].match(/\bfilename\s*=\s*["']([^"']+)["']/)?.[1];
    if (!filename) continue;
    const filePath = pathFromReport(filename, { root, sourceRoot: definition.sourceRoot });
    const lines = new Map();
    const branches = [];
    for (const lineMatch of match[2].matchAll(/<line\b([^>]*)\/?>(?:<\/line>)?/g)) {
      const attrs = lineMatch[1];
      const line = Number(attrs.match(/\bnumber\s*=\s*["'](\d+)["']/)?.[1]);
      const hits = Number(attrs.match(/\bhits\s*=\s*["'](\d+)["']/)?.[1]);
      if (!Number.isInteger(line) || !Number.isInteger(hits) || hits < 0) continue;
      lines.set(line, hits);
      if (attrs.includes('branch="true"') || attrs.includes("branch='true'")) {
        const coverage = attrs.match(/condition-coverage\s*=\s*["']([^"']+)["']/)?.[1] ?? "";
        const counts = coverage.match(/\((\d+)\s*\/\s*(\d+)\)/);
        if (counts) {
          const covered = Number(counts[1]);
          const total = Number(counts[2]);
          for (let index = 0; index < total; index += 1) branches.push({ line, block: "cobertura", branch: String(index), counter: index < covered ? 1 : 0, taken: index < covered ? "1" : "0", covered: index < covered });
        }
      }
    }
    if (lines.size > 0) records.set(filePath, { path: filePath, lines, branches, functions: new Map() });
  }
  if (records.size === 0) throw new Error(`${definition.scope} Cobertura has no line measurements`);
  return records;
}

function fileMetrics(record, state, source) {
  const lineTotal = record?.lines?.size ?? 0;
  const lineCovered = [...(record?.lines?.values() ?? [])].filter((value) => value > 0).length;
  const branchTotal = record?.branches?.length ?? 0;
  const branchCovered = record?.branches?.filter((branch) => branch.covered).length ?? 0;
  const functionTotal = record?.functions?.size ?? 0;
  const functionCovered = [...(record?.functions?.values() ?? [])].filter((value) => value > 0).length;
  return {
    statements: metric(null, null, source, state),
    branches: metric(branchCovered, branchTotal, source, state),
    functions: metric(functionCovered, functionTotal, source, state),
    lines: metric(lineCovered, lineTotal, source, state),
  };
}

function mergeMetricRows(rows, name, state, source) {
  const total = rows.reduce((sum, row) => sum + (Number.isInteger(row?.[name]?.total) ? row[name].total : 0), 0);
  const covered = rows.reduce((sum, row) => sum + (Number.isInteger(row?.[name]?.covered) ? row[name].covered : 0), 0);
  return total > 0 ? metric(covered, total, source, state) : metric(null, null, source, "NOT_MEASURED");
}

function priorityFor(uncovered, pct) {
  if (uncovered === 0) return "NONE";
  if (uncovered >= 5 || (pct ?? 100) < COVERAGE_WARNING_THRESHOLD) return "HIGH";
  return "MEDIUM";
}

function scopeDefinition(definition) {
  return {
    scope: definition.scope,
    summaryPath: definition.summaryPath ?? null,
    lcovPath: definition.lcovPath ?? null,
    coveragePath: definition.coveragePath ?? null,
    sourceRoot: definition.sourceRoot,
  };
}

function emptyScope(definition, state, diagnostics = []) {
  return {
    scope: definition.scope,
    state,
    source: scopeDefinition(definition),
    provenance: { summary: definition.summaryPath ?? definition.coveragePath ?? null, detail: state },
    metrics: emptyMetrics(state),
    files: [],
    decisionPoints: [],
    warnings: [],
    diagnostics,
  };
}

function buildScope({ root, auditedSha, definition, fsApi, validateEvidence, validatePublicationProof, validateSonar }) {
  const diagnostics = [];
  let validation = null;
  try {
    validation = validateSonar({ root, reports: [definition], write: false, mode: "SONAR_PARTIAL" })[0];
  } catch (error) {
    diagnostics.push({ code: "COVERAGE_VALIDATION_FAILED", message: error instanceof Error ? error.message : String(error) });
    return emptyScope(definition, "MEASUREMENT_FAILED", diagnostics);
  }
  if (validation?.status !== "VALID") {
    diagnostics.push({ code: "COVERAGE_EVIDENCE_UNAVAILABLE", message: validation?.reason ?? "coverage report unavailable" });
    return emptyScope(definition, "NOT_MEASURED", diagnostics);
  }

  let evidenceState = "EVIDENCE_UNVERIFIED";
  if (definition.scope === "web") {
    try {
      const evidence = validateEvidence({ repositoryRoot: root });
      if (auditedSha && evidence.gitHead && evidence.gitHead !== auditedSha) {
        evidenceState = "STALE_EVIDENCE";
        diagnostics.push({ code: "STALE_COVERAGE_EVIDENCE", message: `coverage evidence belongs to ${evidence.gitHead}, audited SHA is ${auditedSha}` });
      } else evidenceState = "MEASURED";
    } catch (error) {
      evidenceState = "EVIDENCE_UNVERIFIED";
      diagnostics.push({ code: "COVERAGE_EVIDENCE_UNVERIFIED", message: error instanceof Error ? error.message : String(error) });
    }
  } else {
    try {
      if (!auditedSha) throw new Error("coverage publication proof requires an audited candidate SHA");
      validatePublicationProof({ repositoryRoot: root, candidateSha: auditedSha, scope: definition.scope });
      evidenceState = "MEASURED";
    } catch (error) {
      evidenceState = "EVIDENCE_UNVERIFIED";
      diagnostics.push({ code: "COVERAGE_EVIDENCE_UNVERIFIED", message: error instanceof Error ? error.message : String(error) });
    }
  }

  try {
    const summary = definition.format === "cobertura" ? null : readJson(repositoryPath(root, definition.summaryPath), fsApi);
    const records = definition.format === "cobertura"
      ? parseCobertura(fsApi.readFileSync(repositoryPath(root, definition.coveragePath), "utf8"), definition, root)
      : parseLcov(fsApi.readFileSync(repositoryPath(root, definition.lcovPath), "utf8"), definition, root);
    const summaryRows = summary
      ? new Map(Object.entries(summary).filter(([key]) => key !== "total").map(([key, row]) => [pathFromReport(key, { root, sourceRoot: definition.sourceRoot }), row]))
      : new Map();
    const state = evidenceState;
    const files = [];
    for (const [filePath, record] of records) {
      const row = summaryRows.get(filePath) ?? null;
      const recordMetrics = fileMetrics(record, state, definition.format === "cobertura" ? "Cobertura" : "LCOV");
      const metrics = definition.format === "cobertura"
        ? { statements: metric(null, null, "Cobertura: unavailable", "NOT_MEASURED"), branches: recordMetrics.branches, functions: metric(null, null, "Cobertura: unavailable", "NOT_MEASURED"), lines: recordMetrics.lines }
        : Object.fromEntries(COVERAGE_METRICS.map((name) => [name, row ? summaryMetric(row, name, state, "coverage-summary.json") : recordMetrics[name]]));
      const branchPoints = (record.branches ?? []).map((branch) => ({
        id: stableId(definition.scope, filePath, branch.line, branch.block, branch.branch),
        scope: definition.scope,
        path: filePath,
        line: branch.line,
        block: branch.block,
        branch: branch.branch,
        counter: branch.counter,
        taken: branch.taken,
        covered: branch.covered,
      }));
      const uncoveredLines = [...new Set(branchPoints.filter((branch) => !branch.covered).map((branch) => branch.line))].sort((a, b) => a - b);
      const uncovered = branchPoints.filter((branch) => !branch.covered).length;
      files.push({ scope: definition.scope, path: filePath, metrics, uncoveredBranchLines: uncoveredLines, uncoveredBranches: uncovered, branchCount: branchPoints.length, priority: priorityFor(uncovered, metrics.branches.pct), provenance: { state, source: definition.format === "cobertura" ? definition.coveragePath : definition.summaryPath }, decisionPoints: branchPoints });
    }
    const scopeMetrics = definition.format === "cobertura"
      ? { statements: metric(null, null, "Cobertura: unavailable", "NOT_MEASURED"), branches: mergeMetricRows(files.map((file) => file.metrics), "branches", state, "Cobertura"), functions: metric(null, null, "Cobertura: unavailable", "NOT_MEASURED"), lines: mergeMetricRows(files.map((file) => file.metrics), "lines", state, "Cobertura") }
      : Object.fromEntries(COVERAGE_METRICS.map((name) => [name, summaryMetric(readJson(repositoryPath(root, definition.summaryPath), fsApi).total, name, state, "coverage-summary.json")]));
    const warnings = [];
    if (state === "MEASURED") {
      for (const [name, value] of Object.entries(scopeMetrics)) if (value.state === "MEASURED" && value.pct < COVERAGE_WARNING_THRESHOLD) warnings.push({ code: "COVERAGE_BELOW_TARGET", scope: definition.scope, metric: name, value: value.pct, threshold: COVERAGE_WARNING_THRESHOLD, severity: "WARNING", relation: "informational only; no ratchet change" });
    }
    const decisionPoints = files.flatMap((file) => file.decisionPoints).sort((left, right) => (right.covered ? 1 : 0) - (left.covered ? 1 : 0) || left.path.localeCompare(right.path) || left.line - right.line || left.block.localeCompare(right.block) || left.branch.localeCompare(right.branch));
    const rankedFiles = [...files].sort((left, right) => right.uncoveredBranches - left.uncoveredBranches || (left.metrics.branches.pct ?? 101) - (right.metrics.branches.pct ?? 101) || left.path.localeCompare(right.path));
    return { scope: definition.scope, state, source: scopeDefinition(definition), provenance: { summary: definition.summaryPath ?? definition.coveragePath, auditedSha, evidenceState: state }, metrics: scopeMetrics, files: rankedFiles, decisionPoints, warnings, diagnostics };
  } catch (error) {
    diagnostics.push({ code: "COVERAGE_MEASUREMENT_FAILED", message: error instanceof Error ? error.message : String(error) });
    return emptyScope(definition, "MEASUREMENT_FAILED", diagnostics);
  }
}
function duplicationInsights(report) {
  if (!report || report.error || !Array.isArray(report.results)) return { state: "NOT_MEASURED", threshold: DUPLICATION_WARNING_THRESHOLD, scopes: [], warnings: [], diagnostics: [{ code: "DUPLICATION_REPORT_UNAVAILABLE", message: "duplication results were not available; jscpd was not rerun" }] };
  const scopes = DUPLICATION_SCOPES.map((scope) => {
    const result = report.results.find((entry) => entry.scopeName === scope);
    if (!result?.metrics || typeof result.metrics.percentage !== "number") return { scope, state: "NOT_MEASURED", percentage: null, metrics: null };
    return { scope, state: "MEASURED", percentage: result.metrics.percentage, metrics: { linesDuplicated: result.metrics.duplicatedLines ?? null, linesMeasured: result.metrics.lines ?? null, clones: result.metrics.clones ?? null, percentage: result.metrics.percentage } };
  });
  const warnings = scopes.filter((entry) => entry.state === "MEASURED" && entry.percentage > DUPLICATION_WARNING_THRESHOLD).map((entry) => ({ code: "DUPLICATION_ABOVE_TARGET", scope: entry.scope, value: entry.percentage, threshold: DUPLICATION_WARNING_THRESHOLD, severity: "WARNING", relation: "informational only; existing duplication gate and ratchets remain canonical" }));
  return { state: scopes.some((entry) => entry.state === "MEASURED") ? "MEASURED" : "NOT_MEASURED", threshold: DUPLICATION_WARNING_THRESHOLD, scopes, warnings, diagnostics: [] };
}

export function buildCoverageInsightsReport({ root = process.cwd(), auditedSha = null, fsApi = fs, reports = REPORT_DEFINITIONS, validateEvidence: validateEvidenceFn = validateCoverageEvidence, validatePublicationProof: validatePublicationProofFn = validateCoveragePublicationProof, validateSonar: validateSonarFn = validateSonarCoverageReports, duplicationReport = null } = {}) {
  const startedAt = Date.now();
  const scopes = reports.map((definition) => buildScope({ root, auditedSha, definition, fsApi, validateEvidence: validateEvidenceFn, validatePublicationProof: validatePublicationProofFn, validateSonar: validateSonarFn }));
  const duplication = duplicationInsights(duplicationReport);
  const warnings = [...scopes.flatMap((scope) => scope.warnings), ...duplication.warnings];
  const diagnostics = [...scopes.flatMap((scope) => scope.diagnostics), ...duplication.diagnostics];
  const measured = scopes.filter((scope) => scope.state === "MEASURED").length;
  return {
    schemaVersion: COVERAGE_INSIGHTS_SCHEMA_VERSION,
    kind: "quality-coverage-insights",
    status: "PASS",
    blocking: false,
    measurementStatus: measured === scopes.length ? "MEASURED" : measured > 0 ? "MIXED" : "NOT_MEASURED",
    auditedSha,
    thresholds: { coverageWarningPct: COVERAGE_WARNING_THRESHOLD, duplicationWarningPct: DUPLICATION_WARNING_THRESHOLD },
    scopes,
    duplication,
    warnings,
    diagnostics,
    summary: {
      scopes: scopes.length,
      scopesMeasured: measured,
      warnings: warnings.length,
      diagnosticCount: diagnostics.length,
      topUncoveredBranchFiles: scopes.flatMap((scope) => scope.files).filter((file) => file.uncoveredBranches > 0).slice(0, 30),
      elapsedMs: Date.now() - startedAt,
    },
    attentionRequired: warnings.length > 0 || diagnostics.length > 0,
  };
}

export function formatCoverageInsightsReport(report) {
  const lines = [`Coverage insights: ${report.measurementStatus}; warnings=${report.warnings?.length ?? 0}; diagnostics=${report.diagnostics?.length ?? 0}.`];
  for (const scope of report.scopes ?? []) lines.push(`${scope.scope}: ${scope.state}; branches=${scope.metrics?.branches?.pct ?? "NOT_MEASURED"}%; uncovered branch files=${scope.files?.filter((file) => file.uncoveredBranches > 0).length ?? 0}.`);
  for (const warning of report.warnings ?? []) lines.push(`WARNING ${warning.code}: ${warning.scope} ${warning.metric ?? "duplication"}=${warning.value}% ${warning.code === "COVERAGE_BELOW_TARGET" ? "<" : ">"} target ${warning.threshold}%.`);
  return lines.join("\n");
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const report = buildCoverageInsightsReport();
    console.log(formatCoverageInsightsReport(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
// End of coverage insights module.
