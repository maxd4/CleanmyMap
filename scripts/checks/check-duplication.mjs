#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildJscpdArguments,
  compareDuplicationMetrics,
  DUPLICATION_SCOPES,
  nativeBaselineFingerprintCount,
  readJscpdFingerprints,
  readJscpdMetrics,
  validateDuplicationJustificationsRegistry,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";
import { resolveCandidateSha, writeQualityEvidence } from "./quality-evidence.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const metricsBaselinePath = path.join(repositoryRoot, "scripts", "checks", "duplication-metrics-baseline.json");
const nativeBaselineDirectory = path.join(repositoryRoot, "scripts", "checks");
const justificationsPath = path.join(nativeBaselineDirectory, "duplication-justifications.json");

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function assertBaselineFresh(baseline) {
  validateDuplicationMetricsBaseline(baseline);
  const head = git(["rev-parse", "HEAD"]);
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error(`duplication baseline stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
}

function runScope(scopeName, baseline) {
  const baselineFileName = scopeName === "fixtures/data" ? "duplication-data-baseline.json" : `duplication-${scopeName}-baseline.json`;
  const nativeBaselinePath = path.join(nativeBaselineDirectory, baselineFileName);
  if (!fs.existsSync(nativeBaselinePath)) throw new Error(`duplication baseline missing: ${nativeBaselinePath}`);
  const nativeBaseline = JSON.parse(fs.readFileSync(nativeBaselinePath, "utf8"));
  nativeBaselineFingerprintCount(nativeBaseline);

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-jscpd-"));
  try {
    const runner = path.join(repositoryRoot, "node_modules", "jscpd", "run-jscpd.js");
    if (!fs.existsSync(runner)) throw new Error("HOST_ENVIRONMENT: jscpd 5.3.0 is not installed.");
    const result = spawnSync(process.execPath, [runner, ...buildJscpdArguments(scopeName, nativeBaselinePath, outputDirectory, "json,sarif")], {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    const reportPath = path.join(outputDirectory, "jscpd-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`jscpd report missing for ${scopeName}: ${result.stderr || result.stdout || "no output"}`);
    }
    const metrics = readJscpdMetrics(JSON.parse(fs.readFileSync(reportPath, "utf8")));
    const sarifPath = path.join(outputDirectory, "jscpd-report.sarif");
    if (!fs.existsSync(sarifPath)) {
      throw new Error(`jscpd SARIF report missing for ${scopeName}.`);
    }
    const fingerprints = readJscpdFingerprints(JSON.parse(fs.readFileSync(sarifPath, "utf8")));
    const comparison = compareDuplicationMetrics(metrics, baseline.scopes[scopeName], scopeName);
    const failures = [...comparison.failures];
    if (result.status !== 0) failures.push(`jscpd execution failed (exit ${result.status})`);
    return {
      scopeName,
      metrics,
      fingerprints,
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

export function runDuplicationPolicy() {
  const baseline = JSON.parse(fs.readFileSync(metricsBaselinePath, "utf8"));
  assertBaselineFresh(baseline);
  const results = Object.keys(DUPLICATION_SCOPES).map((scopeName) => runScope(scopeName, baseline));
  if (!fs.existsSync(justificationsPath)) {
    throw new Error(`duplication justifications missing: ${justificationsPath}`);
  }
  const nativeBaselines = Object.fromEntries(Object.keys(DUPLICATION_SCOPES).map((scopeName) => {
    const fileName = scopeName === "fixtures/data" ? "duplication-data-baseline.json" : `duplication-${scopeName}-baseline.json`;
    return [scopeName, JSON.parse(fs.readFileSync(path.join(nativeBaselineDirectory, fileName), "utf8"))];
  }));
  const currentFingerprintsByScope = Object.fromEntries(results.map((result) => [result.scopeName, result.fingerprints]));
  const justifications = JSON.parse(fs.readFileSync(justificationsPath, "utf8"));
  const justificationReport = validateDuplicationJustificationsRegistry(justifications, {
    nativeBaselines,
    currentFingerprintsByScope,
  });
  return { baseline, results, justificationReport };
}

export function formatDuplicationReport({ results }) {
  const lines = [];
  for (const { scopeName, metrics, comparison } of results) {
    lines.push(`${scopeName}: ${metrics.clones} clones, ${metrics.duplicatedLines}/${metrics.lines} lines (${metrics.percentage.toFixed(2)}%), ${metrics.duplicatedTokens}/${metrics.tokens} tokens.`);
    lines.push(`  DUPLICATION_STATUS: ${comparison.status}`);
    lines.push(`  NEW_CLONE_FINGERPRINTS: ${metrics.newClones}`);
    lines.push(`  DUPLICATED_LINES_DELTA: ${comparison.deltas.duplicatedLines}`);
    lines.push(`  DUPLICATED_TOKENS_DELTA: ${comparison.deltas.duplicatedTokens}`);
    lines.push(`  LINE_PERCENTAGE_POINT_DELTA: ${comparison.deltas.linePercentagePoints.toFixed(6)}`);
    lines.push(`  TOKEN_PERCENTAGE_POINT_DELTA: ${comparison.deltas.tokenPercentagePoints.toFixed(6)}`);
    for (const failure of comparison.failures) lines.push(`  FAIL_REASON: ${failure}`);
  }
  return lines.join("\n");
}

async function main() {
  try {
    const report = runDuplicationPolicy();
    const candidateSha = resolveCandidateSha(repositoryRoot);
    for (const result of report.results) {
      const scopeBaseline = report.baseline.scopes[result.scopeName];
      const comparison = result.comparison;
      writeQualityEvidence({
        gate: "duplication",
        scope: result.scopeName,
        fileKey: `duplication-${result.scopeName}`.replaceAll("/", "-"),
        candidateSha,
        status: comparison.status,
        metrics: {
          files: result.metrics.files,
          lines: result.metrics.lines,
          tokens: result.metrics.tokens,
          clones: result.metrics.clones,
          duplicatedLines: result.metrics.duplicatedLines,
          duplicatedTokens: result.metrics.duplicatedTokens,
          percentage: result.metrics.percentage,
          percentageTokens: result.metrics.percentageTokens,
          deltaDuplicatedLines: comparison.deltas.duplicatedLines,
          deltaDuplicatedTokens: comparison.deltas.duplicatedTokens,
          deltaLinePercentagePoints: comparison.deltas.linePercentagePoints,
          deltaTokenPercentagePoints: comparison.deltas.tokenPercentagePoints,
        },
        newFindings: result.metrics.newClones,
        resolvedFindings: null,
        historicalFindings: scopeBaseline.fingerprints,
        baseline: {
          sourceCommit: report.baseline.sourceCommit,
          tool: report.baseline.tool,
          toolVersion: report.baseline.toolVersion,
          policyFingerprint: report.baseline.policyFingerprint,
        },
        details: { failures: comparison.failures },
      });
    }
    console.log(formatDuplicationReport(report));
    console.log(`KEEP_INTENTIONAL_RUNTIME: ${report.justificationReport.counts.runtime}`);
    console.log(`KEEP_INTENTIONAL_TESTS: ${report.justificationReport.counts.tests}`);
    console.log(`KEEP_INTENTIONAL_DATA: ${report.justificationReport.counts["fixtures/data"]}`);
    console.log("STALE_KEEP_INTENTIONAL: 0");
    const statuses = report.results.map((result) => result.comparison.status);
    const status = statuses.includes("FAIL")
      ? "FAIL"
      : statuses.includes("PASS_WITH_GRACE")
        ? "PASS_WITH_GRACE"
        : "PASS";
    console.log(`DUPLICATION_STATUS: ${status}`);
    if (status === "FAIL") {
      const failures = report.results.flatMap((result) => result.comparison.failures);
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
