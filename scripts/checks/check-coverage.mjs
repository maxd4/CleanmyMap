#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateCoverageEvidence } from "./coverage-evidence.mjs";
import {
  aggregateCoverage,
  assertBaselineFresh,
  compareCoverage,
  formatCoverageGrace,
  getDefaultCoveragePaths,
  loadCoverageBaseline,
  loadCoverageSummary,
} from "./coverage-policy.mjs";

function printMetrics(current) {
  console.log(
    `Coverage observed: statements ${current.metrics.statements.pct}%, branches ${current.metrics.branches.pct}%, functions ${current.metrics.functions.pct}%, lines ${current.metrics.lines.pct}%.`,
  );
}

export function runCoverageCheck({
  scope = "web",
  repositoryRoot = process.cwd(),
  paths = getDefaultCoveragePaths(repositoryRoot, scope),
  fromExistingSummary = false,
  validateEvidence = validateCoverageEvidence,
  currentCommit = null,
} = {}) {
  if (fromExistingSummary) {
    validateEvidence({ repositoryRoot });
    console.log(`ALREADY_PROVEN: ${scope} coverage summary`);
    console.log(`REUSED_EVIDENCE_SOURCE: ${scope === "mobile" ? "apps/mobile/coverage" : "apps/web/coverage/coverage-evidence.json"}`);
  }

  const current = aggregateCoverage(loadCoverageSummary(paths.summary), { scope });
  console.log(`COVERAGE_SCOPE: ${scope}`);

  let baseline;
  try {
    baseline = loadCoverageBaseline(paths.baseline);
    assertBaselineFresh(baseline, { currentCommit, scope });
  } catch (error) {
    console.warn("COVERAGE_COMPARISON_STATUS: UNAVAILABLE");
    console.warn(`COVERAGE_COMPARISON_REASON: ${error instanceof Error ? error.message : String(error)}`);
    printMetrics(current);
    return { status: "UNAVAILABLE", current, failures: [], grace: [] };
  }

  const comparison = compareCoverage(current, baseline);
  console.log(`COVERAGE_STATUS: ${comparison.status}`);
  for (const grace of comparison.grace) console.log(formatCoverageGrace(grace));

  if (comparison.failures.length > 0) {
    console.warn("Coverage regression (informational):");
    for (const failure of comparison.failures) {
      console.warn(
        `- ${failure.scope}.${failure.metric} decreased from ${failure.baseline.toFixed(2)}% to ${failure.current.toFixed(2)}% (drop ${failure.drop.toFixed(2)}pp > allowed ${failure.allowed.toFixed(2)}pp).`,
      );
    }
  }

  printMetrics(current);
  return { ...comparison, current, baseline };
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const scope = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ?? "web";
  const fromExistingSummary = process.argv.includes("--from-existing-summary");

  try {
    runCoverageCheck({ scope, fromExistingSummary });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
