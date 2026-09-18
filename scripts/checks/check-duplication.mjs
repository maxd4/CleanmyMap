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
  readJscpdMetrics,
  validateDuplicationMetricsBaseline,
} from "./duplication-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const metricsBaselinePath = path.join(repositoryRoot, "scripts", "checks", "duplication-metrics-baseline.json");
const nativeBaselineDirectory = path.join(repositoryRoot, "scripts", "checks");

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
  const expectedFingerprints = baseline.scopes[scopeName].fingerprints;
  const actualFingerprints = nativeBaselineFingerprintCount(nativeBaseline);
  if (actualFingerprints !== expectedFingerprints) {
    throw new Error(`duplication baseline mismatch for ${scopeName}: ${actualFingerprints} fingerprints, expected ${expectedFingerprints}.`);
  }

  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-jscpd-"));
  try {
    const runner = path.join(repositoryRoot, "node_modules", "jscpd", "run-jscpd.js");
    if (!fs.existsSync(runner)) throw new Error("HOST_ENVIRONMENT: jscpd 5.3.0 is not installed.");
    const result = spawnSync(process.execPath, [runner, ...buildJscpdArguments(scopeName, nativeBaselinePath, outputDirectory)], {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    const reportPath = path.join(outputDirectory, "jscpd-report.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error(`jscpd report missing for ${scopeName}: ${result.stderr || result.stdout || "no output"}`);
    }
    const metrics = readJscpdMetrics(JSON.parse(fs.readFileSync(reportPath, "utf8")));
    const failures = compareDuplicationMetrics(metrics, baseline.scopes[scopeName]);
    if (result.status !== 0) failures.push(`jscpd reported new clone fingerprints (exit ${result.status})`);
    return { scopeName, metrics, failures };
  } finally {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}

export function runDuplicationPolicy() {
  const baseline = JSON.parse(fs.readFileSync(metricsBaselinePath, "utf8"));
  assertBaselineFresh(baseline);
  const results = Object.keys(DUPLICATION_SCOPES).map((scopeName) => runScope(scopeName, baseline));
  return { baseline, results };
}

export function formatDuplicationReport({ results }) {
  const lines = [];
  for (const { scopeName, metrics, failures } of results) {
    lines.push(`${scopeName}: ${metrics.clones} clones, ${metrics.duplicatedLines}/${metrics.lines} lines (${metrics.percentage.toFixed(2)}%), ${metrics.duplicatedTokens}/${metrics.tokens} tokens.`);
    for (const failure of failures) lines.push(`FAIL ${scopeName}: ${failure}`);
  }
  return lines.join("\n");
}

async function main() {
  try {
    const report = runDuplicationPolicy();
    console.log(formatDuplicationReport(report));
    const failures = report.results.flatMap((result) => result.failures);
    if (failures.length > 0) {
      console.error(`FAIL: ${failures.length} duplication ratchet violation(s).`);
      process.exitCode = 1;
      return;
    }
    console.log("PASS: historical duplication is stable and no new clone or metric increase was detected.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
