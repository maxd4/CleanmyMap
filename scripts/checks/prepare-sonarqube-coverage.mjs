#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPORT_DEFINITIONS = Object.freeze([
  Object.freeze({
    scope: "web",
    lcovPath: "apps/web/coverage/lcov.info",
    summaryPath: "apps/web/coverage/coverage-summary.json",
    sourceRoot: "apps/web",
  }),
  Object.freeze({
    scope: "mobile",
    lcovPath: "apps/mobile/coverage/lcov.info",
    summaryPath: "apps/mobile/coverage/coverage-summary.json",
    sourceRoot: "apps/mobile",
  }),
]);

function repositoryFile(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeSourcePath(rawPath, { root, sourceRoot }) {
  const raw = normalizePath(rawPath);
  if (!raw) throw new Error("LCOV contains an empty SF path.");
  const isAbsolute = path.isAbsolute(raw) || path.win32.isAbsolute(raw);
  const absolute = isAbsolute ? path.resolve(raw) : path.resolve(root, ...raw.split("/"));
  const rootRelative = path.relative(root, absolute).replaceAll("\\", "/");
  const candidate = isAbsolute ? rootRelative : raw.startsWith(`${sourceRoot}/`) ? raw : `${sourceRoot}/${raw}`;
  const normalized = normalizePath(candidate);
  if (rootRelative.startsWith("..") || path.isAbsolute(rootRelative) || !normalized.startsWith(`${sourceRoot}/`)) {
    throw new Error(`LCOV SF path escapes the checked-out source root: ${rawPath}`);
  }
  const target = repositoryFile(root, normalized);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`LCOV SF path does not resolve in the checkout: ${normalized}`);
  }
  return normalized;
}

function parseMetric(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid LCOV ${label}: ${value}`);
  return parsed;
}

function parseLcov(content, definition, root) {
  const lines = String(content).split(/\r?\n/);
  const records = [];
  let current = null;
  const normalizedLines = [];
  const finish = () => {
    if (!current) return;
    records.push(current);
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith("SF:")) {
      finish();
      const source = normalizeSourcePath(line.slice(3), { root, sourceRoot: definition.sourceRoot });
      current = { source, lines: { total: 0, covered: 0 }, branches: { total: 0, covered: 0 }, functions: { total: 0, covered: 0 }, hasMetric: false };
      normalizedLines.push(`SF:${source}`);
      continue;
    }
    if (line === "end_of_record") {
      finish();
      normalizedLines.push(line);
      continue;
    }
    normalizedLines.push(line);
    if (!current) continue;
    if (line.startsWith("DA:")) {
      const [lineNumber, hits] = line.slice(3).split(",");
      parseMetric(lineNumber, "line number");
      const covered = parseMetric(hits, "line hit count");
      current.lines.total += 1;
      current.lines.covered += covered > 0 ? 1 : 0;
      current.hasMetric = true;
    } else if (line.startsWith("BRDA:")) {
      const taken = line.slice(5).split(",")[3];
      current.branches.total += 1;
      current.branches.covered += taken !== "-" && parseMetric(taken, "branch hit count") > 0 ? 1 : 0;
      current.hasMetric = true;
    } else if (line.startsWith("FN:")) {
      current.functions.total += 1;
      current.hasMetric = true;
    } else if (line.startsWith("FNDA:")) {
      const covered = parseMetric(line.slice(5).split(",")[0], "function hit count");
      current.functions.covered += covered > 0 ? 1 : 0;
    }
  }
  finish();
  if (records.length === 0 || !records.some((record) => record.hasMetric)) throw new Error(`${definition.scope} LCOV is empty.`);
  return { records, normalizedContent: `${normalizedLines.join("\n").replace(/\n+$/, "")}\n` };
}

function summarySources(summary, definition, root) {
  if (!summary?.total || typeof summary.total !== "object") throw new Error(`${definition.scope} coverage summary has no total metrics.`);
  return new Set(Object.keys(summary).filter((key) => key !== "total").map((key) => normalizeSourcePath(key, { root, sourceRoot: definition.sourceRoot })));
}

function assertMetricsMatchSummary(records, summary, definition, root) {
  const lcovSources = new Set(records.map((record) => record.source));
  const summarySourceSet = summarySources(summary, definition, root);
  if (lcovSources.size !== summarySourceSet.size || [...lcovSources].some((source) => !summarySourceSet.has(source))) {
    throw new Error(`${definition.scope} LCOV sources do not match coverage-summary.json.`);
  }
  const totals = records.reduce((result, record) => {
    for (const metric of ["lines", "branches", "functions"]) {
      result[metric].total += record[metric].total;
      result[metric].covered += record[metric].covered;
    }
    return result;
  }, { lines: { total: 0, covered: 0 }, branches: { total: 0, covered: 0 }, functions: { total: 0, covered: 0 } });
  for (const metric of Object.keys(totals)) {
    const expected = summary.total[metric];
    if (!expected || expected.total !== totals[metric].total || expected.covered !== totals[metric].covered) {
      throw new Error(`${definition.scope} LCOV ${metric} totals do not match coverage-summary.json.`);
    }
  }
  return totals;
}

export function validateSonarCoverageReports({ root = process.cwd(), reports = REPORT_DEFINITIONS, write = true } = {}) {
  return reports.map((definition) => {
    const lcovFile = repositoryFile(root, definition.lcovPath);
    const summaryFile = repositoryFile(root, definition.summaryPath);
    let lcovDescriptor;
    try {
      lcovDescriptor = fs.openSync(lcovFile, write ? "r+" : "r");
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`${definition.scope} LCOV report is missing: ${definition.lcovPath}`);
      throw error;
    }
    try {
      const content = fs.readFileSync(lcovDescriptor, "utf8");
      if (content.length === 0) throw new Error(`${definition.scope} LCOV report is empty: ${definition.lcovPath}`);
      let summaryContent;
      try {
        summaryContent = fs.readFileSync(summaryFile, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") throw new Error(`${definition.scope} coverage summary is missing: ${definition.summaryPath}`);
        throw error;
      }
      const summary = JSON.parse(summaryContent);
      const parsed = parseLcov(content, definition, root);
      const totals = assertMetricsMatchSummary(parsed.records, summary, definition, root);
      if (write && parsed.normalizedContent !== content) {
        const normalized = Buffer.from(parsed.normalizedContent, "utf8");
        fs.writeSync(lcovDescriptor, normalized, 0, normalized.length, 0);
        fs.ftruncateSync(lcovDescriptor, normalized.length);
      }
      return { scope: definition.scope, path: definition.lcovPath, files: parsed.records.length, totals, normalized: parsed.normalizedContent !== content };
    } finally {
      fs.closeSync(lcovDescriptor);
    }
  });
}

function main() {
  try {
    for (const report of validateSonarCoverageReports()) {
      console.log(`SONAR_LCOV_${report.scope.toUpperCase()}: files=${report.files} normalized=${report.normalized ? "yes" : "no"}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
