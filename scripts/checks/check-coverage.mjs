#!/usr/bin/env node

import process from "node:process";
import {
  aggregateCoverage,
  assertBaselineFresh,
  compareCoverage,
  formatCoverageGrace,
  getDefaultCoveragePaths,
  loadCoverageBaseline,
  loadCoverageSummary,
} from "./coverage-policy.mjs";

const paths = getDefaultCoveragePaths();

try {
  const baseline = loadCoverageBaseline(paths.baseline);
  assertBaselineFresh(baseline);
  const current = aggregateCoverage(loadCoverageSummary(paths.summary));
  const comparison = compareCoverage(current, baseline);

  console.log(`COVERAGE_STATUS: ${comparison.status}`);
  for (const grace of comparison.grace) console.log(formatCoverageGrace(grace));

  if (comparison.status === "FAIL") {
    console.error("Coverage ratchet failed:");
    for (const failure of comparison.failures) {
      console.error(
        `- ${failure.scope}.${failure.metric} decreased from ${failure.baseline.toFixed(2)}% to ${failure.current.toFixed(2)}% (drop ${failure.drop.toFixed(2)}pp > allowed ${failure.allowed.toFixed(2)}pp).`,
      );
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Coverage ratchet passed: statements ${current.metrics.statements.pct}%, branches ${current.metrics.branches.pct}%, functions ${current.metrics.functions.pct}%, lines ${current.metrics.lines.pct}%.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
