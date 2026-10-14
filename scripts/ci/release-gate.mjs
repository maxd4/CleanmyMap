#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "./git-executable.mjs";
import { createModeValidationPlan } from "./validation-modes.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CANONICAL_REPOSITORY = "maxd4/CleanmyMap";
const REQUIRED_FULL_CHECK_IDS = Object.freeze(
  createModeValidationPlan({ mode: "FULL", candidateScope: "WORKTREE", changedFiles: [] }).checks.map((check) => check.id),
);

function checkIds(entries) {
  return Array.isArray(entries)
    ? entries.map((entry) => (typeof entry === "string" ? entry : entry?.id)).filter(Boolean)
    : [];
}

function missingRequiredChecks(evidence, requiredChecks) {
  const completed = new Set([
    ...checkIds(evidence?.passed),
    ...checkIds(evidence?.reused),
  ]);
  return requiredChecks.filter((checkId) => !completed.has(checkId));
}

function currentSha() {
  return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function parseArgs(argv = []) {
  const shaArgument = argv.find((arg) => arg.startsWith("--sha="));
  const targetArgument = argv.find((arg) => arg.startsWith("--target="));
  return {
    sha: shaArgument?.slice("--sha=".length) || currentSha(),
    target: targetArgument?.slice("--target=".length) || "",
  };
}

function isClean() {
  return execFileSync(gitExecutable(), ["status", "--porcelain", "--untracked-files=all"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim() === "";
}

export function evaluateReleaseGate({
  evidence,
  current,
  clean,
  deploymentEnabled,
  provenance,
  requiredChecks = REQUIRED_FULL_CHECK_IDS,
}) {
  const validSha = (value) => /^[0-9a-f]{40}$/i.test(value ?? "");
  const missingChecks = missingRequiredChecks(evidence, requiredChecks);
  const evidenceMatches = Boolean(
    evidence
      && validSha(current)
      && validSha(evidence.candidateSha)
      && evidence.candidateSha === current
      && evidence.candidateSha === deploymentEnabled?.sha,
  );
  const fullGreen = Boolean(evidence?.mode === "FULL" && evidence.verdict === "PASS" && evidence.releaseReady === true
    && evidence.version === 2
    && evidence.candidateScope === "WORKTREE"
    && Array.isArray(evidence.passed)
    && Array.isArray(evidence.reused)
    && Array.isArray(evidence.failed) && evidence.failed.length === 0
    && Array.isArray(evidence.blocked) && evidence.blocked.length === 0
    && Array.isArray(evidence.notRun) && evidence.notRun.length === 0
    && Array.isArray(evidence.preexisting) && evidence.preexisting.length === 0
    && missingChecks.length === 0);
  const provenanceVerified = Boolean(
    provenance?.repository === CANONICAL_REPOSITORY
      && provenance.branch === "main"
      && provenance.originVerified === true
      && provenance.originMainSha === current,
  );
  const targetVerified = Boolean(
    deploymentEnabled?.main === false
      && deploymentEnabled.expectedTarget === "production"
      && deploymentEnabled.actualTarget === deploymentEnabled.expectedTarget
      && deploymentEnabled.projectName === "web"
      && deploymentEnabled.rootDirectory === "apps/web",
  );
  const ready = clean && evidenceMatches && fullGreen && provenanceVerified && targetVerified;
  return {
    ready,
    missingChecks,
    reasons: [
      !clean && "worktree is not clean",
      !evidenceMatches && "FULL evidence does not match the requested SHA",
      !fullGreen && "FULL evidence is not green",
      missingChecks.length > 0 && `FULL evidence is missing required checks: ${missingChecks.join(", ")}`,
      !provenanceVerified && "candidate provenance must match maxd4/CleanmyMap main at the candidate SHA",
      !targetVerified && "Vercel target must explicitly match expected production for project web, root apps/web, with Git deployment disabled",
    ].filter(Boolean),
  };
}

function readCandidateProvenance(candidateSha) {
  try {
    const origin = execFileSync(gitExecutable(), ["remote", "get-url", "origin"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
    const branch = execFileSync(gitExecutable(), ["branch", "--show-current"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
    const originMain = execFileSync(gitExecutable(), ["ls-remote", "origin", "refs/heads/main"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    const match = origin.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i);
    const repository = match?.[1] ?? "";
    const originMainSha = originMain.split(/\s+/)[0] ?? "";
    return {
      branch,
      repository,
      originMainSha,
      originVerified: repository === CANONICAL_REPOSITORY
        && branch === "main"
        && originMainSha === candidateSha,
    };
  } catch {
    return { branch: "", repository: "", originMainSha: "", originVerified: false };
  }
}

function readVercelPolicy(actualTarget) {
  const config = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "apps/web/vercel.json"), "utf8"));
  const deploymentEnabled = config.git?.deploymentEnabled;
  let project = null;
  try {
    project = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "apps/web/.vercel/project.json"), "utf8"));
  } catch {
    project = null;
  }
  return {
    main: deploymentEnabled === false ? false : deploymentEnabled?.main,
    expectedTarget: "production",
    actualTarget: actualTarget || "",
    projectName: project?.projectName,
    rootDirectory: project?.settings?.rootDirectory,
  };
}

function main() {
  const { sha, target } = parseArgs(process.argv.slice(2));
  const evidencePath = path.join(repositoryRoot, "artifacts", "validation", "full", `${sha}.json`);
  const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, "utf8")) : null;
  const current = currentSha();
  const vercelPolicy = readVercelPolicy(target);
  const result = evaluateReleaseGate({
    evidence,
    current,
    clean: isClean(),
    deploymentEnabled: { ...vercelPolicy, sha },
    provenance: readCandidateProvenance(sha),
  });

  console.log(`CANDIDATE_SHA: ${sha}`);
  console.log(`CURRENT_SHA: ${current}`);
  console.log(`FULL_EVIDENCE: ${evidence ? "FOUND" : "MISSING"}`);
  console.log(`VERCEL_EXPECTED_TARGET: ${vercelPolicy.expectedTarget}`);
  console.log(`VERCEL_ACTUAL_TARGET: ${target || "MISSING"}`);
  console.log(`RELEASE_READY: ${result.ready ? "YES" : "NO"}`);
  for (const reason of result.reasons) console.error(`BLOCKED_DECISION: ${reason}`);
  process.exitCode = result.ready ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
