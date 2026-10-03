#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { COVERAGE_SCOPE_FINGERPRINT } from "./coverage-policy.mjs";
import {
  createCandidateFingerprint,
  getWorktreeCandidateFiles,
} from "../ci/validation-evidence.mjs";

const COVERAGE_EVIDENCE_VERSION = 1;
export const COVERAGE_SUMMARY_RELATIVE_PATH = path.join("apps", "web", "coverage", "coverage-summary.json");
export const COVERAGE_EVIDENCE_RELATIVE_PATH = path.join("apps", "web", "coverage", "coverage-evidence.json");

const CONFIGURATION_FILES = Object.freeze([
  "apps/web/vitest.config.ts",
  "apps/web/package.json",
  "package.json",
  "package-lock.json",
  "scripts/checks/coverage-policy.mjs",
  "scripts/checks/check-coverage.mjs",
  "scripts/checks/coverage-evidence.mjs",
]);

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

function gitHead(repositoryRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
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
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function hashConfiguration(repositoryRoot) {
  const hash = createHash("sha256");
  for (const relativePath of CONFIGURATION_FILES) {
    hash.update(`FILE:${relativePath}\n`);
    hash.update(fs.readFileSync(repositoryPath(repositoryRoot, relativePath)));
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

function canonicalSummary(summary, repositoryRoot) {
  const absoluteRoot = path.resolve(repositoryRoot).replaceAll("\\", "/");
  const replaceRoot = (value) => typeof value === "string"
    ? value.replaceAll("\\", "/").replaceAll(absoluteRoot, "<repository>")
    : value;
  const normalize = (value) => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
    }
    return replaceRoot(value);
  };
  return normalize(summary);
}

function summaryHash(summary, repositoryRoot) {
  return hashJson(canonicalSummary(summary, repositoryRoot));
}

function expectedEvidence(repositoryRoot, summary) {
  const candidateFingerprint = createCandidateFingerprint({
    repositoryRoot,
    candidateScope: "WORKTREE",
    changedFiles: getWorktreeCandidateFiles(repositoryRoot),
  });
  const environment = environmentDescriptor();
  return {
    schemaVersion: COVERAGE_EVIDENCE_VERSION,
    kind: "cleanmymap-web-coverage",
    candidateFingerprint,
    gitHead: gitHead(repositoryRoot),
    scope: "web",
    scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
    configurationFingerprint: hashConfiguration(repositoryRoot),
    environmentFingerprint: hashJson(environment),
    summarySha256: summaryHash(summary, repositoryRoot),
    summaryPath: COVERAGE_SUMMARY_RELATIVE_PATH.replaceAll("\\", "/"),
  };
}

export function writeCoverageEvidence({ repositoryRoot = process.cwd() } = {}) {
  const summaryPath = repositoryPath(repositoryRoot, COVERAGE_SUMMARY_RELATIVE_PATH.replaceAll("\\", "/"));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const evidence = {
    ...expectedEvidence(repositoryRoot, summary),
    createdAt: new Date().toISOString(),
  };
  const evidencePath = repositoryPath(repositoryRoot, COVERAGE_EVIDENCE_RELATIVE_PATH.replaceAll("\\", "/"));
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`COVERAGE_EVIDENCE_WRITTEN: ${evidencePath}`);
  console.log(`COVERAGE_CANDIDATE: ${evidence.candidateFingerprint}`);
  return evidence;
}
export function validateCoverageEvidence({ repositoryRoot = process.cwd() } = {}) {
  const summaryPath = repositoryPath(repositoryRoot, COVERAGE_SUMMARY_RELATIVE_PATH.replaceAll("\\", "/"));
  const evidencePath = repositoryPath(repositoryRoot, COVERAGE_EVIDENCE_RELATIVE_PATH.replaceAll("\\", "/"));
  let evidence;
  let summary;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (error) {
    throw new Error(`Coverage evidence incomplete or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const expected = expectedEvidence(repositoryRoot, summary);
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
    "candidateFingerprint",
  ]) {
    if (evidence[field] !== expected[field]) {
      throw new Error(`Coverage evidence mismatch: ${field}. Re-run npm run test:coverage for this candidate/configuration.`);
    }
  }
  if (!summary?.total || typeof summary.total !== "object") {
    throw new Error("Coverage evidence summary is incomplete: total metrics are missing.");
  }
  return evidence;
}
