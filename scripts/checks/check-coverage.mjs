#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateCoverageEvidence } from "./coverage-evidence.mjs";
import {
  COVERAGE_ENFORCEMENT_POLICY,
  aggregateCoverage,
  assertBaselineFresh,
  compareCoverage,
  evaluateCoveragePolicy,
  formatCoverageGrace,
  getDefaultCoveragePaths,
  loadCoverageBaseline,
  loadCoverageSummary,
  measureChangedLineCoverage,
  validateCoverageEnforcementPolicy,
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
  enforcementPolicy = COVERAGE_ENFORCEMENT_POLICY,
  baseRef = null,
  currentRef = "HEAD",
  setProcessExitCode = false,
} = {}) {
  validateCoverageEnforcementPolicy(enforcementPolicy);
  if (fromExistingSummary) {
    validateEvidence({ repositoryRoot });
    console.log(`ALREADY_PROVEN: ${scope} coverage summary`);
    console.log(`REUSED_EVIDENCE_SOURCE: ${scope === "mobile" ? "apps/mobile/coverage" : "apps/web/coverage/coverage-evidence.json"}`);
  }

  const current = aggregateCoverage(loadCoverageSummary(paths.summary), { scope });
  console.log(`COVERAGE_SCOPE: ${scope}`);

  const policy = evaluateCoveragePolicy(current, { scope, policy: enforcementPolicy });
  console.log(`COVERAGE_POLICY_STATUS: ${policy.status}`);
  for (const observation of policy.observations) {
    console.log(
      `COVERAGE_POLICY_OBSERVATION: ${observation.domain}.${observation.metric} `
      + `current=${observation.current.toFixed(2)}% target=${observation.target.toFixed(2)}% `
      + `gap=${observation.gapPp.toFixed(2)}pp state=${observation.state}`,
    );
  }
  for (const failure of policy.failures) {
    console.warn(`COVERAGE_POLICY_FAILURE: ${failure.code} ${failure.domain ?? scope}.${failure.metric ?? "scope"}`);
  }

  const changedLineCoverage = scope === "web"
    ? measureChangedLineCoverage({
      repositoryRoot,
      baseRef,
      currentRef,
      lcovPath: paths.lcov,
      scope,
      policyEntry: enforcementPolicy.scopes.web.changedLines,
    })
    : { status: "NOT_MEASURED", reason: "SCOPE_NOT_WEB", files: [], lines: null, provenance: { baseRef: null, currentRef: null } };
  console.log(`COVERAGE_CHANGED_LINES_STATUS: ${changedLineCoverage.status}`);
  if (changedLineCoverage.reason) console.log(`COVERAGE_CHANGED_LINES_REASON: ${changedLineCoverage.reason}`);
  if (changedLineCoverage.lines?.pct !== null && changedLineCoverage.lines?.pct !== undefined) {
    console.log(
      `COVERAGE_CHANGED_LINES_MEASURED: ${changedLineCoverage.lines.covered}/${changedLineCoverage.lines.total} `
      + `(${changedLineCoverage.lines.pct.toFixed(2)}%)`,
    );
  }

  let baseline;
  try {
    baseline = loadCoverageBaseline(paths.baseline);
    assertBaselineFresh(baseline, { currentCommit, scope });
  } catch (error) {
    console.warn("COVERAGE_COMPARISON_STATUS: UNAVAILABLE");
    console.warn(`COVERAGE_COMPARISON_REASON: ${error instanceof Error ? error.message : String(error)}`);
    printMetrics(current);
    if (setProcessExitCode && policy.status === "FAIL") process.exitCode = 1;
    return {
      status: "UNAVAILABLE",
      historicalStatus: "UNAVAILABLE",
      policyStatus: policy.status,
      policy,
      changedLineCoverage,
      current,
      failures: [],
      grace: [],
    };
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
  if (setProcessExitCode && policy.status === "FAIL") process.exitCode = 1;
  return {
    ...comparison,
    historicalStatus: comparison.status,
    policyStatus: policy.status,
    policy,
    changedLineCoverage,
    current,
    baseline,
  };
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const scope = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ?? "web";
  const fromExistingSummary = process.argv.includes("--from-existing-summary");
  const baseRef = process.argv.find((argument) => argument.startsWith("--base-ref="))?.slice("--base-ref=".length) ?? null;
  const currentRef = process.argv.find((argument) => argument.startsWith("--current-ref="))?.slice("--current-ref=".length) ?? "HEAD";

  try {
    runCoverageCheck({ scope, fromExistingSummary, baseRef, currentRef, setProcessExitCode: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
