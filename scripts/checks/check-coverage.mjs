#!/usr/bin/env node

import process from "node:process";
import {
  aggregateCoverage,
  assertBaselineFresh,
  compareCoverage,
  getDefaultCoveragePaths,
  loadCoverageBaseline,
  loadCoverageSummary,
} from "./coverage-policy.mjs";

const paths = getDefaultCoveragePaths();

try {
  const baseline = loadCoverageBaseline(paths.baseline);
  assertBaselineFresh(baseline);
  const current = aggregateCoverage(loadCoverageSummary(paths.summary));
  const failures = compareCoverage(current, baseline);

  if (failures.length > 0) {
    console.error("Coverage ratchet failed:");
    for (const failure of failures) console.error(`- ${failure}`);
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
