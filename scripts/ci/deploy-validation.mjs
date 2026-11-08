#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gitExecutable } from "./git-executable.mjs";
import {
  dependencyGraphSnapshotsEqual,
  isDependencyAuditRelevantFile,
  isWebRelevantFile,
} from "../checks/validation-policy.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const CANONICAL_REPOSITORY = "maxd4/CleanmyMap";
const DEPLOYMENT_REFERENCE_VERSION = 1;
const VERCEL_API_BASE = "https://api.vercel.com";

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

function readGitFile(repositoryRoot, sha, file) {
  return git(repositoryRoot, ["show", `${sha}:${file}`], { allowFailure: true });
}

function isPackageManifest(file) {
  return /(^|\/)package\.json$/.test(normalizePath(file));
}

function isLockfile(file) {
  return /(^|\/)package-lock\.json$/.test(normalizePath(file));
}

function isWebDependencyManifest(file) {
  const normalized = normalizePath(file);
  return normalized === "package.json" || normalized === "apps/web/package.json";
}

export function resolveDependencyGraphChange({ repositoryRoot, baseSha, candidateSha, changedFiles = null } = {}) {
  const files = changedFiles ?? listDiffFiles(repositoryRoot, baseSha, candidateSha);
  const manifestFiles = files.filter(isPackageManifest);
  const lockfileFiles = files.filter(isLockfile);
  const changedManifestFiles = manifestFiles.filter((file) => {
    const before = readGitFile(repositoryRoot, baseSha, file);
    const after = readGitFile(repositoryRoot, candidateSha, file);
    return !dependencyGraphSnapshotsEqual(before, after);
  });
  const graphChanged = lockfileFiles.length > 0 || changedManifestFiles.length > 0;
  const webGraphChanged = lockfileFiles.length > 0
    || changedManifestFiles.some(isWebDependencyManifest)
    || files.some(isDependencyAuditRelevantFile);
  return {
    graphChanged,
    webGraphChanged,
    lockfileChanged: lockfileFiles.length > 0,
    manifestFiles,
    changedManifestFiles,
    lockfileFiles,
  };
}

function isUnsupportedDeployPath(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("maintenance/python/")
    || normalized.startsWith(".github/")
    || normalized.startsWith("e2e/");
}

function isSharedWebContractPath(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("packages/")
    || normalized.startsWith("shared/")
    || normalized.startsWith("src/shared/");
}

function normalizePublicationReference({ publicationReference, deploymentReference, deploymentProof } = {}) {
  const source = publicationReference ?? deploymentReference;
  const proof = source?.proof ?? deploymentProof ?? (source && typeof source === "object" ? source : null);
  const sha = source?.sha ?? source?.commitSha ?? source?.gitCommitSha
    ?? proof?.sha ?? proof?.commitSha ?? proof?.gitCommitSha ?? "";
  if (!proof || typeof proof !== "object") return null;
  const proofSha = proof.sha ?? proof.commitSha ?? proof.gitCommitSha ?? "";
  return {
    version: Number(proof.version ?? DEPLOYMENT_REFERENCE_VERSION),
    sha,
    proofSha,
    provider: proof.provider ?? proof.source ?? "",
    projectName: proof.projectName ?? "",
    rootDirectory: proof.rootDirectory ?? "",
    target: proof.target ?? proof.environment ?? "",
    projectId: proof.projectId ?? "",
    deploymentId: proof.deploymentId ?? proof.deploymentUid ?? proof.uid ?? "",
    productionAlias: proof.productionAlias ?? proof.alias ?? "",
    verified: proof.verified === true,
    verificationMethod: proof.verificationMethod ?? "",
    vercelInspection: proof.vercelInspection ?? null,
  };
}

function readLinkedVercelProject(repositoryRoot) {
  for (const candidate of [
    path.join(repositoryRoot, "apps", "web", ".vercel", "project.json"),
    path.join(repositoryRoot, ".vercel", "project.json"),
  ]) {
    try {
      const project = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (project?.projectId) return project;
    } catch {
      // The authenticated API remains the source of truth; a missing local link blocks DEPLOY.
    }
  }
  return null;
}

function vercelQuery(teamId) {
  return teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
}

