#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import { listFunctionMetadata } from "./complexity-policy.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

const require = createRequire(import.meta.url);
const SONARJS_VERSION = require("eslint-plugin-sonarjs/package.json").version;
const SOURCE_ROOTS = Object.freeze(["apps/web/src", "apps/mobile"]);
const COGNITIVE_TARGET = 15;
const NESTING_TARGET = 3;
const SELECTED_RULES = Object.freeze({
  "sonarjs/cognitive-complexity": Object.freeze({
    severity: "warning",
    measurement: "cognitive complexity per function",
    target: COGNITIVE_TARGET,
    ruleConfiguration: ["warn", 0],
  }),
  "sonarjs/no-redundant-boolean": Object.freeze({
    severity: "warning",
    measurement: "redundant boolean literal",
    target: null,
    ruleConfiguration: "warn",
  }),
  "sonarjs/no-duplicated-branches": Object.freeze({
    severity: "warning",
    measurement: "identical conditional branches",
    target: null,
    ruleConfiguration: "warn",
  }),
  "sonarjs/no-collapsible-if": Object.freeze({
    severity: "warning",
    measurement: "mergeable nested if statements",
    target: null,
    ruleConfiguration: "warn",
  }),
  "sonarjs/nested-control-flow": Object.freeze({
    severity: "warning",
    measurement: "maximum control-flow nesting level",
    target: NESTING_TARGET,
    ruleConfiguration: ["warn", { maximumNestingLevel: NESTING_TARGET }],
  }),
});

const LOCAL_RULES = new Set(Object.keys(SELECTED_RULES).filter((ruleId) => ruleId !== "sonarjs/cognitive-complexity"));

function normalizePath(file) {
  return file.replaceAll("\\", "/");
}

function sourceFileEntries(root, sourceRoots) {
  const tracked = execFileSync(gitExecutable(), ["ls-files", "--", ...sourceRoots], { cwd: root, encoding: "utf8" });
  const untracked = execFileSync(gitExecutable(), ["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots], { cwd: root, encoding: "utf8" });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).map(normalizePath).filter((file) => /\.(?:ts|tsx)$/.test(file)))].map((file) => ({
    path: file,
    source: fs.readFileSync(path.join(root, file), "utf8"),
  }));
}

function functionForLine(functions, line) {
  return functions
    .filter((candidate) => candidate.line === line || (candidate.functionStartLine <= line && candidate.functionEndLine >= line))
    .sort((left, right) => (left.functionEndLine - left.functionStartLine) - (right.functionEndLine - right.functionStartLine))[0] ?? null;
}

function cognitiveValue(message) {
  return Number(message.message.match(/Cognitive Complexity from (\d+)/i)?.[1] ?? NaN);
}

function localMeasure(ruleId) {
  const configuration = SELECTED_RULES[ruleId];
  return configuration.target === null
    ? { kind: configuration.measurement }
    : { kind: configuration.measurement, maximumNestingLevel: configuration.target };
}

function relationFor(item, complexityMetrics) {
  const sameFunction = complexityMetrics.filter((metric) => metric.path === item.path && metric.functionIdentity === item.functionIdentity);
  const sameRange = complexityMetrics.filter((metric) => metric.path === item.path
    && typeof metric.functionStartLine === "number"
    && typeof metric.functionEndLine === "number"
    && metric.functionStartLine <= (item.functionEndLine ?? item.line)
    && metric.functionEndLine >= (item.functionStartLine ?? item.line));
  const related = sameFunction.length > 0 ? sameFunction : sameRange;
  if (related.length === 0) return { status: "NOT_MEASURED", cyclomaticComplexity: null, functionLength: null };
  const pick = (metric) => related.find((candidate) => candidate.metric === metric) ?? null;
  const complexity = pick("complexity");
  const functionLength = pick("functionLength");
  return {
    status: "PRESENT",
    cyclomaticComplexity: complexity ? { value: complexity.value, category: complexity.category ?? null, line: complexity.line ?? null } : null,
    functionLength: functionLength ? { value: functionLength.value, category: functionLength.category ?? null, line: functionLength.line ?? null } : null,
  };
}

export function relateMaintainabilityReport(report, complexityReport) {
  if (!report || report.error || !complexityReport || complexityReport.error) return report;
  const complexityMetrics = complexityReport.metrics ?? [];
  return {
    ...report,
    metrics: report.metrics.map((metric) => ({ ...metric, relation: relationFor(metric, complexityMetrics) })),
    findings: report.findings.map((finding) => ({ ...finding, relation: relationFor(finding, complexityMetrics) })),
  };
}

