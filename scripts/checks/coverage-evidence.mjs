#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  COVERAGE_SCOPE_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
} from "./coverage-policy.mjs";
import {
  createCandidateFingerprint,
  getWorktreeCandidateFiles,
} from "../ci/validation-evidence.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

const COVERAGE_EVIDENCE_VERSION = 2;
export const COVERAGE_SUMMARY_RELATIVE_PATH = path.join("apps", "web", "coverage", "coverage-summary.json");
export const COVERAGE_LCOV_RELATIVE_PATH = path.join("apps", "web", "coverage", "lcov.info");
export const MOBILE_COVERAGE_SUMMARY_RELATIVE_PATH = path.join("apps", "mobile", "coverage", "coverage-summary.json");
export const MOBILE_COVERAGE_LCOV_RELATIVE_PATH = path.join("apps", "mobile", "coverage", "lcov.info");
export const MOBILE_COVERAGE_EVIDENCE_RELATIVE_PATH = path.join("apps", "mobile", "coverage", "coverage-evidence.json");

const SCOPE_CONFIGURATION_FILES = Object.freeze({
  web: Object.freeze([
    "apps/web/vitest.config.ts",
    "apps/web/package.json",
    "package.json",
    "package-lock.json",
    "scripts/checks/coverage-policy.mjs",
    "scripts/checks/check-coverage.mjs",
    "scripts/checks/coverage-evidence.mjs",
  ]),
  mobile: Object.freeze([
    "apps/mobile/vitest.config.ts",
    "apps/mobile/package.json",
    "package.json",
    "package-lock.json",
    "scripts/checks/coverage-policy.mjs",
    "scripts/checks/check-coverage.mjs",
    "scripts/checks/coverage-evidence.mjs",
  ]),
});

const SCOPE_REPORTS = Object.freeze({
  web: Object.freeze({
    kind: "cleanmymap-web-coverage",
    scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
    summaryPath: COVERAGE_SUMMARY_RELATIVE_PATH,
    lcovPath: COVERAGE_LCOV_RELATIVE_PATH,
    evidencePath: path.join("apps", "web", "coverage", "coverage-evidence.json"),
  }),
  mobile: Object.freeze({
    kind: "cleanmymap-mobile-coverage",
    scopeFingerprint: MOBILE_COVERAGE_SCOPE_FINGERPRINT,
    summaryPath: MOBILE_COVERAGE_SUMMARY_RELATIVE_PATH,
    lcovPath: MOBILE_COVERAGE_LCOV_RELATIVE_PATH,
    evidencePath: MOBILE_COVERAGE_EVIDENCE_RELATIVE_PATH,
  }),
});

const RELEVANT_ENVIRONMENT_KEYS = Object.freeze([
  "CI",
  "NODE_ENV",
  "TZ",
  "LANG",
  "LC_ALL",
  "NODE_OPTIONS",
  "VITEST_POOL_SIZE",
  "VITEST_MAX_THREADS",
  "VITEST_MIN_THREADS",
]);

function repositoryPath(repositoryRoot, relativePath) {
  return path.join(repositoryRoot, ...relativePath.split("/"));
}

function scopeReport(scope) {
  const report = SCOPE_REPORTS[scope];
  if (!report) throw new Error(`Coverage evidence is not implemented for scope: ${scope}.`);
  return report;
}

function gitHead(repositoryRoot) {
  try {
    return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "NO_GIT_HEAD";
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort((left, right) => left.localeCompare(right, "en")).map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function readCandidateFile(repositoryRoot, relativePath, candidateRef = null) {
  if (candidateRef) {
    return execFileSync(gitExecutable(), ["show", `${candidateRef}:${relativePath}`], {
      cwd: repositoryRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    });
  }
  return fs.readFileSync(repositoryPath(repositoryRoot, relativePath));
}

export function computeConfigurationFingerprint({ repositoryRoot = process.cwd(), candidateRef = null, scope = "web" } = {}) {
  const configurationFiles = SCOPE_CONFIGURATION_FILES[scope];
  if (!configurationFiles) throw new Error(`Coverage evidence is not implemented for scope: ${scope}.`);
  const hash = createHash("sha256");
  for (const relativePath of configurationFiles) {
    hash.update(`FILE:${relativePath}\n`);
    hash.update(readCandidateFile(repositoryRoot, relativePath, candidateRef));
  }
  return hash.digest("hex");
}

function environmentDescriptor() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    values: Object.fromEntries(
      RELEVANT_ENVIRONMENT_KEYS
        .filter((key) => process.env[key] !== undefined)
        .map((key) => [key, createHash("sha256").update(String(process.env[key])).digest("hex")]),
    ),
  };
}

export function computeCoverageEnvironmentFingerprint() {
  return hashJson(environmentDescriptor());
}

