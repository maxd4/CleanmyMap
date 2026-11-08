#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { gitExecutable } from "./git-executable.mjs";
import { isWebRelevantFile } from "../checks/validation-policy.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const CANONICAL_REPOSITORY = "maxd4/CleanmyMap";

function git(repositoryRoot, args, { allowFailure = false } = {}) {
  try {
    return execFileSync(gitExecutable(), args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", allowFailure ? "pipe" : "inherit"],
    }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function listDiffFiles(repositoryRoot, baseSha, candidateSha) {
  return git(repositoryRoot, ["diff", "--name-only", `${baseSha}..${candidateSha}`, "--"])
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en"));
}

function isUnsupportedDeployPath(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/mobile/")
    || normalized.startsWith("maintenance/python/")
    || normalized.startsWith(".github/")
    || normalized.startsWith("e2e/");
}

function isSmokeRelevantPath(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/web/src/app/api/")
    || normalized === "apps/web/vercel.json"
    || normalized === "apps/web/scripts/smoke-tests.mjs";
}

export function resolveDeployCandidate({
  repositoryRoot,
  candidateSha,
  baseRef = "origin/main",
} = {}) {
  const currentSha = git(repositoryRoot, ["rev-parse", "HEAD"], { allowFailure: true });
  const requestedSha = candidateSha || currentSha;
  const result = {
    candidateSha: requestedSha,
    currentSha,
    candidateTreeSha: "",
    baseRef,
    baseSha: "",
    changedFiles: [],
    webChangedFiles: [],
    unsupportedFiles: [],
    smokeRelevant: false,
    worktreeClean: false,
    repository: "",
    branch: "",
    originVerified: false,
    valid: false,
    reason: "DEPLOY_SCOPE_NOT_ESTABLISHED",
  };

  if (!SHA_PATTERN.test(requestedSha) || requestedSha !== currentSha) {
    result.reason = "DEPLOY_CANDIDATE_SHA_MISMATCH";
    return result;
  }

  result.candidateTreeSha = git(repositoryRoot, ["rev-parse", `${requestedSha}^{tree}`], { allowFailure: true });
  if (!SHA_PATTERN.test(result.candidateTreeSha)) {
    result.reason = "DEPLOY_CANDIDATE_TREE_UNVERIFIED";
    return result;
  }

  result.worktreeClean = git(repositoryRoot, ["status", "--porcelain", "--untracked-files=all"], { allowFailure: true }) === "";
  if (!result.worktreeClean) {
    result.reason = "DEPLOY_WORKTREE_NOT_CLEAN";
    return result;
  }

  result.branch = git(repositoryRoot, ["branch", "--show-current"], { allowFailure: true });
  const origin = git(repositoryRoot, ["remote", "get-url", "origin"], { allowFailure: true });
  const repositoryMatch = origin.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i);
  result.repository = repositoryMatch?.[1] ?? "";
  if (result.repository !== CANONICAL_REPOSITORY || result.branch !== "main") {
    result.reason = "DEPLOY_PROVENANCE_UNVERIFIED";
    return result;
  }

  result.baseSha = git(repositoryRoot, ["rev-parse", "--verify", `${baseRef}^{commit}`], { allowFailure: true });
  if (!SHA_PATTERN.test(result.baseSha)) {
    result.reason = "DEPLOY_BASE_REF_UNVERIFIED";
    return result;
  }

  try {
    execFileSync(gitExecutable(), ["merge-base", "--is-ancestor", result.baseSha, requestedSha], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    result.reason = "DEPLOY_BASE_NOT_ANCESTOR";
    return result;
  }

  result.changedFiles = listDiffFiles(repositoryRoot, result.baseSha, requestedSha);
  result.webChangedFiles = result.changedFiles.filter(isWebRelevantFile);
  result.unsupportedFiles = result.changedFiles.filter(isUnsupportedDeployPath);
  result.smokeRelevant = result.changedFiles.some(isSmokeRelevantPath);
  if (result.changedFiles.length === 0) {
    result.reason = "DEPLOY_NO_EXPLOITABLE_DIFF";
    return result;
  }
  if (result.unsupportedFiles.length > 0) {
    result.reason = "DEPLOY_SCOPE_NOT_WEB_ONLY";
    return result;
  }
  if (result.webChangedFiles.length === 0) {
    result.reason = "DEPLOY_NO_WEB_DIFF";
    return result;
  }

  result.originVerified = true;
  result.valid = true;
  result.reason = "DEPLOY_SCOPE_VERIFIED";
  return result;
}

export function printDeployCandidateResult(result, { log = console.log, error = console.error } = {}) {
  log(`DEPLOY_CANDIDATE_SHA: ${result.candidateSha || "MISSING"}`);
  log(`DEPLOY_BASE_REF: ${result.baseRef || "MISSING"}`);
  log(`DEPLOY_BASE_SHA: ${result.baseSha || "MISSING"}`);
  log(`DEPLOY_CHANGED_FILES: ${result.changedFiles.length}`);
  log(`DEPLOY_WEB_CHANGED_FILES: ${result.webChangedFiles.length}`);
  log(`DEPLOY_WORKTREE_CLEAN: ${result.worktreeClean ? "yes" : "no"}`);
  log(`DEPLOY_SCOPE_STATUS: ${result.reason}`);
  if (!result.valid) {
    error(`CONTROL_STATUS: BLOCKED_DECISION`);
    error(`DEPLOY_SCOPE_ERROR: ${result.reason}`);
    if (result.unsupportedFiles.length > 0) error(`DEPLOY_UNSUPPORTED_FILES: ${result.unsupportedFiles.join(", ")}`);
  }
  return result.valid;
}
