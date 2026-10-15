#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPORT_DEFINITIONS = Object.freeze([
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

function reportDefinition(scope, reports = REPORT_DEFINITIONS) {
  const definition = reports.find((candidate) => candidate.scope === scope);
  if (!definition) throw new Error(`Unknown SonarQube coverage scope: ${scope}`);
  return definition;
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
    let lineCursor = 0;
    while (true) {
      const lineStart = body.indexOf("<line", lineCursor);
      if (lineStart < 0) break;
      const afterName = body[lineStart + 5] ?? "";
      if (!/[\s>]/.test(afterName)) {
        lineCursor = lineStart + 5;
        continue;
      }
      const lineEnd = body.indexOf(">", lineStart + 5);
      if (lineEnd < 0) throw new Error(`${definition.scope} coverage XML contains an unterminated line element.`);
      const attributes = body.slice(lineStart + 5, lineEnd);
      const number = Number(xmlAttribute(attributes, "number"));
      const hits = Number(xmlAttribute(attributes, "hits"));
      if (!Number.isInteger(number) || number < 1 || !Number.isInteger(hits) || hits < 0) {
        throw new Error(`${definition.scope} coverage XML contains an invalid line metric.`);
      }
      lines.push({ number, hits });
      lineCursor = lineEnd + 1;
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

function validateReport(definition, { root, write }) {
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
}

export function validateSonarCoverageReports({ root = process.cwd(), reports = REPORT_DEFINITIONS, write = true, mode = "STRICT" } = {}) {
  if (mode === "STRICT") return reports.map((definition) => validateReport(definition, { root, write }));
  if (mode !== "SONAR_PARTIAL") throw new Error(`Unknown SonarQube coverage validation mode: ${mode}`);
  return reports.map((definition) => {
    try {
      return { ...validateReport(definition, { root, write }), status: "VALID", imported: true, reason: null };
    } catch (error) {
      return {
        scope: definition.scope,
        path: definition.format === "cobertura" ? definition.coveragePath : definition.lcovPath,
        status: "OMITTED",
        imported: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

function safeOutputPath(outputRoot, relativePath) {
  const root = path.resolve(outputRoot);
  const target = path.resolve(root, ...relativePath.split("/"));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`SonarQube coverage output escapes its artifact root: ${relativePath}`);
  return target;
}

export function stageSonarCoverageReport({ root = process.cwd(), scope, outputRoot, reports = REPORT_DEFINITIONS } = {}) {
  const definition = reportDefinition(scope, reports);
  const validated = validateReport(definition, { root, write: true });
  const relativePaths = definition.format === "cobertura"
    ? [definition.coveragePath]
    : [definition.lcovPath, definition.summaryPath];
  for (const relativePath of relativePaths) {
    const source = repositoryFile(root, relativePath);
    const destination = safeOutputPath(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return { ...validated, status: "VALID", imported: true, reason: null };
}

function outcomeStatus(outcome) {
  if (outcome === "success") return "PASS";
  if (outcome === "skipped" || !outcome) return "NOT_RUN";
  return "FAIL";
}

export function createSonarProducerResult({ scope, analyzedSha, runId, producerOutcome, validatorOutcome, reason = null } = {}) {
  const producerStatus = outcomeStatus(producerOutcome);
  const validatorStatus = producerStatus === "PASS" ? outcomeStatus(validatorOutcome) : "NOT_RUN";
  const resolvedReason = reason ?? (
    producerStatus !== "PASS"
      ? `Coverage producer did not succeed (${producerOutcome || "not-run"}).`
      : validatorStatus !== "PASS"
        ? `Coverage validator did not succeed (${validatorOutcome || "not-run"}).`
        : null
  );
  return {
    schemaVersion: 1,
    scope,
    analyzedSha,
    runId: String(runId),
    producer: { status: producerStatus, outcome: producerOutcome || "not-run" },
    validator: { status: validatorStatus, outcome: validatorOutcome || "not-run" },
    reason: resolvedReason,
  };
}

function knownScope(value) {
  return typeof value === "string" && REPORT_DEFINITIONS.some((definition) => definition.scope === value) ? value : null;
}

function resultScopeFromFile(fileName) {
  const basename = path.basename(fileName, ".json");
  return knownScope(basename);
}

function resultStatus(result, key) {
  const status = result?.[key]?.status;
  return status === "PASS" || status === "FAIL" || status === "NOT_RUN" ? status : "NOT_RUN";
}

function resultAnnouncedPass(result) {
  return resultStatus(result, "producer") === "PASS" || resultStatus(result, "validator") === "PASS";
}

function readProducerResults(directory, { analyzedSha, runId }) {
  const results = new Map();
  const omissions = [];
  const invalidScopes = new Set();
  if (!directory || !fs.existsSync(directory)) return { results, omissions };

  const recordOmission = ({ fileName, scope, result, kind, reason }) => {
    const resolvedScope = knownScope(scope);
    const omission = {
      scope: resolvedScope ?? "unknown",
      file: fileName,
      kind,
      announcedPass: resultAnnouncedPass(result),
      reason,
      producerStatus: resultStatus(result, "producer"),
      validatorStatus: resultStatus(result, "validator"),
    };
    omissions.push(omission);
    if (resolvedScope) {
      invalidScopes.add(resolvedScope);
      results.delete(resolvedScope);
    }
  };

  for (const fileName of fs.readdirSync(directory).filter((candidate) => candidate.endsWith(".json")).sort()) {
    const filePath = path.join(directory, fileName);
    const fileScope = resultScopeFromFile(fileName);
    let result = null;
    try {
      result = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      recordOmission({
        fileName,
        scope: fileScope,
        result,
        kind: "MALFORMED_RESULT",
        reason: `SonarQube producer result was omitted because it is not valid JSON: ${fileName}.`,
      });
      continue;
    }

    const scope = knownScope(result?.scope) ?? fileScope;
    if (
      !result ||
      typeof result !== "object" ||
      result.schemaVersion !== 1 ||
      !knownScope(result.scope) ||
      !result.producer ||
      !result.validator
    ) {
      recordOmission({
        fileName,
        scope,
        result,
        kind: "MALFORMED_RESULT",
        reason: `SonarQube producer result was omitted because its schema is invalid: ${fileName}.`,
      });
      continue;
    }
    if (result.analyzedSha !== analyzedSha || String(result.runId) !== String(runId)) {
      recordOmission({
        fileName,
        scope,
        result,
        kind: "INVALID_PROVENANCE",
        reason: `SonarQube producer result was omitted because it is not attached to the analyzed SHA/run: ${fileName}.`,
      });
      continue;
    }
    if (invalidScopes.has(result.scope) || results.has(result.scope)) {
      recordOmission({
        fileName,
        scope: result.scope,
        result,
        kind: "DUPLICATE_RESULT",
        reason: `SonarQube producer results were omitted because the scope has multiple result files: ${result.scope}.`,
      });
      continue;
    }
    results.set(result.scope, result);
  }
  return { results, omissions };
}

function effectiveSonarProperties({ root, importedScopes }) {
  const properties = fs.readFileSync(repositoryFile(root, "sonar-project.properties"), "utf8");
  const imported = new Set(importedScopes);
  const javascriptPaths = REPORT_DEFINITIONS
    .filter((definition) => definition.format !== "cobertura" && imported.has(definition.scope))
    .map((definition) => definition.lcovPath);
  const pythonPaths = REPORT_DEFINITIONS
    .filter((definition) => definition.format === "cobertura" && imported.has(definition.scope))
    .map((definition) => definition.coveragePath);
  return properties.split(/\r?\n/).flatMap((line) => {
    if (line.startsWith("sonar.javascript.lcov.reportPaths=")) return javascriptPaths.length > 0 ? [`sonar.javascript.lcov.reportPaths=${javascriptPaths.join(",")}`] : [];
    if (line.startsWith("sonar.python.coverage.reportPaths=")) return pythonPaths.length > 0 ? [`sonar.python.coverage.reportPaths=${pythonPaths.join(",")}`] : [];
    return [line];
  }).join("\n");
}

export function prepareSonarPartialCoverage({
  root = process.cwd(),
  producerResultsDir,
  analyzedSha,
  runId,
  propertiesOut,
  manifestOut,
} = {}) {
  const producerResultSet = readProducerResults(producerResultsDir, { analyzedSha, runId });
  const producerResults = producerResultSet.results;
  const omissionsByScope = new Map(producerResultSet.omissions.filter((omission) => omission.scope !== "unknown").map((omission) => [omission.scope, omission]));
  const reports = REPORT_DEFINITIONS.map((definition) => {
    const omission = omissionsByScope.get(definition.scope);
    if (omission) {
      return {
        scope: definition.scope,
        path: definition.format === "cobertura" ? definition.coveragePath : definition.lcovPath,
        producerStatus: omission.producerStatus,
        validatorStatus: omission.validatorStatus,
        imported: false,
        integrityIssue: true,
        omission,
        reason: omission.reason,
      };
    }
    const producerResult = producerResults.get(definition.scope);
    if (!producerResult) {
      return {
        scope: definition.scope,
        path: definition.format === "cobertura" ? definition.coveragePath : definition.lcovPath,
        producerStatus: "NOT_RUN",
        validatorStatus: "NOT_RUN",
        imported: false,
        integrityIssue: true,
        omission: { scope: definition.scope, file: null, kind: "MISSING_RESULT", announcedPass: false, reason: "No producer result was published for this scope." },
        reason: "No producer result was published for this scope.",
      };
    }
    if (producerResult.producer.status !== "PASS") {
      return { scope: definition.scope, producerStatus: producerResult.producer.status, validatorStatus: producerResult.validator.status, imported: false, reason: producerResult.reason };
    }
    if (producerResult.validator.status !== "PASS") {
      return { scope: definition.scope, producerStatus: producerResult.producer.status, validatorStatus: producerResult.validator.status, imported: false, reason: producerResult.reason };
    }
    try {
      const validated = validateReport(definition, { root, write: false });
      return { ...validated, producerStatus: "PASS", validatorStatus: "PASS", imported: true, reason: null };
    } catch (error) {
      return {
        scope: definition.scope,
        path: definition.format === "cobertura" ? definition.coveragePath : definition.lcovPath,
        producerStatus: producerResult.producer.status,
        validatorStatus: "FAIL",
        imported: false,
        integrityIssue: producerResult.producer.status === "PASS" && producerResult.validator.status === "PASS",
        omission: {
          scope: definition.scope,
          file: definition.format === "cobertura" ? definition.coveragePath : definition.lcovPath,
          kind: "INVALID_ARTIFACT",
          announcedPass: producerResult.producer.status === "PASS" && producerResult.validator.status === "PASS",
          reason: error instanceof Error ? error.message : String(error),
        },
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const importedScopes = reports.filter((report) => report.imported).map((report) => report.scope);
  const producerStatuses = reports.map((report) => report.producerStatus);
  const manifest = {
    schemaVersion: 1,
    analyzedSha,
    runId: String(runId),
    reports,
    omittedResults: producerResultSet.omissions,
    statuses: {
      sonarCoverage: importedScopes.length === REPORT_DEFINITIONS.length ? "COMPLETE" : importedScopes.length > 0 ? "PARTIAL" : "UNAVAILABLE",
      sonarTests: producerStatuses.every((status) => status === "PASS") ? "PASS" : producerStatuses.some((status) => status === "FAIL") ? "FAIL" : "NOT_RUN",
      sonarIntegrity: reports.some((report) => report.integrityIssue) || producerResultSet.omissions.some((omission) => omission.scope === "unknown") ? "FAIL" : "PASS",
    },
  };
  fs.mkdirSync(path.dirname(propertiesOut), { recursive: true });
  fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
  fs.writeFileSync(propertiesOut, effectiveSonarProperties({ root, importedScopes }));
  fs.writeFileSync(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function finalizeSonarAnalysis({ manifest = null, scannerOutcome, preparationOutcome } = {}) {
  const analysisStatus = preparationOutcome !== "success"
    ? "NOT_RUN"
    : scannerOutcome === "success" ? "COMPLETE" : scannerOutcome === "failure" ? "FAILED" : "NOT_RUN";
  const coverageStatus = manifest?.statuses?.sonarCoverage ?? "UNAVAILABLE";
  const testsStatus = manifest?.statuses?.sonarTests ?? "NOT_RUN";
  const integrityStatus = manifest?.statuses?.sonarIntegrity ?? "NOT_RUN";
  console.log(`SONAR_ANALYSIS_STATUS: ${analysisStatus}`);
  console.log(`SONAR_COVERAGE_STATUS: ${coverageStatus}`);
  console.log(`SONAR_TESTS_STATUS: ${testsStatus}`);
  console.log(`SONAR_INTEGRITY_STATUS: ${integrityStatus}`);
  console.log(`ANALYZED_SHA: ${manifest?.analyzedSha ?? "unknown"}`);
  for (const report of manifest?.reports ?? []) {
    console.log(`SONAR_COVERAGE_${report.scope.toUpperCase()}: producer=${report.producerStatus} validator=${report.validatorStatus} import=${report.imported ? "YES" : "NO"}${report.reason ? ` reason=${report.reason}` : ""}`);
  }
  return analysisStatus === "COMPLETE" && integrityStatus === "PASS" ? 0 : 1;
}

function cliArgs() {
  return Object.fromEntries(process.argv.slice(2).filter((argument) => argument.startsWith("--")).map((argument) => {
    const [key, ...value] = argument.slice(2).split("=");
    return [key, value.join("=") || true];
  }));
}

function main() {
  const args = cliArgs();
  const mode = args.mode ?? "STRICT";
  try {
    if (mode === "STRICT") {
      const reports = validateSonarCoverageReports({ reports: args.scope ? [reportDefinition(args.scope)] : REPORT_DEFINITIONS });
      for (const report of reports) console.log(`SONAR_LCOV_${report.scope.toUpperCase()}: files=${report.files} normalized=${report.normalized ? "yes" : "no"}`);
      return;
    }
    if (mode === "STAGE") {
      const report = stageSonarCoverageReport({ scope: args.scope, outputRoot: args.outputRoot });
      console.log(`SONAR_COVERAGE_STAGED: ${report.scope}`);
      return;
    }
    if (mode === "WRITE_RESULT") {
      const result = createSonarProducerResult({
        scope: args.scope,
        analyzedSha: args.sha,
        runId: args.runId,
        producerOutcome: process.env.SONAR_PRODUCER_OUTCOME,
        validatorOutcome: process.env.SONAR_VALIDATOR_OUTCOME,
      });
      fs.mkdirSync(path.dirname(args.resultPath), { recursive: true });
      fs.writeFileSync(args.resultPath, `${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    if (mode === "SONAR_PARTIAL") {
      const manifest = prepareSonarPartialCoverage({
        producerResultsDir: args.producerResultsDir,
        analyzedSha: args.sha,
        runId: args.runId,
        propertiesOut: args.propertiesOut,
        manifestOut: args.manifestOut,
      });
      console.log(`SONAR_COVERAGE_STATUS: ${manifest.statuses.sonarCoverage}`);
      console.log(`SONAR_TESTS_STATUS: ${manifest.statuses.sonarTests}`);
      console.log(`SONAR_INTEGRITY_STATUS: ${manifest.statuses.sonarIntegrity}`);
      for (const report of manifest.reports) console.log(`SONAR_COVERAGE_${report.scope.toUpperCase()}: producer=${report.producerStatus} validator=${report.validatorStatus} import=${report.imported ? "YES" : "NO"}${report.reason ? ` reason=${report.reason}` : ""}`);
      return;
    }
    if (mode === "FINALIZE") {
      const manifest = fs.existsSync(args.manifestPath) ? JSON.parse(fs.readFileSync(args.manifestPath, "utf8")) : null;
      process.exitCode = finalizeSonarAnalysis({ manifest, scannerOutcome: process.env.SONAR_SCANNER_OUTCOME, preparationOutcome: process.env.SONAR_PREPARATION_OUTCOME });
      return;
    }
    throw new Error(`Unknown SonarQube coverage command mode: ${mode}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
