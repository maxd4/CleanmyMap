#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import * as espree from "espree";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import { listFunctionMetadata } from "./complexity-policy.mjs";
import { profileFunctionControlFlow } from "./control-flow-profile.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

const require = createRequire(import.meta.url);
const SONARJS_VERSION = require("eslint-plugin-sonarjs/package.json").version;
const SOURCE_ROOTS = Object.freeze(["apps/web/src", "apps/mobile", "scripts"]);
const SOURCE_FILE_PATTERN = /\.(?:mjs|ts|tsx)$/;
const EXCLUDED_SOURCE_DIRECTORIES = new Set(["fixture", "fixtures", "generated", "node_modules", "snapshot", "snapshots"]);
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

function isSupportedSourcePath(file) {
  return SOURCE_FILE_PATTERN.test(normalizePath(file));
}

function isCanonicalSourcePath(file) {
  const normalized = normalizePath(file);
  return isSupportedSourcePath(normalized)
    && !normalized.split("/").some((segment) => EXCLUDED_SOURCE_DIRECTORIES.has(segment.toLowerCase()));
}

function sourceFileEntries(root, sourceRoots) {
  const tracked = execFileSync(gitExecutable(), ["ls-files", "--", ...sourceRoots], { cwd: root, encoding: "utf8" });
  const untracked = execFileSync(gitExecutable(), ["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots], { cwd: root, encoding: "utf8" });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).map(normalizePath).filter(isCanonicalSourcePath))].map((file) => ({
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
  return Number(message.message.match(/Cognitive Complexity from (\d+)/i)?.[1] ?? Number.NaN);
}

function localMeasure(ruleId) {
  const configuration = SELECTED_RULES[ruleId];
  return configuration.target === null
    ? { kind: configuration.measurement }
    : { kind: configuration.measurement, maximumNestingLevel: configuration.target };
}

function metricRelationIndex(metrics) {
  const byFunction = new Map();
  const byPath = new Map();
  for (const metric of metrics) {
    const functionKey = `${metric.path}\u0000${metric.functionIdentity}`;
    const functionMetrics = byFunction.get(functionKey) ?? [];
    functionMetrics.push(metric);
    byFunction.set(functionKey, functionMetrics);
    const pathMetrics = byPath.get(metric.path) ?? [];
    pathMetrics.push(metric);
    byPath.set(metric.path, pathMetrics);
  }
  return { byFunction, byPath };
}

function relationFor(item, relationIndex) {
  const sameFunction = relationIndex.byFunction.get(`${item.path}\u0000${item.functionIdentity}`) ?? [];
  const sameRange = (relationIndex.byPath.get(item.path) ?? []).filter((metric) =>
    typeof metric.functionStartLine === "number"
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

function cognitiveRelationFor(item, cognitiveIndex) {
  const metric = cognitiveIndex.get(`${item.path}\u0000${item.functionIdentity}`);
  return metric ? { value: metric.value, line: metric.line ?? null, thresholdTarget: metric.thresholdTarget ?? null } : null;
}

export function relateMaintainabilityReport(report, complexityReport) {
  if (!report || report.error) return report;
  const complexityMetrics = complexityReport?.error ? [] : complexityReport?.metrics ?? [];
  const complexityIndex = metricRelationIndex(complexityMetrics);
  const cognitiveByFunction = new Map((report.metrics ?? []).map((metric) => [`${metric.path}\u0000${metric.functionIdentity}`, metric]));
  return {
    ...report,
    metrics: report.metrics.map((metric) => ({ ...metric, relation: relationFor(metric, complexityIndex) })),
    findings: report.findings.map((finding) => ({ ...finding, relation: relationFor(finding, complexityIndex) })),
    controlFlowProfiles: (report.controlFlowProfiles ?? []).map((profile) => ({
      ...profile,
      relation: {
        ...relationFor(profile, complexityIndex),
        cognitiveComplexity: cognitiveRelationFor(profile, cognitiveByFunction),
      },
    })),
  };
}

export async function analyzeMaintainabilitySources({ files = [], complexityReport = null, sourceRoots = SOURCE_ROOTS } = {}) {
  const startedAt = performance.now();
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: { parser: tseslint.parser },
        plugins: { sonarjs },
        rules: Object.fromEntries(Object.entries(SELECTED_RULES).map(([ruleId, configuration]) => [ruleId, configuration.ruleConfiguration])),
      },
      {
        files: ["**/*.mjs"],
        languageOptions: {
          parser: espree,
          parserOptions: { ecmaVersion: "latest", sourceType: "module" },
        },
        plugins: { sonarjs },
        rules: Object.fromEntries(Object.entries(SELECTED_RULES).map(([ruleId, configuration]) => [ruleId, configuration.ruleConfiguration])),
      },
    ],
  });
  const lintResults = await Promise.all(files.map(async (file) => ({
    file,
    results: isSupportedSourcePath(file.path)
      ? await eslint.lintText(file.source, { filePath: file.path })
      : [],
  })));
  const metrics = [];
  const findings = [];
  const controlFlowProfiles = [];
  const controlFlowStatuses = [];
  const maintainabilityStatuses = [];
  const diagnostics = [];
  let functionCount = 0;

  for (const { file, results } of lintResults) {
    const controlFlow = profileFunctionControlFlow(file.path, file.source);
    const lintParseFailed = results.some((result) => (result.messages ?? []).some((message) => message.fatal));
    let functions = [];
    let functionParseFailed = false;
    if (controlFlow.status === "PRESENT") {
      try {
        functions = listFunctionMetadata(file.path, file.source);
      } catch (error) {
        functionParseFailed = true;
        diagnostics.push({ file: file.path, line: null, column: null, message: error.message, severity: "error" });
      }
    }
    const parserFailed = lintParseFailed || functionParseFailed || controlFlow.status !== "PRESENT";
    const measuredFunctions = parserFailed ? [] : functions;
    const measuredControlFlow = parserFailed ? [] : controlFlow.functions;
    const measurementStatus = parserFailed ? "NOT_MEASURED" : "PRESENT";
    const measurementReason = parserFailed ? (controlFlow.reason ?? "PARSER_FAILED") : null;
    functionCount += measuredFunctions.length;
    controlFlowStatuses.push({ path: file.path, status: measurementStatus, reason: measurementReason });
    maintainabilityStatuses.push({
      path: file.path,
      status: measurementStatus,
      reason: measurementReason,
    });
    controlFlowProfiles.push(...measuredControlFlow);
    diagnostics.push(...controlFlow.diagnostics.map((diagnostic) => ({ file: file.path, ...diagnostic })));
    const cognitiveByIdentity = new Map(measuredFunctions.map((candidate) => [candidate.functionIdentity, 0]));
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
    for (const functionMetadata of measuredFunctions) {
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

  const related = relateMaintainabilityReport({ metrics, findings, controlFlowProfiles }, complexityReport);
  const findingsByRule = Object.fromEntries([...new Set(findings.map((finding) => finding.ruleId))].sort((left, right) => left.localeCompare(right)).map((ruleId) => [ruleId, findings.filter((finding) => finding.ruleId === ruleId).length]));
  const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const result = {
    schemaVersion: 1,
    kind: "quality-maintainability",
    status: diagnostics.length > 0 ? "FAIL" : "PASS",
    blocking: false,
    measurementStatus: diagnostics.length > 0 ? "MEASUREMENT_FAILED" : "MEASURED_NOT_RATCHETED",
    readProvenance: "WORKTREE_LIVE",
    engine: { name: "eslint-plugin-sonarjs", version: SONARJS_VERSION, eslint: ESLint.version, node: process.version },
    sourceRoots: [...sourceRoots],
    rules: Object.fromEntries(Object.entries(SELECTED_RULES).map(([ruleId, configuration]) => [ruleId, {
      severity: configuration.severity,
      measurement: configuration.measurement,
      thresholdTarget: configuration.target,
      enforcement: "informational; no historical baseline or blocking ratchet",
    }])),
    metrics: related.metrics,
    findings: related.findings,
    controlFlowProfiles: related.controlFlowProfiles,
    controlFlowStatuses,
    maintainabilityStatuses,
    diagnostics,
    summary: {
      filesMeasured: maintainabilityStatuses.filter((entry) => entry.status === "PRESENT").length,
      filesNotMeasured: maintainabilityStatuses.filter((entry) => entry.status === "NOT_MEASURED").length,
      functionsMeasured: functionCount,
      cognitiveComplexityFunctions: related.metrics.length,
      cognitiveComplexityAboveTarget: related.metrics.filter((metric) => metric.value > COGNITIVE_TARGET).length,
      controlFlowFunctions: related.controlFlowProfiles.length,
      controlFlowDecisionPoints: related.controlFlowProfiles.reduce((sum, profile) => sum + profile.decisionPoints, 0),
      controlFlowNestedDecisionFunctions: related.controlFlowProfiles.filter((profile) => profile.nestedDecisionCount > 0).length,
      controlFlowFilesNotMeasured: controlFlowStatuses.filter((entry) => entry.status === "NOT_MEASURED").length,
      localMaintainabilityFindings: related.findings.length,
      findingsByRule,
      elapsedMs,
      filesPerSecond: elapsedMs === 0 ? null : Math.round((maintainabilityStatuses.filter((entry) => entry.status === "PRESENT").length / (elapsedMs / 1000)) * 100) / 100,
    },
    policy: {
      cyclomaticComplexity: "measured by quality:complexity; not replaced",
      cognitiveComplexity: `measured with sonarjs/cognitive-complexity at rule threshold 0; reference target ${COGNITIVE_TARGET}; no ratchet yet`,
      functionLength: "measured by quality:complexity; not replaced",
      localMaintainability: "selected complementary findings; no universal blocking threshold",
      controlFlowStructure: "descriptive TypeScript AST profile per supported TS/TSX/MJS function; no CodeScene algorithm, threshold, gate or score",
    },
  };
  return result;
}

export async function runMaintainabilityAudit({ root = process.cwd(), sourceRoots = SOURCE_ROOTS, complexityReport = null } = {}) {
  return analyzeMaintainabilitySources({ files: sourceFileEntries(root, sourceRoots), sourceRoots, complexityReport });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = await runMaintainabilityAudit();
  console.log(`Maintainability audit: ${report.summary.functionsMeasured} functions, ${report.summary.controlFlowFunctions} control-flow profiles, ${report.summary.controlFlowDecisionPoints} decision points, ${report.findings.length} local findings, ${report.summary.elapsedMs} ms.`);
  if (report.status === "FAIL") process.exitCode = 1;
}
