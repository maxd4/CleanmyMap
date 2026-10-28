#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COVERAGE_ENFORCEMENT_POLICY,
  COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
  COVERAGE_SCOPE_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  classifyCoverageFile,
  getDefaultCoveragePaths,
  validateCoverageEnforcementPolicy,
} from "../checks/coverage-policy.mjs";
import { runCoverageCheck } from "../checks/check-coverage.mjs";
import { validateCoverageEvidence } from "../checks/coverage-evidence.mjs";
import {
  assertCoverageCandidateIdentity,
  getCoverageCandidateTreeSha,
  getCandidateSha,
  getWorktreeCandidateFiles,
} from "./validation-evidence.mjs";
import { assertSafeGitRef, gitExecutable } from "./git-executable.mjs";
import { assertSafeDirectoryRoot, assertSafeExternalPath, resolvePathWithinRoot } from "./safe-paths.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const PROOF_SCHEMA_VERSION = 1;
const PUBLICATION_ROOT = path.join("artifacts", "coverage-publication");

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeFiles(files = []) {
  return [...new Set(files.map(normalizePath).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
}

function isDocumentationFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("documentation/") || /\.(md|mdx)$/i.test(normalized);
}

function isWebFile(file) {
  const normalized = normalizePath(file);
  return normalized.startsWith("apps/web/")
    && !normalized.startsWith("apps/web/supabase/")
    && !isDocumentationFile(normalized);
}

const WEB_COVERAGE_CONTROL_FILES = Object.freeze(new Set([
  "apps/web/vitest.config.ts",
  "apps/web/package.json",
  "package.json",
  "package-lock.json",
  ".github/workflows/ci.yml",
  "scripts/ci/detect-scope.mjs",
  "scripts/ci/publish-main.mjs",
  "scripts/ci/pre_push_guard.ps1",
]));

function isWebCoverageControlFile(file) {
  const normalized = normalizePath(file);
  return WEB_COVERAGE_CONTROL_FILES.has(normalized)
    || normalized.startsWith("scripts/ci/coverage-")
    || normalized.startsWith("scripts/checks/coverage-")
    || normalized.startsWith("scripts/checks/check-coverage")
    || normalized.startsWith("scripts/checks/write-coverage");
}

export function isWebCoverageRelevantFile(file) {
  return isWebFile(file) || isWebCoverageControlFile(file);
}

function isMobileFile(file) {
  return normalizePath(file).startsWith("apps/mobile/") && !isDocumentationFile(file);
}

function isNodeFile(file) {
  const normalized = normalizePath(file);
  return (normalized.startsWith("scripts/") || normalized.startsWith("apps/web/scripts/")) && !isDocumentationFile(file);
}

function isPythonFile(file) {
  return /^maintenance\/python\/(src|scripts)\/.*\.py$/i.test(normalizePath(file));
}

function isSqlFile(file) {
  return normalizePath(file).startsWith("apps/web/supabase/");
}

function stateFor(policy, scope) {
  if (scope !== "web") return policy?.scopes?.[scope]?.state ?? "OBSERVE";
  const web = policy?.scopes?.web;
  return [
    ...Object.values(web?.domains ?? {}).map((entry) => entry?.state),
    web?.historical?.state,
    web?.changedLines?.state,
  ].includes("ENFORCE") ? "ENFORCE" : "OBSERVE";
}

function hasEnforcedWebRequirement(policy) {
  return stateFor(policy, "web") === "ENFORCE";
}

function webRiskDomains(files) {
  const domains = new Set();
  for (const file of files) {
    if (!isWebFile(file)) continue;
    const relative = normalizePath(file).replace(/^apps\/web\//, "");
    const classification = classifyCoverageFile(relative, { scope: "web" });
    if (classification.domain) domains.add(classification.domain);
  }
  return [...domains].sort((a, b) => a.localeCompare(b, "en"));
}

export function getCoveragePublicationRequirements({
  changedFiles = [],
  policy = COVERAGE_ENFORCEMENT_POLICY,
} = {}) {
  const files = normalizeFiles(changedFiles);
  if (files.length === 0 || files.every(isDocumentationFile)) {
    return Object.freeze({ files, requirements: [], reason: "DOCUMENTATION_ONLY_OR_EMPTY" });
  }

  const requirements = [];
  const domains = webRiskDomains(files);
  if (files.some(isWebCoverageRelevantFile) && hasEnforcedWebRequirement(policy)) {
    const enforceDomains = domains.filter((domain) => policy?.scopes?.web?.domains?.[domain]?.state === "ENFORCE");
    requirements.push({ scope: "web", state: "ENFORCE", domains: enforceDomains });
  }
  if (files.some(isMobileFile) && stateFor(policy, "mobile") === "ENFORCE") {
    requirements.push({ scope: "mobile", state: "ENFORCE", domains: [] });
  }
  if (files.some(isNodeFile) && stateFor(policy, "node") === "ENFORCE") {
    requirements.push({ scope: "node", state: "ENFORCE", domains: [] });
  }
  if (files.some(isPythonFile) && stateFor(policy, "python") === "ENFORCE") {
    requirements.push({ scope: "python", state: "ENFORCE", domains: [] });
  }

  return Object.freeze({
    files,
    requirements: Object.freeze(requirements),
    observeScopes: Object.freeze([
      files.some(isWebFile) ? "web" : null,
      files.some(isMobileFile) ? "mobile" : null,
      files.some(isNodeFile) ? "node" : null,
      files.some(isPythonFile) ? "python" : null,
    ].filter(Boolean)),
    sqlRequiresPostgresProof: files.some(isSqlFile),
    riskDomains: domains,
    reason: requirements.length > 0 ? "ENFORCED_SCOPE" : "NO_ACTIVE_ENFORCEMENT",
  });
}

function gitSha(repositoryRoot, ref) {
  const normalizedRef = assertSafeGitRef(ref, "coverage Git ref");
  return execFileSync(gitExecutable(), ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function resolveCoverageCandidate({ repositoryRoot = process.cwd(), environment = process.env } = {}) {
  assertSafeDirectoryRoot(repositoryRoot, { label: "coverage repository root" });
  const dynamicSha = String(environment.CMM_DYNAMIC_CANDIDATE_SHA ?? "").trim();
  const ciSha = String(environment.CANDIDATE_SHA ?? "").trim();
  const candidateSha = dynamicSha || ciSha || getCandidateSha(repositoryRoot);
  if (!SHA_PATTERN.test(candidateSha)) {
    throw new Error(`Cannot create coverage proof without a full candidate SHA: ${candidateSha || "<missing>"}.`);
  }
  if (dynamicSha || ciSha) {
    const checkedOutSha = getCandidateSha(repositoryRoot);
    if (checkedOutSha !== candidateSha) {
      throw new Error(`Coverage candidate SHA does not match checked-out HEAD: ${candidateSha} !== ${checkedOutSha}.`);
    }
  }
  return {
    candidateSha,
    candidateScope: dynamicSha ? "DYNAMIC_CANDIDATE" : ciSha ? "CI_CANDIDATE" : "WORKTREE",
  };
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function proofRoot(repositoryRoot, candidateSha, scope, publicationRoot = null) {
  if (!SHA_PATTERN.test(String(candidateSha ?? ""))) throw new Error(`Invalid coverage candidate SHA: ${candidateSha ?? "<missing>"}.`);
  if (!["web", "mobile", "node", "python"].includes(scope)) throw new Error(`Unsupported coverage publication scope: ${scope}.`);
  const configured = publicationRoot ?? process.env.CMM_COVERAGE_PUBLICATION_ROOT;
  const root = configured
    ? assertSafeExternalPath(configured, { label: "coverage publication root" })
    : path.join(repositoryRoot, PUBLICATION_ROOT);
  const candidateRoot = resolvePathWithinRoot(root, candidateSha, { label: "coverage candidate" });
  return resolvePathWithinRoot(candidateRoot, scope, { label: "coverage scope" });
}

function proofPath(repositoryRoot, candidateSha, scope, publicationRoot = null) {
  return path.join(proofRoot(repositoryRoot, candidateSha, scope, publicationRoot), "coverage-publication-proof.json");
}

function assertSafeRelativePath(value) {
  const normalized = normalizePath(value);
  if (!normalized || path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Coverage publication proof contains an unsafe report path: ${value}`);
  }
  return normalized;
}

function readProof(repositoryRoot, candidateSha, scope, publicationRoot = null) {
  const file = proofPath(repositoryRoot, candidateSha, scope, publicationRoot);
  let proof;
  try {
    proof = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Coverage proof is missing or unreadable for ${scope}/${candidateSha}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (proof.schemaVersion !== PROOF_SCHEMA_VERSION || proof.kind !== "cleanmymap-coverage-publication-proof") {
    throw new Error(`Coverage proof is incompatible for ${scope}/${candidateSha}.`);
  }
  if (proof.candidateSha !== candidateSha || proof.scope !== scope || !SHA_PATTERN.test(proof.candidateSha)) {
    throw new Error(`Coverage proof candidate mismatch for ${scope}: expected ${candidateSha}.`);
  }
  if (!Array.isArray(proof.reports) || proof.reports.length === 0) {
    throw new Error(`Coverage proof has no reports for ${scope}/${candidateSha}.`);
  }
  const expectedSources = sourceReports(scope);
  const proofSources = proof.reports.map((report) => report?.source);
  if (proof.reports.length !== expectedSources.length || new Set(proofSources).size !== expectedSources.length) {
    throw new Error(`Coverage proof report manifest is incomplete or ambiguous for ${scope}/${candidateSha}.`);
  }
  for (const source of expectedSources) {
    const report = proof.reports.find((entry) => entry?.source === source);
    if (!report || report.path !== source || !HASH_PATTERN.test(String(report.sha256 ?? ""))) {
      throw new Error(`Coverage proof does not attest the required report: ${source}.`);
    }
  }
  return { proof, root: proofRoot(repositoryRoot, candidateSha, scope, publicationRoot) };
}

function validateReportHashes(root, proof) {
  for (const report of proof.reports) {
    const relativePath = assertSafeRelativePath(report.path);
    const absolutePath = resolvePathWithinRoot(root, relativePath, { label: "coverage report" });
    if (!fs.existsSync(absolutePath) || sha256(absolutePath) !== report.sha256) {
      throw new Error(`Coverage report is missing, changed, or falsified: ${relativePath}.`);
    }
  }
}

function reportPath(proof, root, source) {
  const report = proof.reports.find((entry) => entry.source === source);
  if (!report) throw new Error(`Coverage proof does not contain ${source}.`);
  return resolvePathWithinRoot(root, assertSafeRelativePath(report.path), { label: "coverage report" });
}

export function validateCoveragePublicationProof({
  repositoryRoot = process.cwd(),
  candidateSha,
  scope,
  publicationRoot = null,
} = {}) {
  assertSafeDirectoryRoot(repositoryRoot, { label: "coverage repository root" });
  if (!SHA_PATTERN.test(String(candidateSha ?? ""))) throw new Error(`Invalid coverage candidate SHA: ${candidateSha ?? "<missing>"}.`);
  if (gitSha(repositoryRoot, candidateSha) !== candidateSha) throw new Error(`Coverage candidate SHA cannot be resolved: ${candidateSha}.`);
  const { proof, root } = readProof(repositoryRoot, candidateSha, scope, publicationRoot);
  validateReportHashes(root, proof);
  if (!["WORKTREE", "DYNAMIC_CANDIDATE", "CI_CANDIDATE"].includes(proof.candidateScope)) {
    throw new Error(`Coverage proof has an unsupported candidate scope: ${proof.candidateScope}.`);
  }
  if (proof.candidateScope === "WORKTREE") {
    if (getCandidateSha(repositoryRoot) !== candidateSha || getWorktreeCandidateFiles(repositoryRoot).length > 0) {
      throw new Error("Coverage WORKTREE proof does not match a clean exact candidate tree.");
    }
  }
  if (["node", "python"].includes(scope)) {
    const identity = proof.candidateIdentity;
    if (
      !identity
      || identity.version !== 1
      || identity.method !== "git-tree-v1"
      || identity.candidateSha !== candidateSha
      || identity.candidateScope !== proof.candidateScope
      || identity.scope !== scope
      || identity.verified !== (proof.candidateScope !== "WORKTREE")
      || !/^[0-9a-f]{40}$/i.test(String(identity.sourceTreeSha ?? ""))
    ) {
      throw new Error(`Coverage ${scope} proof has no verified candidate identity.`);
    }
    if (proof.candidateScope === "CI_CANDIDATE") {
      assertCoverageCandidateIdentity({
        repositoryRoot,
        candidateSha,
        candidateScope: proof.candidateScope,
        scope,
        expectedIdentity: identity,
      });
    } else if (proof.candidateScope === "DYNAMIC_CANDIDATE") {
      if (getCoverageCandidateTreeSha(repositoryRoot, candidateSha) !== identity.sourceTreeSha) {
        throw new Error(`Coverage ${scope} proof candidate tree identity is incompatible.`);
      }
    }
  }
  if (scope === "web") {
    const evidencePath = reportPath(proof, root, "apps/web/coverage/coverage-evidence.json");
    if (!fs.existsSync(evidencePath)) throw new Error("Web coverage evidence is missing from the publication proof.");
    validateCoverageEvidence({
      repositoryRoot,
      expectedCandidateSha: candidateSha,
      reportRoot: root,
      candidateRef: candidateSha,
      // A DYNAMIC_CANDIDATE is materialized elsewhere; its candidate
      // fingerprint cannot be recomputed from the publishing checkout.
      // The proof SHA, Git-bound evidence, configuration hash and report
      // hashes remain mandatory and are checked above and here.
      validateCandidateFingerprint: false,
    });
  }
  if (scope === "mobile") {
    if (proof.scopeFingerprint !== MOBILE_COVERAGE_SCOPE_FINGERPRINT) throw new Error("Mobile coverage scope fingerprint is incompatible.");
    const evidencePath = reportPath(proof, root, "apps/mobile/coverage/coverage-evidence.json");
    if (!fs.existsSync(evidencePath)) throw new Error("Mobile coverage evidence is missing from the publication proof.");
    validateCoverageEvidence({
      repositoryRoot,
      scope: "mobile",
      expectedCandidateSha: candidateSha,
      reportRoot: root,
      candidateRef: candidateSha,
      // A DYNAMIC_CANDIDATE is materialized elsewhere; its candidate
      // fingerprint cannot be recomputed from the publishing checkout.
      // The proof SHA, Git-bound evidence, configuration hash and report
      // hashes remain mandatory and are checked above and here.
      validateCandidateFingerprint: false,
    });
  }
  if (proof.policyFingerprint !== COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT) {
    throw new Error("Coverage proof policy fingerprint is incompatible with the current policy.");
  }
  return { proof, root };
}

function sourceReports(scope) {
  if (scope === "web") return [
    "apps/web/coverage/coverage-summary.json",
    "apps/web/coverage/lcov.info",
    "apps/web/coverage/coverage-evidence.json",
  ];
  if (scope === "mobile") return [
    "apps/mobile/coverage/coverage-summary.json",
    "apps/mobile/coverage/lcov.info",
    "apps/mobile/coverage/coverage-evidence.json",
  ];
  if (scope === "node") return ["scripts/coverage/coverage-summary.json", "scripts/coverage/lcov.info"];
  if (scope === "python") return ["maintenance/python/coverage.xml"];
  throw new Error(`Unsupported coverage publication scope: ${scope}.`);
}

function copyReports(repositoryRoot, targetRoot, sources) {
  const reports = [];
  for (const source of sources) {
    const sourcePath = resolvePathWithinRoot(repositoryRoot, source, { label: "coverage source" });
    if (!fs.existsSync(sourcePath)) throw new Error(`Coverage report is missing: ${source}.`);
    const targetPath = resolvePathWithinRoot(targetRoot, source, { label: "coverage publication" });
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    reports.push({ source, path: source, sha256: sha256(targetPath) });
  }
  return reports;
}

export function writeCoveragePublicationProof({ repositoryRoot = process.cwd(), scope } = {}) {
  assertSafeDirectoryRoot(repositoryRoot, { label: "coverage repository root" });
  const candidate = resolveCoverageCandidate({ repositoryRoot });
  const { candidateSha } = candidate;
  const candidateIdentity = ["node", "python"].includes(scope)
    ? assertCoverageCandidateIdentity({
      repositoryRoot,
      candidateSha,
      candidateScope: candidate.candidateScope,
      scope,
      expectedIdentity: process.env.CMM_COVERAGE_CANDIDATE_IDENTITY ?? null,
    })
    : null;
  const targetRoot = proofRoot(repositoryRoot, candidateSha, scope);
  fs.mkdirSync(targetRoot, { recursive: true });
  const reports = copyReports(repositoryRoot, targetRoot, sourceReports(scope));
  const proof = {
    schemaVersion: PROOF_SCHEMA_VERSION,
    kind: "cleanmymap-coverage-publication-proof",
    candidateSha,
    candidateScope: candidate.candidateScope,
    scope,
    scopeFingerprint: scope === "web" ? COVERAGE_SCOPE_FINGERPRINT : scope === "mobile" ? MOBILE_COVERAGE_SCOPE_FINGERPRINT : null,
    policyFingerprint: COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
    ...(candidateIdentity ? { candidateIdentity } : {}),
    reports,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(targetRoot, "coverage-publication-proof.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`COVERAGE_PUBLICATION_PROOF_WRITTEN: ${path.join(targetRoot, "coverage-publication-proof.json")}`);
  return proof;
}

export function runCoveragePublicationGate({
  repositoryRoot = process.cwd(),
  candidateSha,
  baseRef = null,
  currentRef = candidateSha,
  changedFiles = [],
  policy = COVERAGE_ENFORCEMENT_POLICY,
  coverageCheck = runCoverageCheck,
} = {}) {
  validateCoverageEnforcementPolicy(policy);
  const selection = getCoveragePublicationRequirements({ changedFiles, policy });
  if (selection.requirements.length === 0) {
    const status = selection.files.length === 0 || selection.files.every(isDocumentationFile) ? "NOT_REQUIRED" : "OBSERVE";
    console.log(`COVERAGE_PUBLICATION_GATE: ${status}`);
    if (selection.sqlRequiresPostgresProof) console.log("COVERAGE_SQL_STATUS: DEFERRED_TO_POSTGRESQL_PROOF");
    return { status, selection, results: [] };
  }

  const results = [];
  for (const requirement of selection.requirements) {
    const proof = validateCoveragePublicationProof({ repositoryRoot, candidateSha, scope: requirement.scope });
    if (requirement.scope === "web") {
      const summary = reportPath(proof.proof, proof.root, "apps/web/coverage/coverage-summary.json");
      const lcov = reportPath(proof.proof, proof.root, "apps/web/coverage/lcov.info");
      const result = coverageCheck({
        scope: "web",
        repositoryRoot,
        paths: { ...getDefaultCoveragePaths(repositoryRoot, "web"), summary, lcov },
        currentCommit: candidateSha,
        baseRef,
        currentRef,
        enforcementPolicy: policy,
        validateEvidence: ({ repositoryRoot: evidenceRepositoryRoot, expectedCandidateSha }) => validateCoverageEvidence({
          repositoryRoot: evidenceRepositoryRoot,
          expectedCandidateSha,
          reportRoot: proof.root,
          candidateRef: candidateSha,
          validateCandidateFingerprint: false,
        }),
        setProcessExitCode: false,
      });
      const enforcementStatus = result.enforcementStatus ?? result.policyStatus;
      if (enforcementStatus !== "PASS") throw new Error(`Coverage ENFORCE failed for web/${candidateSha}: ${enforcementStatus ?? "NOT_MEASURED"}.`);
      results.push({ scope: "web", status: enforcementStatus });
    } else {
      if (requirement.scope === "mobile") {
        const summary = reportPath(proof.proof, proof.root, "apps/mobile/coverage/coverage-summary.json");
        const result = coverageCheck({
          scope: "mobile",
          repositoryRoot,
          paths: { ...getDefaultCoveragePaths(repositoryRoot, "mobile"), summary },
          currentCommit: candidateSha,
          enforcementPolicy: policy,
          validateScopeEvidence: ({ repositoryRoot: evidenceRepositoryRoot, expectedCandidateSha }) => validateCoverageEvidence({
            repositoryRoot: evidenceRepositoryRoot,
            scope: "mobile",
            expectedCandidateSha,
            reportRoot: proof.root,
            candidateRef: candidateSha,
            validateCandidateFingerprint: false,
          }),
          setProcessExitCode: false,
        });
        if (result.enforcementStatus !== "PASS") throw new Error(`Coverage ENFORCE failed for mobile/${candidateSha}: ${result.enforcementStatus}.`);
        results.push({ scope: "mobile", status: result.enforcementStatus, proof: proof.proof });
      } else {
        throw new Error(`Coverage ENFORCE is not implemented for ${requirement.scope}; activation was rejected before publication.`);
      }
    }
  }
  console.log(`COVERAGE_PUBLICATION_GATE: PASS (${results.map((result) => result.scope).join(", ")})`);
  return { status: "PASS", selection, results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const candidateRef = process.argv.find((argument) => argument.startsWith("--candidate-ref="))?.slice("--candidate-ref=".length) ?? "HEAD";
  const baseRef = process.argv.find((argument) => argument.startsWith("--base-ref="))?.slice("--base-ref=".length) ?? null;
  const candidateSha = gitSha(process.cwd(), candidateRef);
  const changedFiles = process.argv.filter((argument) => argument.startsWith("--changed-file=")).map((argument) => argument.slice("--changed-file=".length));
  const resolvedChangedFiles = changedFiles.length > 0
    ? changedFiles
    : baseRef
      ? execFileSync(gitExecutable(), ["diff", "--name-only", baseRef, candidateSha], { cwd: process.cwd(), encoding: "utf8" }).split(/\r?\n/).filter(Boolean)
      : [];
  try {
    runCoveragePublicationGate({ repositoryRoot: process.cwd(), candidateSha, baseRef, currentRef: candidateSha, changedFiles: resolvedChangedFiles });
  } catch (error) {
    console.error(`COVERAGE_PUBLICATION_GATE_BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