async function fetchVercelJson(fetchImpl, url, token) {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Vercel API ${response.status} ${response.statusText}`);
  return response.json();
}

export async function inspectVercelProduction({
  repositoryRoot,
  proof,
  fetchImpl = globalThis.fetch,
  token = process.env.VERCEL_TOKEN?.trim() || "",
  projectId = process.env.VERCEL_PROJECT_ID?.trim() || readLinkedVercelProject(repositoryRoot)?.projectId || "",
  teamId = process.env.VERCEL_ORG_ID?.trim() || readLinkedVercelProject(repositoryRoot)?.orgId || "",
} = {}) {
  if (!token || typeof fetchImpl !== "function" || !projectId || !proof?.deploymentId || !proof?.productionAlias) {
    return { valid: false, reason: "DEPLOY_VERCEL_AUTH_UNAVAILABLE" };
  }
  try {
    const expectedSha = proof.sha ?? proof.commitSha ?? proof.gitCommitSha ?? "";
    const query = vercelQuery(teamId);
    const project = await fetchVercelJson(fetchImpl, `${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(projectId)}?${query.slice(1)}`, token);
    const deployment = await fetchVercelJson(fetchImpl, `${VERCEL_API_BASE}/v13/deployments/${encodeURIComponent(proof.deploymentId)}?${query.slice(1)}`, token);
    const aliases = await fetchVercelJson(fetchImpl, `${VERCEL_API_BASE}/v2/deployments/${encodeURIComponent(proof.deploymentId)}/aliases?${query.slice(1)}`, token);
    const repository = project.link?.org && project.link?.repo ? `${project.link.org}/${project.link.repo}` : "";
    const gitSha = deployment.gitSource?.sha ?? deployment.meta?.githubCommitSha ?? deployment.meta?.gitCommitSha ?? "";
    const aliasNames = (Array.isArray(aliases) ? aliases : aliases.aliases ?? []).map((alias) => typeof alias === "string" ? alias : alias?.alias).filter(Boolean);
    const inspection = {
      verified: project.id === projectId
        && project.name === "web"
        && project.settings?.rootDirectory === "apps/web"
        && repository === CANONICAL_REPOSITORY
        && deployment.id === proof.deploymentId
        && deployment.target === "production"
        && deployment.readyState === "READY"
        && gitSha === expectedSha
        && aliasNames.includes(proof.productionAlias),
      projectId: project.id ?? "",
      projectName: project.name ?? "",
      rootDirectory: project.settings?.rootDirectory ?? "",
      repository,
      deploymentId: deployment.id ?? deployment.uid ?? "",
      target: deployment.target ?? "",
      readyState: deployment.readyState ?? "",
      gitSha,
      productionAlias: proof.productionAlias,
      aliases: aliasNames,
      verificationMethod: "vercel-api-readonly",
    };
    return inspection.verified
      ? { valid: true, inspection }
      : { valid: false, inspection, reason: "DEPLOY_VERCEL_PROVENANCE_MISMATCH" };
  } catch (error) {
    return {
      valid: false,
      reason: "DEPLOY_VERCEL_VERIFICATION_UNAVAILABLE",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function verifyPublicationReference({
  repositoryRoot,
  candidateSha,
  baseRef,
  publicationReference,
  deploymentReference,
  deploymentProof,
  vercelClient,
} = {}) {
  const reference = normalizePublicationReference({ publicationReference, deploymentReference, deploymentProof });
  if (!reference || !SHA_PATTERN.test(reference.sha)) {
    return { valid: false, reference, reason: "DEPLOY_PUBLICATION_REFERENCE_UNVERIFIED" };
  }
  if (
    reference.version !== DEPLOYMENT_REFERENCE_VERSION
    || reference.provider !== "vercel"
    || reference.projectName !== "web"
    || reference.rootDirectory !== "apps/web"
    || reference.target !== "production"
    || reference.proofSha !== reference.sha
    || reference.verified !== true
    || !reference.verificationMethod
    || !reference.deploymentId
    || !reference.productionAlias
  ) {
    return { valid: false, reference, reason: "DEPLOY_PUBLICATION_PROOF_INVALID" };
  }
  const vercel = vercelClient
    ? await vercelClient({ repositoryRoot, proof: reference })
    : await inspectVercelProduction({ repositoryRoot, proof: reference });
  if (!vercel.valid) {
    return { valid: false, reference, reason: vercel.reason ?? "DEPLOY_VERCEL_VERIFICATION_UNAVAILABLE" };
  }
  reference.vercelInspection = vercel.inspection;
  const resolvedBaseSha = git(repositoryRoot, ["rev-parse", "--verify", `${reference.sha}^{commit}`], { allowFailure: true });
  if (resolvedBaseSha !== reference.sha) {
    return { valid: false, reference, reason: "DEPLOY_PUBLICATION_SHA_UNVERIFIED" };
  }
  if (baseRef && baseRef !== reference.sha && baseRef !== reference.ref) {
    return { valid: false, reference, reason: "DEPLOY_BASE_REF_NOT_PUBLICATION_REFERENCE" };
  }
  try {
    execFileSync(gitExecutable(), ["merge-base", "--is-ancestor", reference.sha, candidateSha], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    return { valid: false, reference, reason: "DEPLOY_PUBLICATION_NOT_ANCESTOR" };
  }
  return { valid: true, reference, reason: "DEPLOY_PUBLICATION_REFERENCE_VERIFIED" };
}

function isSmokeRelevantPath(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/web/src/app/api/")
    || normalized === "apps/web/vercel.json"
    || normalized === "apps/web/scripts/smoke-tests.mjs";
}

export async function resolveDeployCandidate({
  repositoryRoot,
  candidateSha,
  baseRef = "",
  publicationReference = null,
  deploymentReference = null,
  deploymentProof = null,
  vercelClient,
} = {}) {
  const currentSha = git(repositoryRoot, ["rev-parse", "HEAD"], { allowFailure: true });
  const requestedSha = candidateSha || currentSha;
  const result = {
    candidateSha: requestedSha,
    currentSha,
    candidateTreeSha: "",
    baseRef: baseRef || "",
    baseSha: "",
    changedFiles: [],
    webChangedFiles: [],
    unsupportedFiles: [],
    mobileChangedFiles: [],
    sharedChangedFiles: [],
    smokeRelevant: false,
    dependencyGraphChanged: false,
    dependencyGraph: null,
    publicationReference: null,
    scopeComplete: false,
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

  const publication = verifyPublicationReference({
    repositoryRoot,
    candidateSha: requestedSha,
    baseRef,
    publicationReference,
    deploymentReference,
    deploymentProof,
    vercelClient,
  });
  const verifiedPublication = await publication;
  result.publicationReference = verifiedPublication.reference;
  if (!verifiedPublication.valid) {
    result.reason = verifiedPublication.reason;
    return result;
  }
  result.baseSha = verifiedPublication.reference.sha;
  result.baseRef = verifiedPublication.reference.sha;

  result.changedFiles = listDiffFiles(repositoryRoot, result.baseSha, requestedSha);
  result.webChangedFiles = result.changedFiles.filter((file) => isWebRelevantFile(file) || isSharedWebContractPath(file));
  result.unsupportedFiles = result.changedFiles.filter(isUnsupportedDeployPath);
  result.mobileChangedFiles = result.changedFiles.filter((file) => normalizePath(file).startsWith("apps/mobile/"));
  result.sharedChangedFiles = result.changedFiles.filter(isSharedWebContractPath);
  result.smokeRelevant = result.changedFiles.some(isSmokeRelevantPath);
  result.dependencyGraph = resolveDependencyGraphChange({
    repositoryRoot,
    baseSha: result.baseSha,
    candidateSha: requestedSha,
    changedFiles: result.changedFiles,
  });
  result.dependencyGraphChanged = result.dependencyGraph.webGraphChanged;
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
  result.scopeComplete = true;
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
  log(`DEPLOY_PUBLICATION_REFERENCE: ${result.publicationReference?.sha || "MISSING"}`);
  log(`DEPLOY_WORKTREE_CLEAN: ${result.worktreeClean ? "yes" : "no"}`);
  log(`DEPLOY_SCOPE_STATUS: ${result.reason}`);
  if (!result.valid) {
    error(`CONTROL_STATUS: BLOCKED_DECISION`);
    error(`DEPLOY_SCOPE_ERROR: ${result.reason}`);
    if (result.unsupportedFiles.length > 0) error(`DEPLOY_UNSUPPORTED_FILES: ${result.unsupportedFiles.join(", ")}`);
  }
  return result.valid;
}