export async function analyzeMaintainabilitySources({ files, complexityReport = null } = {}) {
  const startedAt = performance.now();
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: { parser: tseslint.parser },
      plugins: { sonarjs },
      rules: Object.fromEntries(Object.entries(SELECTED_RULES).map(([ruleId, configuration]) => [ruleId, configuration.ruleConfiguration])),
    }],
  });
  const lintResults = await Promise.all(files.map(async (file) => ({ file, results: await eslint.lintText(file.source, { filePath: file.path }) })));
  const metrics = [];
  const findings = [];
  const diagnostics = [];
  let functionCount = 0;

  for (const { file, results } of lintResults) {
    const functions = listFunctionMetadata(file.path, file.source);
    functionCount += functions.length;
    const cognitiveByIdentity = new Map(functions.map((candidate) => [candidate.functionIdentity, 0]));
    for (const result of results) for (const message of result.messages ?? []) {
      if (message.fatal) {
        diagnostics.push({ file: file.path, line: message.line ?? null, column: message.column ?? null, message: message.message, severity: "error" });
        continue;
      }
      if (message.ruleId === "sonarjs/cognitive-complexity") {
        const value = cognitiveValue(message);
        const functionMetadata = functionForLine(functions, message.line);
        if (!functionMetadata || !Number.isFinite(value)) {
          diagnostics.push({ file: file.path, line: message.line ?? null, column: message.column ?? null, message: `Mesure cognitive non résolue: ${message.message}`, severity: "error" });
          continue;
        }
        cognitiveByIdentity.set(functionMetadata.functionIdentity, value);
        continue;
      }
      if (!LOCAL_RULES.has(message.ruleId)) continue;
      const functionMetadata = functionForLine(functions, message.line);
      findings.push({
        category: "local-maintainability",
        ruleId: message.ruleId,
        file: file.path,
        functionIdentity: functionMetadata?.functionIdentity ?? null,
        function: functionMetadata?.name ?? null,
        line: message.line ?? null,
        column: message.column ?? null,
        endLine: message.endLine ?? null,
        endColumn: message.endColumn ?? null,
        message: message.message,
        severity: message.severity === 2 ? "error" : "warning",
        measure: localMeasure(message.ruleId),
        thresholdTarget: SELECTED_RULES[message.ruleId].target,
        functionStartLine: functionMetadata?.functionStartLine ?? null,
        functionEndLine: functionMetadata?.functionEndLine ?? null,
      });
    }
    for (const functionMetadata of functions) {
      const value = cognitiveByIdentity.get(functionMetadata.functionIdentity) ?? 0;
      metrics.push({
        category: "cognitive-complexity",
        metric: "cognitiveComplexity",
        path: file.path,
        functionIdentity: functionMetadata.functionIdentity,
        function: functionMetadata.name,
        line: functionMetadata.line,
        endLine: functionMetadata.functionEndLine,
        functionStartLine: functionMetadata.functionStartLine,
        functionEndLine: functionMetadata.functionEndLine,
        value,
        thresholdTarget: COGNITIVE_TARGET,
        severity: "informational",
      });
    }
  }

  const related = relateMaintainabilityReport({ metrics, findings }, complexityReport);
  const findingsByRule = Object.fromEntries([...new Set(findings.map((finding) => finding.ruleId))].sort().map((ruleId) => [ruleId, findings.filter((finding) => finding.ruleId === ruleId).length]));
  const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const result = {
    schemaVersion: 1,
    kind: "quality-maintainability",
    status: diagnostics.length > 0 ? "FAIL" : "PASS",
    blocking: false,
    measurementStatus: diagnostics.length > 0 ? "MEASUREMENT_FAILED" : "MEASURED_NOT_RATCHETED",
    readProvenance: "WORKTREE_LIVE",
    engine: { name: "eslint-plugin-sonarjs", version: SONARJS_VERSION, eslint: ESLint.version, node: process.version },
    sourceRoots: SOURCE_ROOTS,
    rules: Object.fromEntries(Object.entries(SELECTED_RULES).map(([ruleId, configuration]) => [ruleId, {
      severity: configuration.severity,
      measurement: configuration.measurement,
      thresholdTarget: configuration.target,
      enforcement: "informational; no historical baseline or blocking ratchet",
    }])),
    metrics: related.metrics,
    findings: related.findings,
    diagnostics,
    summary: {
      filesMeasured: files.length,
      functionsMeasured: functionCount,
      cognitiveComplexityFunctions: related.metrics.length,
      cognitiveComplexityAboveTarget: related.metrics.filter((metric) => metric.value > COGNITIVE_TARGET).length,
      localMaintainabilityFindings: related.findings.length,
      findingsByRule,
      elapsedMs,
      filesPerSecond: elapsedMs === 0 ? null : Math.round((files.length / (elapsedMs / 1000)) * 100) / 100,
    },
    policy: {
      cyclomaticComplexity: "measured by quality:complexity; not replaced",
      cognitiveComplexity: `measured with sonarjs/cognitive-complexity at rule threshold 0; reference target ${COGNITIVE_TARGET}; no ratchet yet`,
      functionLength: "measured by quality:complexity; not replaced",
      localMaintainability: "selected complementary findings; no universal blocking threshold",
    },
  };
  return result;
}

export async function runMaintainabilityAudit({ root = process.cwd(), sourceRoots = SOURCE_ROOTS, complexityReport = null } = {}) {
  return analyzeMaintainabilitySources({ files: sourceFileEntries(root, sourceRoots), complexityReport });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = await runMaintainabilityAudit();
  console.log(`Maintainability audit: ${report.summary.functionsMeasured} functions, ${report.findings.length} local findings, ${report.summary.elapsedMs} ms.`);
  if (report.status === "FAIL") process.exitCode = 1;
}
