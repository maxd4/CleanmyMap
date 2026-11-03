#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "../ci/git-executable.mjs";
import {
  buildJscpdArguments,
  compareDuplicationMetrics,
  DUPLICATION_SCOPES,
  DUPLICATION_TOOL_VERSION,
  nativeBaselineFingerprintCount,
  readJscpdFingerprints,
  readJscpdMetrics,
  readJscpdOccurrences,
  validateDuplicationJustificationsRegistry,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";
import { writeDuplicationPublicationProof } from "../ci/duplication-publication.mjs";
import { resolveCandidateSha, writeQualityEvidence } from "./quality-evidence.mjs";
import { normalizeQualityScope, pathInQualityScope, scopeMetadata } from "./quality-scope.mjs";

function occurrencePathInQualityScope(file, scope) {
  if (pathInQualityScope(file, scope)) return true;
  const normalized = String(file ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  const candidatePrefixes = scope === "web"
    ? ["apps/web/", "apps/web/src/"]
    : scope === "mobile" ? ["apps/mobile/"] : [];
  return candidatePrefixes.some((prefix) => pathInQualityScope(`${prefix}${normalized}`, scope));
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const metricsBaselinePath = path.join(repositoryRoot, "scripts", "checks", "duplication-metrics-baseline.json");
const nativeBaselineDirectory = path.join(repositoryRoot, "scripts", "checks");
const justificationsPath = path.join(nativeBaselineDirectory, "duplication-justifications.json");
const jscpdRunnerPath = path.join(repositoryRoot, "node_modules", "jscpd", "run-jscpd.js");

function git(args) {
  return execFileSync(gitExecutable(), args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function assertBaselineFresh(baseline) {
  validateDuplicationMetricsBaseline(baseline);
  const head = git(["rev-parse", "HEAD"]);
  try {
    execFileSync(gitExecutable(), ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync(gitExecutable(), ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error(`duplication baseline stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
}

export function parseExecutedJscpdVersion(output) {
  const match = String(output ?? "").match(/^[ \t]*jscpd[ \t]+(\d+\.\d+\.\d+)[ \t]*$/m);
  if (!match) {
    throw new Error("DUPLICATION_TOOL_VERSION_INVALID: jscpd --version did not return a semantic version.");
  }
  return match[1];
}

export function verifyExecutedJscpdVersion({
  runnerPath = jscpdRunnerPath,
  fileExists = fs.existsSync,
  execute = execFileSync,
} = {}) {
  if (!fileExists(runnerPath)) {
    throw new Error(`HOST_ENVIRONMENT: jscpd executable missing at ${runnerPath}; expected jscpd ${DUPLICATION_TOOL_VERSION}.`);
  }

  let output;
  try {
    output = execute(process.execPath, [runnerPath, "--version"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`HOST_ENVIRONMENT: unable to execute jscpd --version from ${runnerPath}: ${detail}`);
  }

  const actual = parseExecutedJscpdVersion(output);
  if (actual !== DUPLICATION_TOOL_VERSION) {
    throw new Error(`DUPLICATION_TOOL_VERSION_MISMATCH: expected jscpd ${DUPLICATION_TOOL_VERSION}, executed ${actual}.`);
  }
  return { expected: DUPLICATION_TOOL_VERSION, actual, runnerPath };
}

function runScope(scopeName, baseline, { reportDirectory = null } = {}) {
  const baselineFileName = scopeName === "fixtures/data" ? "duplication-data-baseline.json" : `duplication-${scopeName}-baseline.json`;
  const nativeBaselinePath = path.join(nativeBaselineDirectory, baselineFileName);
  if (!fs.existsSync(nativeBaselinePath)) throw new Error(`duplication baseline missing: ${nativeBaselinePath}`);
  const nativeBaseline = JSON.parse(fs.readFileSync(nativeBaselinePath, "utf8"));
  nativeBaselineFingerprintCount(nativeBaseline);

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-jscpd-"));
  try {
    const result = spawnSync(process.execPath, [jscpdRunnerPath, ...buildJscpdArguments(scopeName, nativeBaselinePath, outputDirectory, "json,sarif")], {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    const reportPath = path.join(outputDirectory, "jscpd-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`jscpd report missing for ${scopeName}: ${result.stderr || result.stdout || "no output"}`);
    }
    const jscpdReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const metrics = readJscpdMetrics(jscpdReport);
    const sarifPath = path.join(outputDirectory, "jscpd-report.sarif");
    if (!fs.existsSync(sarifPath)) {
      throw new Error(`jscpd SARIF report missing for ${scopeName}.`);
    }
    const sarifReport = JSON.parse(fs.readFileSync(sarifPath, "utf8"));
    const fingerprints = readJscpdFingerprints(sarifReport);
    const occurrences = readJscpdOccurrences(jscpdReport, sarifReport, scopeName);
    const comparison = compareDuplicationMetrics(metrics, baseline.scopes[scopeName], scopeName);
    const execution = {
      status: result.status === 0 && result.signal === null && !result.error ? "PASS" : "FAIL",
      exitCode: Number.isInteger(result.status) ? result.status : null,
      signal: result.signal ?? null,
    };
    const executionFailures = execution.status === "PASS"
      ? []
      : [`jscpd execution failed (exit ${execution.exitCode ?? "unknown"}${execution.signal ? `, signal ${execution.signal}` : ""})`];
    const failures = [...comparison.failures, ...executionFailures];
    const reportArtifacts = reportDirectory
      ? (() => {
        const scopeDirectory = path.join(reportDirectory, scopeName);
        fs.mkdirSync(scopeDirectory, { recursive: true });
        const persistentJsonPath = path.join(scopeDirectory, "jscpd-report.json");
        const persistentSarifPath = path.join(scopeDirectory, "jscpd-report.sarif");
        fs.copyFileSync(reportPath, persistentJsonPath);
        fs.copyFileSync(sarifPath, persistentSarifPath);
        return { jsonPath: persistentJsonPath, sarifPath: persistentSarifPath };
      })()
      : null;
    return {
      scopeName,
      metrics,
      fingerprints,
      occurrences,
      reportArtifacts,
      execution,
      executionFailures,
      comparison: {
        ...comparison,
        status: failures.length > 0 ? "FAIL" : comparison.status,
        failures,
      },
    };
  } finally {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}

export function runDuplicationPolicy({
  publicationRoot = process.env.CMM_DUPLICATION_PUBLICATION_ROOT ?? null,
  runScopeFn = runScope,
  scope = "all",
} = {}) {
  const activeScope = normalizeQualityScope(scope);
  const baseline = JSON.parse(fs.readFileSync(metricsBaselinePath, "utf8"));
  assertBaselineFresh(baseline);
  const toolVersion = verifyExecutedJscpdVersion();
  const auditedSha = git(["rev-parse", "HEAD"]);
  const publicationDirectory = publicationRoot
    ? path.join(path.resolve(publicationRoot), auditedSha, `run-${Date.now()}-${process.pid}`)
    : null;
  const results = Object.keys(DUPLICATION_SCOPES).map((scopeName) => runScopeFn(scopeName, baseline, {
    reportDirectory: publicationDirectory,
  }));
  if (!fs.existsSync(justificationsPath)) {
    throw new Error(`duplication justifications missing: ${justificationsPath}`);
  }
  const nativeBaselines = Object.fromEntries(Object.keys(DUPLICATION_SCOPES).map((scopeName) => {
    const fileName = scopeName === "fixtures/data" ? "duplication-data-baseline.json" : `duplication-${scopeName}-baseline.json`;
    return [scopeName, JSON.parse(fs.readFileSync(path.join(nativeBaselineDirectory, fileName), "utf8"))];
  }));
  const currentFingerprintsByScope = Object.fromEntries(results.map((result) => [result.scopeName, result.fingerprints]));
  const currentOccurrencesByScope = Object.fromEntries(results.map((result) => [result.scopeName, result.occurrences]));
  const justifications = JSON.parse(fs.readFileSync(justificationsPath, "utf8"));
  const justificationReport = activeScope === "all"
    ? validateDuplicationJustificationsRegistry(justifications, {
      nativeBaselines,
      currentFingerprintsByScope,
      currentOccurrencesByScope,
      reviewedRefValidation: {
        auditedSha,
        gitRunner: (args) => execFileSync(gitExecutable(), args, { cwd: repositoryRoot, stdio: "ignore" }),
      },
    })
    : {
      keepIntentional: 0,
      noActionNoise: 0,
      staleKeepIntentional: [],
      staleNoActionNoise: [],
      stale: [],
      classifications: {},
      status: "NOT_APPLIED_TO_APPLICATION_PROJECTION",
    };
  const qualifiedNewFingerprints = new Set(Object.values(justificationReport.classifications).flat());
  for (const result of results) {
    const scopeBaseline = baseline.scopes[result.scopeName];
    const nativeBaseline = nativeBaselines[result.scopeName];
    const qualified = [...result.fingerprints].filter((fingerprint) => (
      !Object.hasOwn(nativeBaseline.fingerprints, fingerprint)
      && qualifiedNewFingerprints.has(`${result.scopeName}:${fingerprint}`)
    ));
    result.qualifiedNewFingerprints = qualified;
    result.metrics = {
      ...result.metrics,
      newClones: Math.max(0, result.metrics.newClones - qualified.length),
    };
    const comparison = compareDuplicationMetrics(result.metrics, scopeBaseline, result.scopeName);
    const executionFailures = result.executionFailures ?? [];
    const failures = [...comparison.failures, ...executionFailures];
    result.comparison = {
      ...comparison,
      status: failures.length > 0 ? "FAIL" : comparison.status,
      failures,
    };
  }
  const attributedResults = results.map((result) => ({
    scopeName: result.scopeName,
    occurrencePairs: (result.occurrences ?? []).filter((occurrence) => occurrencePathInQualityScope(occurrence.occurrenceA.path, activeScope) || occurrencePathInQualityScope(occurrence.occurrenceB.path, activeScope)).length,
    status: activeScope === "all" ? result.comparison.status : "PROJECTION_ONLY",
  }));
  for (const result of results) {
    const attribution = attributedResults.find((entry) => entry.scopeName === result.scopeName);
    if (activeScope === "all") continue;
    const scopedOccurrences = (result.occurrences ?? []).filter((occurrence) => occurrencePathInQualityScope(occurrence.occurrenceA.path, activeScope) || occurrencePathInQualityScope(occurrence.occurrenceB.path, activeScope));
    const scopedFingerprints = new Set(scopedOccurrences.map((occurrence) => occurrence.fingerprint).filter(Boolean));
    const nativeBaseline = nativeBaselines[result.scopeName];
    const newFingerprints = [...scopedFingerprints].filter((fingerprint) => !Object.hasOwn(nativeBaseline.fingerprints, fingerprint));
    const measurementDiagnostics = [
      ...(Array.isArray(result.executionFailures) ? result.executionFailures : ["jscpd execution diagnostics are unavailable"]),
      ...(result.execution?.status === "PASS" ? [] : ["jscpd execution was not validated as successful"]),
      ...(Array.isArray(result.occurrences) ? [] : ["jscpd occurrence measurement is unavailable"]),
    ];
    const measurementValid = measurementDiagnostics.length === 0;
    const applicationFailures = [
      ...measurementDiagnostics,
      ...(newFingerprints.length > 0 ? [`new ${activeScope} clone fingerprints detected (${newFingerprints.length})`] : []),
    ];
    result.applicationComparison = {
      status: applicationFailures.length > 0 ? "FAIL" : "PASS",
      failures: applicationFailures,
      diagnostics: measurementDiagnostics,
      measurementStatus: measurementValid ? "PASS" : "FAIL",
      measurementValid,
      newFingerprints,
      transverse: result.comparison,
    };
    attribution.status = result.applicationComparison.status;
  }
  return { baseline, results, justificationReport, toolVersion, publicationDirectory, attributedResults, ...scopeMetadata(activeScope) };
}

export function formatDuplicationReport({ results, justificationReport = null, toolVersion = null, scope = "all", attributedResults = [] }) {
  const lines = [];
  if (toolVersion) lines.push(`JSCPD_VERSION: ${toolVersion.actual} (expected ${toolVersion.expected})`);
  for (const result of results) {
    const { scopeName, metrics } = result;
    const comparison = scope === "all" ? result.comparison : result.applicationComparison;
    const attribution = attributedResults.find((entry) => entry.scopeName === scopeName);
    if (scope !== "all") {
      lines.push(`${scopeName} (${scope} projection): ${attribution?.occurrencePairs ?? 0} occurrence pairs; application status=${comparison?.status ?? "NOT_MEASURED"}; transverse status=${result.comparison.status}.`);
      lines.push(`  APPLICATION_MEASUREMENT_STATUS: ${comparison?.measurementStatus ?? "NOT_VALIDATED"}`);
      for (const diagnostic of comparison?.diagnostics ?? []) lines.push(`  APPLICATION_DIAGNOSTIC: ${diagnostic}`);
    }
    lines.push(`${scopeName}: ${metrics.clones} clones, ${metrics.duplicatedLines}/${metrics.lines} lines (${metrics.percentage.toFixed(2)}%), ${metrics.duplicatedTokens}/${metrics.tokens} tokens.`);
    lines.push(`  DUPLICATION_STATUS: ${comparison.status}`);
    lines.push(`  NEW_CLONE_FINGERPRINTS: ${metrics.newClones}`);
    lines.push(`  QUALIFIED_NEW_CLONE_FINGERPRINTS: ${result.qualifiedNewFingerprints?.length ?? 0}`);
    lines.push(`  DUPLICATED_LINES_DELTA: ${comparison.deltas?.duplicatedLines ?? "n/a"}`);
    lines.push(`  DUPLICATED_TOKENS_DELTA: ${comparison.deltas?.duplicatedTokens ?? "n/a"}`);
    lines.push(`  LINE_PERCENTAGE_POINT_DELTA: ${comparison.deltas?.linePercentagePoints?.toFixed(6) ?? "n/a"}`);
    lines.push(`  TOKEN_PERCENTAGE_POINT_DELTA: ${comparison.deltas?.tokenPercentagePoints?.toFixed(6) ?? "n/a"}`);
    for (const failure of comparison.failures) lines.push(`  FAIL_REASON: ${failure}`);
  }
  if (justificationReport) {
    lines.push(`KEEP_INTENTIONAL: ${justificationReport.keepIntentional}`);
    lines.push(`NO_ACTION_NOISE: ${justificationReport.noActionNoise}`);
    lines.push(`STALE_KEEP_INTENTIONAL: ${justificationReport.staleKeepIntentional.length}`);
    lines.push(`STALE_NO_ACTION_NOISE: ${justificationReport.staleNoActionNoise.length}`);
    for (const identity of justificationReport.staleKeepIntentional) lines.push(`STALE_KEEP_INTENTIONAL: ${identity}`);
    for (const identity of justificationReport.staleNoActionNoise) lines.push(`STALE_NO_ACTION_NOISE: ${identity}`);
  }
  return lines.join("\n");
}

async function main() {
  try {
    const scope = normalizeQualityScope(process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ?? "all");
    const report = runDuplicationPolicy({ scope });
    const candidateSha = resolveCandidateSha(repositoryRoot);
    for (const result of report.results) {
      const scopeBaseline = report.baseline.scopes[result.scopeName];
      const comparison = scope === "all" ? result.comparison : result.applicationComparison;
      writeQualityEvidence({
        gate: "duplication",
        scope: scope === "all" ? result.scopeName : `${scope}-${result.scopeName}`,
        fileKey: `duplication-${scope === "all" ? "" : `${scope}-`}${result.scopeName}`.replaceAll("/", "-"),
        candidateSha,
        status: comparison.status,
        metrics: scope === "all"
          ? {
            files: result.metrics.files,
            lines: result.metrics.lines,
            tokens: result.metrics.tokens,
            clones: result.metrics.clones,
            duplicatedLines: result.metrics.duplicatedLines,
            duplicatedTokens: result.metrics.duplicatedTokens,
            percentage: result.metrics.percentage,
            percentageTokens: result.metrics.percentageTokens,
            deltaDuplicatedLines: comparison.deltas?.duplicatedLines ?? null,
            deltaDuplicatedTokens: comparison.deltas?.duplicatedTokens ?? null,
            deltaLinePercentagePoints: comparison.deltas?.linePercentagePoints ?? null,
            deltaTokenPercentagePoints: comparison.deltas?.tokenPercentagePoints ?? null,
          }
          : { applicationOccurrencePairs: report.attributedResults.find((entry) => entry.scopeName === result.scopeName)?.occurrencePairs ?? 0 },
        newFindings: scope === "all" ? result.metrics.newClones : result.applicationComparison.newFingerprints.length,
        resolvedFindings: null,
        historicalFindings: scope === "all" ? scopeBaseline.fingerprints : null,
        baseline: {
          sourceCommit: report.baseline.sourceCommit,
          tool: report.baseline.tool,
          toolVersion: report.baseline.toolVersion,
          policyFingerprint: report.baseline.policyFingerprint,
        },
        details: { failures: comparison.failures, toolVersion: report.toolVersion, attribution: report.attributedResults.find((entry) => entry.scopeName === result.scopeName) },
      });
    }
    if (report.publicationDirectory) {
      const publication = writeDuplicationPublicationProof({
        repositoryRoot,
        candidateSha,
        results: report.results,
        baseline: report.baseline,
        justificationReport: report.justificationReport,
        toolVersion: report.toolVersion,
        publicationRoot: path.dirname(path.dirname(report.publicationDirectory)),
        runId: path.basename(report.publicationDirectory),
      });
      console.log(`DUPLICATION_PUBLICATION_PROOF_WRITTEN: ${publication.proofPath}`);
    }
    console.log(formatDuplicationReport({ ...report, scope }));
    const statuses = report.results.map((result) => (scope === "all" ? result.comparison.status : result.applicationComparison.status));
    const status = statuses.includes("FAIL") || (scope === "all" && report.justificationReport.stale.length > 0)
      ? "FAIL"
      : statuses.includes("PASS_WITH_GRACE")
        ? "PASS_WITH_GRACE"
        : "PASS";
    console.log(`DUPLICATION_STATUS: ${status}`);
    if (status === "FAIL") {
      const failures = [
        ...report.results.flatMap((result) => result.comparison.failures),
        ...(scope === "all" ? report.justificationReport.stale.map((identity) => `stale durable justification (${identity})`) : []),
      ];
      console.error(`FAIL: ${failures.length} duplication ratchet violation(s).`);
      process.exitCode = 1;
      return;
    }
    console.log(status === "PASS_WITH_GRACE"
      ? "PASS_WITH_GRACE: duplication remains within the historical grace envelope."
      : "PASS: historical duplication is stable within the strict baseline.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