function canonicalSummary(summary, repositoryRoot) {
  const absoluteRoot = path.resolve(repositoryRoot).replaceAll("\\", "/");
  const replaceRoot = (value) => typeof value === "string"
    ? value.replaceAll("\\", "/").replaceAll(absoluteRoot, "<repository>")
    : value;
  const normalize = (value) => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort((left, right) => left.localeCompare(right, "en")).map((key) => [key, normalize(value[key])]));
    }
    return replaceRoot(value);
  };
  return normalize(summary);
}

export function computeCoverageSummaryHash(summary, repositoryRoot) {
  return hashJson(canonicalSummary(summary, repositoryRoot));
}

export function computeCoverageFileHash(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function expectedEvidence(
  repositoryRoot,
  summary,
  {
    scope = "web",
    reportRoot = repositoryRoot,
    candidateRef = null,
    validateCandidateFingerprint = true,
  } = {},
) {
  const report = scopeReport(scope);
  const candidateFingerprint = createCandidateFingerprint({
    repositoryRoot,
    candidateScope: "WORKTREE",
    changedFiles: getWorktreeCandidateFiles(repositoryRoot),
  });
  const environment = environmentDescriptor();
  const lcovPath = repositoryPath(reportRoot, report.lcovPath.replaceAll("\\", "/"));
  return {
    schemaVersion: COVERAGE_EVIDENCE_VERSION,
    kind: report.kind,
    ...(validateCandidateFingerprint ? { candidateFingerprint } : {}),
    gitHead: candidateRef ?? gitHead(repositoryRoot),
    scope,
    scopeFingerprint: report.scopeFingerprint,
    configurationFingerprint: computeConfigurationFingerprint({ repositoryRoot, candidateRef, scope }),
    environmentFingerprint: hashJson(environment),
    summarySha256: computeCoverageSummaryHash(summary, reportRoot),
    summaryPath: report.summaryPath.replaceAll("\\", "/"),
    lcovSha256: computeCoverageFileHash(lcovPath),
    lcovPath: report.lcovPath.replaceAll("\\", "/"),
  };
}

export function writeCoverageEvidence({ repositoryRoot = process.cwd(), scope = "web" } = {}) {
  const report = scopeReport(scope);
  const summaryPath = repositoryPath(repositoryRoot, report.summaryPath.replaceAll("\\", "/"));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const evidence = {
    ...expectedEvidence(repositoryRoot, summary, { scope }),
    createdAt: new Date().toISOString(),
  };
  const evidencePath = repositoryPath(repositoryRoot, report.evidencePath.replaceAll("\\", "/"));
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`COVERAGE_EVIDENCE_WRITTEN: ${evidencePath}`);
  console.log(`COVERAGE_CANDIDATE: ${evidence.candidateFingerprint}`);
  return evidence;
}
export function validateCoverageEvidence({
  repositoryRoot = process.cwd(),
  scope = "web",
  expectedCandidateSha = null,
  requireCleanWorktree = false,
  reportRoot = repositoryRoot,
  candidateRef = null,
  validateCandidateFingerprint = true,
} = {}) {
  const report = scopeReport(scope);
  const summaryPath = repositoryPath(reportRoot, report.summaryPath.replaceAll("\\", "/"));
  const evidencePath = repositoryPath(reportRoot, report.evidencePath.replaceAll("\\", "/"));
  let evidence;
  let summary;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (error) {
    throw new Error(`Coverage evidence incomplete or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const expected = expectedEvidence(repositoryRoot, summary, {
    scope,
    reportRoot,
    candidateRef,
    validateCandidateFingerprint,
  });
  for (const field of [
    "schemaVersion",
    "kind",
    "gitHead",
    "scope",
    "scopeFingerprint",
    "configurationFingerprint",
    "environmentFingerprint",
    "summarySha256",
    "summaryPath",
    "lcovSha256",
    "lcovPath",
    ...(validateCandidateFingerprint ? ["candidateFingerprint"] : []),
  ]) {
    if (evidence[field] !== expected[field]) {
      throw new Error(`Coverage evidence mismatch: ${field}. Re-run npm run test:coverage for this candidate/configuration.`);
    }
  }
  if (expectedCandidateSha && evidence.gitHead !== expectedCandidateSha) {
    throw new Error(`Coverage evidence candidate mismatch: ${evidence.gitHead} !== ${expectedCandidateSha}.`);
  }
  if (requireCleanWorktree && getWorktreeCandidateFiles(repositoryRoot).length > 0) {
    throw new Error("Coverage evidence is tied to a dirty worktree and cannot prove the exact candidate tree.");
  }
  if (!summary?.total || typeof summary.total !== "object") {
    throw new Error("Coverage evidence summary is incomplete: total metrics are missing.");
  }
  return evidence;
}
