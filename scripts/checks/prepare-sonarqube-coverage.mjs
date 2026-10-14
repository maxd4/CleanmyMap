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
  Object.freeze({
    scope: "node",
    format: "lcov",
    lcovPath: "scripts/coverage/lcov.info",
    summaryPath: "scripts/coverage/coverage-summary.json",
    sourceRoot: ".",
  }),
  Object.freeze({
    scope: "python",
    format: "cobertura",
    coveragePath: "maintenance/python/coverage.xml",
    sourceRoot: "maintenance/python",
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
  const sourcePrefix = sourceRoot === "." ? "" : `${sourceRoot}/`;
  const candidate = isAbsolute ? rootRelative : raw.startsWith(sourcePrefix) ? raw : `${sourcePrefix}${raw}`;
  const normalized = normalizePath(candidate);
  if (rootRelative.startsWith("..") || path.isAbsolute(rootRelative) || (sourceRoot !== "." && !normalized.startsWith(sourcePrefix))) {
    throw new Error(`LCOV SF path escapes the checked-out source root: ${rawPath}`);
  }
  const target = repositoryFile(root, normalized);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`LCOV SF path does not resolve in the checkout: ${normalized}`);
  }
  return normalized;
}

function decodeXmlAttribute(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function xmlAttribute(attributes, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attributes.match(new RegExp(`${escapedName}\\s*=\\s*["']([^"']*)["']`));
  return match ? decodeXmlAttribute(match[1]) : null;
}

function parseCobertura(content, definition, root) {
  const text = String(content);
  const classRecords = [];
  let offset = 0;
  while (true) {
    const candidate = text.indexOf("<class", offset);
    if (candidate < 0) break;
    const markerEnd = candidate + "<class".length;
    const marker = text[markerEnd] ?? "";
    if (!/\s|>/.test(marker)) {
      offset = markerEnd;
      continue;
    }
    const openEnd = text.indexOf(">", markerEnd);
    if (openEnd < 0) throw new Error(`${definition.scope} coverage XML contains an unterminated class element.`);
    const closeStart = text.indexOf("</class>", openEnd + 1);
    if (closeStart < 0) throw new Error(`${definition.scope} coverage XML contains an unterminated class element.`);
    const attributes = text.slice(markerEnd, openEnd);
    const filename = xmlAttribute(attributes, "filename");
    if (!filename) throw new Error(`${definition.scope} coverage XML contains a class without filename.`);
    const source = normalizeSourcePath(filename, { root, sourceRoot: definition.sourceRoot });
    const body = text.slice(openEnd + 1, closeStart);
    const lines = [];
    const linePattern = /<line\b([^>]*)\/?\s*>/g;
    let lineMatch;
    while ((lineMatch = linePattern.exec(body)) !== null) {
      const number = Number(xmlAttribute(lineMatch[1], "number"));
      const hits = Number(xmlAttribute(lineMatch[1], "hits"));
      if (!Number.isInteger(number) || number < 1 || !Number.isInteger(hits) || hits < 0) {
        throw new Error(`${definition.scope} coverage XML contains an invalid line metric.`);
      }
      lines.push({ number, hits });
    }
    if (lines.length > 0) classRecords.push({ source, lines });
    offset = closeStart + "</class>".length;
  }
  if (classRecords.length === 0) throw new Error(`${definition.scope} coverage XML has no instrumented classes with line measurements.`);
  const uniqueSources = new Set(classRecords.map((record) => record.source));
  const totals = classRecords.reduce((result, record) => {
    result.lines.total += record.lines.length;
    result.lines.covered += record.lines.filter((line) => line.hits > 0).length;
    return result;
  }, { lines: { total: 0, covered: 0 } });
  if (totals.lines.total === 0) throw new Error(`${definition.scope} coverage XML contains no line measurements.`);
  return { files: uniqueSources.size, totals };
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
    if (definition.format === "cobertura") {
      const coverageFile = repositoryFile(root, definition.coveragePath);
      let content;
      try {
        content = fs.readFileSync(coverageFile, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") throw new Error(`${definition.scope} coverage report is missing: ${definition.coveragePath}`);
        throw error;
      }
      if (content.length === 0) throw new Error(`${definition.scope} coverage report is empty: ${definition.coveragePath}`);
      const parsed = parseCobertura(content, definition, root);
      return { scope: definition.scope, path: definition.coveragePath, files: parsed.files, totals: parsed.totals, normalized: false };
    }
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
