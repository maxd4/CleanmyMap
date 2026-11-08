#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "./git-executable.mjs";
import { resolveDeployCandidate } from "./deploy-validation.mjs";
import { createModeValidationPlan } from "./validation-modes.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CANONICAL_REPOSITORY = "maxd4/CleanmyMap";
const REQUIRED_FULL_CHECK_IDS = Object.freeze(
  createModeValidationPlan({ mode: "FULL", candidateScope: "WORKTREE", changedFiles: [] }).checks.map((check) => check.id),
);
const DEPLOY_VALIDATION_EVIDENCE_VERSION = 1;

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
  const profileArgument = argv.find((arg) => arg.startsWith("--profile="));
  return {
    sha: shaArgument?.slice("--sha=".length) || currentSha(),
    target: targetArgument?.slice("--target=".length) || "",
    profile: profileArgument?.slice("--profile=".length) || "full",
  };
}

function sameItems(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const leftSet = new Set(left);
  return leftSet.size === right.length && right.every((value) => leftSet.has(value));
}

function isVerifiedPublicationReference(reference, validSha) {
  return Boolean(
    reference
      && reference.version === 1
      && validSha(reference.sha)
      && reference.proofSha === reference.sha
      && reference.provider === "vercel"
      && reference.projectName === "web"
      && reference.rootDirectory === "apps/web"
      && reference.target === "production"
      && reference.verified === true
      && typeof reference.verificationMethod === "string"
      && reference.verificationMethod.length > 0
      && reference.deploymentId
      && reference.productionAlias
      && reference.vercelInspection?.verified === true
      && reference.vercelInspection.projectId === reference.projectId
      && reference.vercelInspection.projectName === "web"
      && reference.vercelInspection.rootDirectory === "apps/web"
      && reference.vercelInspection.repository === CANONICAL_REPOSITORY
      && reference.vercelInspection.deploymentId === reference.deploymentId
      && reference.vercelInspection.target === "production"
      && reference.vercelInspection.readyState === "READY"
      && reference.vercelInspection.gitSha === reference.sha
      && reference.vercelInspection.productionAlias === reference.productionAlias,
  );
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
  profile = "full",
  deployScope = null,
}) {
  const validSha = (value) => /^[0-9a-f]{40}$/i.test(value ?? "");
  const missingChecks = missingRequiredChecks(evidence, requiredChecks);
  const evidenceMatches = Boolean(
    evidence
      && validSha(current)
      && validSha(evidence.candidateSha)
      && validSha(evidence.completionSha)
      && evidence.candidateSha === current
      && evidence.completionSha === evidence.candidateSha
      && evidence.candidateSha === deploymentEnabled?.sha,
  );
  const fullGreen = Boolean(evidence?.mode === "FULL" && evidence.verdict === "PASS" && evidence.releaseReady === true
    && evidence.version === 2
    && evidence.candidateScope === "WORKTREE"
    && evidence.checkoutStable === true
    && evidence.attestationStatus === "ATTESTED_CANDIDATE"
    && evidence.completionFingerprint === evidence.candidateFingerprint
    && Array.isArray(evidence.passed)
    && Array.isArray(evidence.reused)
    && Array.isArray(evidence.failed) && evidence.failed.length === 0
    && Array.isArray(evidence.blocked) && evidence.blocked.length === 0
    && Array.isArray(evidence.notRun) && evidence.notRun.length === 0
    && Array.isArray(evidence.preexisting) && evidence.preexisting.length === 0
    && missingChecks.length === 0);
  const deployGreen = Boolean(evidence?.mode === "DEPLOY"
    && evidence.profile === "deploy"
    && evidence.version === DEPLOY_VALIDATION_EVIDENCE_VERSION
    && evidence.verdict === "PASS"
    && evidence.releaseReady === true
    && evidence.candidateScope === "WORKTREE"
    && evidence.checkoutStable === true
    && evidence.attestationStatus === "ATTESTED_CANDIDATE"
    && evidence.completionFingerprint === evidence.candidateFingerprint
    && Array.isArray(evidence.changedFiles)
    && evidence.changedFiles.length > 0
    && typeof evidence.baseRef === "string"
    && evidence.baseRef.length > 0
    && validSha(evidence.baseSha)
    && validSha(evidence.candidateTreeSha)
    && validSha(evidence.completionTreeSha)
    && evidence.candidateTreeSha === evidence.completionTreeSha
    && evidence.scopeEstablished === true
    && evidence.scopeComplete === true
    && isVerifiedPublicationReference(evidence.publicationReference, validSha)
    && evidence.publicationReference.sha === evidence.baseSha
    && sameItems(evidence.plannedChecks, requiredChecks)
    && Array.isArray(evidence.passed)
    && Array.isArray(evidence.reused)
    && Array.isArray(evidence.failed) && evidence.failed.length === 0
    && Array.isArray(evidence.blocked) && evidence.blocked.length === 0
    && Array.isArray(evidence.notRun) && evidence.notRun.length === 0
    && Array.isArray(evidence.preexisting) && evidence.preexisting.length === 0
    && deployScope?.valid === true
    && deployScope.candidateTreeSha === evidence.candidateTreeSha
    && deployScope.baseSha === evidence.baseSha
    && sameItems(deployScope.changedFiles, evidence.changedFiles));
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
  const selectedProfileValid = profile === "deploy" ? deployGreen : profile === "full" ? fullGreen : false;
  const ready = clean && evidenceMatches && selectedProfileValid && provenanceVerified && targetVerified;
  return {
    ready,
    missingChecks,
    reasons: [
      !clean && "worktree is not clean",
      !evidenceMatches && `${profile.toUpperCase()} evidence does not match the requested SHA`,
      !selectedProfileValid && `${profile.toUpperCase()} evidence is not green`,
      missingChecks.length > 0 && `${profile.toUpperCase()} evidence is missing required checks: ${missingChecks.join(", ")}`,
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

async function main() {
  const { sha, target, profile } = parseArgs(process.argv.slice(2));
  if (!["full", "deploy"].includes(profile)) {
    console.error(`Unsupported release profile: ${profile}`);
    process.exitCode = 1;
    return;
  }
  const evidencePath = path.join(repositoryRoot, "artifacts", "validation", profile === "deploy" ? "deploy" : "full", `${sha}.json`);
  const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, "utf8")) : null;
  const current = currentSha();
  const vercelPolicy = readVercelPolicy(target);
  const deployPlan = profile === "deploy" && evidence
    ? createModeValidationPlan({
      mode: "DEPLOY",
      candidateScope: "WORKTREE",
      candidateSha: sha,
      baseRef: evidence.baseRef,
      changedFiles: evidence.changedFiles,
      publicationReference: evidence.publicationReference,
      dependencyGraphChanged: evidence.dependencyGraphChanged === true,
    })
    : null;
  const deployScope = profile === "deploy" && evidence
    ? await resolveDeployCandidate({
      repositoryRoot,
      candidateSha: sha,
      baseRef: evidence.baseRef,
      publicationReference: evidence.publicationReference,
    })
    : null;
  const result = evaluateReleaseGate({
    evidence,
    current,
    clean: isClean(),
    deploymentEnabled: { ...vercelPolicy, sha },
    provenance: readCandidateProvenance(sha),
    profile,
    requiredChecks: deployPlan?.checks.map((check) => check.id),
    deployScope,
  });

  console.log(`RELEASE_PROFILE: ${profile}`);
  console.log(`CANDIDATE_SHA: ${sha}`);
  console.log(`CURRENT_SHA: ${current}`);
  console.log(`${profile.toUpperCase()}_EVIDENCE: ${evidence ? "FOUND" : "MISSING"}`);
  console.log(`VERCEL_EXPECTED_TARGET: ${vercelPolicy.expectedTarget}`);
  console.log(`VERCEL_ACTUAL_TARGET: ${target || "MISSING"}`);
  console.log(`RELEASE_READY: ${result.ready ? "YES" : "NO"}`);
  for (const reason of result.reasons) console.error(`BLOCKED_DECISION: ${reason}`);
  process.exitCode = result.ready ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
