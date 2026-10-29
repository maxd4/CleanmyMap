#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareDuplicationMetrics,
  DUPLICATION_POLICY_FINGERPRINT,
  DUPLICATION_TARGET_PERCENTAGE,
  DUPLICATION_TOOL,
  DUPLICATION_TOOL_VERSION,
  evaluateDuplicationTarget,
  nativeBaselineFingerprintCount,
  readJscpdFingerprints,
  readJscpdMetrics,
  readJscpdOccurrences,
  validateDuplicationJustificationsRegistry,
  validateDuplicationMetricsBaseline,
} from "../checks/duplication-policy.mjs";
import { gitExecutable } from "./git-executable.mjs";

export const DUPLICATION_PUBLICATION_SCHEMA_VERSION = 2;
export const DUPLICATION_PUBLICATION_ROOT = path.join("artifacts", "duplication-publication");
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const SCOPES = Object.freeze(["runtime", "tests", "fixtures/data"]);
const SOURCE_FILES = Object.freeze([
  "scripts/checks/duplication-policy.mjs",
  "scripts/checks/check-duplication.mjs",
  "scripts/checks/duplication-metrics-baseline.json",
  "scripts/checks/duplication-runtime-baseline.json",
  "scripts/checks/duplication-tests-baseline.json",
  "scripts/checks/duplication-data-baseline.json",
  "scripts/checks/duplication-justifications.json",
]);
const NATIVE_BASELINE_PATHS = Object.freeze({
  runtime: "scripts/checks/duplication-runtime-baseline.json",
  tests: "scripts/checks/duplication-tests-baseline.json",
  "fixtures/data": "scripts/checks/duplication-data-baseline.json",
});

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function resolveRoot(repositoryRoot, configuredRoot = process.env.CMM_DUPLICATION_PUBLICATION_ROOT) {
  if (!configuredRoot) return path.resolve(repositoryRoot, DUPLICATION_PUBLICATION_ROOT);
  return path.resolve(configuredRoot);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

function git(repositoryRoot, args) {
  return execFileSync(gitExecutable(), args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function candidateTreeSha(repositoryRoot, candidateSha) {
  return git(repositoryRoot, ["rev-parse", `${candidateSha}^{tree}`]);
}

function candidateFileSha(repositoryRoot, candidateSha, relativePath) {
  const contents = execFileSync(gitExecutable(), ["show", `${candidateSha}:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return sha256(contents);
}

function candidateFileJson(repositoryRoot, candidateSha, relativePath) {
  const contents = execFileSync(gitExecutable(), ["show", `${candidateSha}:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(contents);
}

function candidateScope() {
  const configured = String(process.env.CMM_VALIDATION_SCOPE ?? "").trim().toUpperCase();
  return ["DYNAMIC_CANDIDATE", "CI_CANDIDATE", "WORKTREE"].includes(configured) ? configured : "WORKTREE";
}

export function isDuplicationRelevantFile(file) {
  const normalized = normalizePath(file);
  if (normalized.startsWith("apps/web/src/") || normalized.startsWith("apps/mobile/") || normalized.startsWith("scripts/")) {
    return /\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(normalized)
      || normalized.includes("/duplication-")
      || normalized.endsWith("/check-duplication.mjs");
  }
  return SOURCE_FILES.includes(normalized)
    || normalized === "package.json"
    || normalized === "package-lock.json"
    || normalized === "apps/web/package.json"
    || normalized === "apps/web/package-lock.json";
}

function changedFilesFromBase(repositoryRoot, candidateSha, baseRef) {
  if (!baseRef) return [];
  return git(repositoryRoot, ["diff", "--name-only", `${baseRef}..${candidateSha}`, "--"])
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function proofDirectory(repositoryRoot, candidateSha, runId, publicationRoot) {
  if (!SHA_PATTERN.test(candidateSha)) throw new Error(`Invalid duplication candidate SHA: ${candidateSha}`);
  if (!/^[a-z0-9-]{8,80}$/i.test(runId)) throw new Error(`Invalid duplication publication run id: ${runId}`);
  return path.join(resolveRoot(repositoryRoot, publicationRoot), candidateSha, runId);
}

function proofCandidates(repositoryRoot, candidateSha, publicationRoot) {
  const root = path.join(resolveRoot(repositoryRoot, publicationRoot), candidateSha);
  if (!fs.existsSync(root)) return [];
  const direct = path.join(root, "duplication-publication-proof.json");
  const candidates = fs.existsSync(direct) ? [direct] : [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = path.join(root, entry.name, "duplication-publication-proof.json");
      if (fs.existsSync(nested)) candidates.push(nested);
    }
  }
  return candidates;
}

function readProof(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Duplication publication proof is unreadable: ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateProofShape(proof, candidateSha) {
  if (proof?.schemaVersion !== DUPLICATION_PUBLICATION_SCHEMA_VERSION || proof.kind !== "cleanmymap-duplication-publication-proof") {
    throw new Error("Duplication publication proof schema is incompatible.");
  }
  if (proof.candidateSha !== candidateSha || !SHA_PATTERN.test(proof.candidateSha)) {
    throw new Error(`Duplication publication proof candidate mismatch: expected ${candidateSha}.`);
  }
  if (!["DYNAMIC_CANDIDATE", "CI_CANDIDATE"].includes(proof.candidateScope)) {
    throw new Error(`Duplication publication proof has an unsupported candidate scope: ${proof.candidateScope ?? "<missing>"}.`);
  }
  if (proof.policyFingerprint !== DUPLICATION_POLICY_FINGERPRINT) {
    throw new Error("Duplication publication proof policy fingerprint is incompatible.");
  }
  if (proof.tool !== DUPLICATION_TOOL || proof.toolVersion !== DUPLICATION_TOOL_VERSION) {
    throw new Error("Duplication publication proof tool identity is incompatible.");
  }
  if (!Array.isArray(proof.scopes) || proof.scopes.length !== SCOPES.length || proof.scopes.map((scope) => scope.name).sort().join(",") !== SCOPES.slice().sort().join(",")) {
    throw new Error("Duplication publication proof must attest exactly the three canonical scopes.");
  }
  if (!Array.isArray(proof.sourceFiles) || proof.sourceFiles.length !== SOURCE_FILES.length) {
    throw new Error("Duplication publication proof source manifest is incomplete.");
  }
}

function validateSourceManifest(repositoryRoot, candidateSha, proof) {
  const sourcePaths = proof.sourceFiles.map((source) => source?.path);
  if (new Set(sourcePaths).size !== SOURCE_FILES.length || [...sourcePaths].sort().join("\n") !== SOURCE_FILES.slice().sort().join("\n")) {
    throw new Error("Duplication publication source manifest does not match the canonical owner files.");
  }
  for (const source of proof.sourceFiles) {
    if (!SOURCE_FILES.includes(source.path) || !HASH_PATTERN.test(source.sha256)) {
      throw new Error(`Duplication publication source manifest is malformed: ${source.path ?? "<missing>"}.`);
    }
    if (candidateFileSha(repositoryRoot, candidateSha, source.path) !== source.sha256) {
      throw new Error(`Duplication publication source changed for candidate: ${source.path}.`);
    }
  }
}

function validateReportManifest(proofDirectoryPath, proof) {
  const reports = {};
  for (const scope of proof.scopes) {
    if (!scope.report || !HASH_PATTERN.test(scope.report.jsonSha256) || !HASH_PATTERN.test(scope.report.sarifSha256)) {
      throw new Error(`Duplication publication report manifest is incomplete for ${scope.name}.`);
    }
    for (const reportPath of [scope.report.jsonPath, scope.report.sarifPath]) {
      const safePath = normalizePath(reportPath ?? "");
      if (!safePath.startsWith(`${scope.name}/`) || safePath.includes("..")) {
        throw new Error(`Duplication publication report path is unsafe for ${scope.name}.`);
      }
      if (!fs.existsSync(path.join(proofDirectoryPath, ...safePath.split("/")))) {
        throw new Error(`Duplication publication report is missing for ${scope.name}.`);
      }
    }
    const jsonPath = path.join(proofDirectoryPath, ...normalizePath(scope.report.jsonPath).split("/"));
    const sarifPath = path.join(proofDirectoryPath, ...normalizePath(scope.report.sarifPath).split("/"));
    if (fileSha256(jsonPath) !== scope.report.jsonSha256 || fileSha256(sarifPath) !== scope.report.sarifSha256) {
      throw new Error(`Duplication publication report hash mismatch for ${scope.name}.`);
    }
    reports[scope.name] = {
      json: JSON.parse(fs.readFileSync(jsonPath, "utf8")),
      sarif: JSON.parse(fs.readFileSync(sarifPath, "utf8")),
    };
  }
  return reports;
}

function assertJsonEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
}

function validateJscpdExecution(scopeName, execution, ratchetStatus) {
  if (!execution || typeof execution !== "object"
    || !["PASS", "FAIL"].includes(execution.status)
    || (execution.exitCode !== null && !Number.isInteger(execution.exitCode))
    || (execution.signal !== null && typeof execution.signal !== "string")) {
    throw new Error(`Duplication publication execution metadata is incomplete for ${scopeName}.`);
  }
  if (execution.status === "FAIL" && ratchetStatus !== "FAIL") {
    throw new Error(`Duplication publication execution status contradicts the scope ratchet status for ${scopeName}.`);
  }
  if (execution.status !== "PASS" || execution.exitCode !== 0 || execution.signal !== null) {
    throw new Error(`Duplication publication jscpd execution was not successful for ${scopeName}.`);
  }
}

function validateProofConsistency(repositoryRoot, candidateSha, proof, reports) {
  const metricsBaseline = candidateFileJson(repositoryRoot, candidateSha, "scripts/checks/duplication-metrics-baseline.json");
  validateDuplicationMetricsBaseline(metricsBaseline);
  if (proof.baselineSourceCommit !== metricsBaseline.sourceCommit) {
    throw new Error("Duplication publication baseline source commit is incoherent.");
  }
  const nativeBaselines = Object.fromEntries(Object.entries(NATIVE_BASELINE_PATHS).map(([scope, relativePath]) => {
    const baseline = candidateFileJson(repositoryRoot, candidateSha, relativePath);
    nativeBaselineFingerprintCount(baseline);
    return [scope, baseline];
  }));
  const currentFingerprintsByScope = {};
  const currentOccurrencesByScope = {};
  for (const scope of proof.scopes) {
    validateJscpdExecution(scope.name, scope.execution, scope.ratchetStatus);
    const report = reports[scope.name];
    const reportMetrics = readJscpdMetrics(report.json);
    const reportFingerprints = [...readJscpdFingerprints(report.sarif)].sort();
    const reportOccurrences = readJscpdOccurrences(report.json, report.sarif, scope.name);
    const declaredFingerprints = Array.isArray(scope.fingerprints) ? [...scope.fingerprints].sort() : null;
    if (!declaredFingerprints || new Set(declaredFingerprints).size !== declaredFingerprints.length
      || JSON.stringify(declaredFingerprints) !== JSON.stringify(reportFingerprints)) {
      throw new Error(`Duplication publication fingerprints are incoherent for ${scope.name}.`);
    }
    const qualified = Array.isArray(scope.qualifiedNewFingerprints) ? [...scope.qualifiedNewFingerprints] : null;
    if (!qualified || new Set(qualified).size !== qualified.length || qualified.some((fingerprint) => !declaredFingerprints.includes(fingerprint))) {
      throw new Error(`Duplication publication qualified fingerprints are incoherent for ${scope.name}.`);
    }
    const declaredMetrics = scope.metrics;
    if (!declaredMetrics || reportMetrics.files !== declaredMetrics.files || reportMetrics.lines !== declaredMetrics.lines
      || reportMetrics.tokens !== declaredMetrics.tokens || reportMetrics.clones !== declaredMetrics.clones
      || reportMetrics.duplicatedLines !== declaredMetrics.duplicatedLines
      || reportMetrics.duplicatedTokens !== declaredMetrics.duplicatedTokens
      || reportMetrics.percentage !== declaredMetrics.percentage
      || reportMetrics.percentageTokens !== declaredMetrics.percentageTokens
      || reportMetrics.newClones !== declaredMetrics.newClones + qualified.length) {
      throw new Error(`Duplication publication metrics are incoherent for ${scope.name}.`);
    }
    const expectedBaseline = metricsBaseline.scopes[scope.name];
    if (!scope.baseline || scope.baseline.sourceCommit !== metricsBaseline.sourceCommit) {
      throw new Error(`Duplication publication baseline is incoherent for ${scope.name}.`);
    }
    for (const field of ["files", "lines", "tokens", "clones", "fingerprints", "duplicatedLines", "duplicatedTokens", "percentage", "percentageTokens"]) {
      if (scope.baseline.scope?.[field] !== expectedBaseline[field]) {
        throw new Error(`Duplication publication baseline is incoherent for ${scope.name}.`);
      }
    }
    const comparison = compareDuplicationMetrics(declaredMetrics, expectedBaseline, scope.name);
    if (scope.ratchetStatus !== comparison.status || JSON.stringify(scope.failures ?? []) !== JSON.stringify(comparison.failures)) {
      throw new Error(`Duplication publication ratchet status is incoherent for ${scope.name}.`);
    }
    assertJsonEqual(scope.threePercent, evaluateDuplicationTarget(declaredMetrics), `Duplication publication target status is incoherent for ${scope.name}.`);
    currentFingerprintsByScope[scope.name] = new Set(declaredFingerprints);
    currentOccurrencesByScope[scope.name] = reportOccurrences;
  }
  const justificationRegistry = candidateFileJson(repositoryRoot, candidateSha, "scripts/checks/duplication-justifications.json");
  const justificationReport = validateDuplicationJustificationsRegistry(justificationRegistry, {
    nativeBaselines,
    currentFingerprintsByScope,
    currentOccurrencesByScope,
    reviewedRefValidation: {
      auditedSha: candidateSha,
      gitRunner: (args) => execFileSync(gitExecutable(), args, {
        cwd: repositoryRoot,
        stdio: "ignore",
      }),
    },
  });
  const expectedJustificationStatus = {
    stale: justificationReport.stale,
    keepIntentional: justificationReport.keepIntentional,
    noActionNoise: justificationReport.noActionNoise,
  };
  assertJsonEqual(proof.justificationStatus, expectedJustificationStatus, "Duplication publication justification status is incoherent.");
  const classified = new Set(Object.values(justificationReport.classifications).flat());
  for (const scope of proof.scopes) {
    const expectedQualified = [...currentFingerprintsByScope[scope.name]]
      .filter((fingerprint) => !Object.hasOwn(nativeBaselines[scope.name].fingerprints, fingerprint)
        && classified.has(`${scope.name}:${fingerprint}`))
      .sort();
    assertJsonEqual(scope.qualifiedNewFingerprints, expectedQualified, `Duplication publication qualified fingerprints are incoherent for ${scope.name}.`);
  }
  const statuses = proof.scopes.map((scope) => scope.ratchetStatus);
  const expectedStatus = expectedJustificationStatus.stale.length > 0 || statuses.includes("FAIL")
    ? "FAIL"
    : statuses.includes("PASS_WITH_GRACE") ? "PASS_WITH_GRACE" : "PASS";
  if (proof.status !== expectedStatus) {
    throw new Error(`Duplication publication global status is incoherent: declared ${proof.status ?? "<missing>"}, expected ${expectedStatus}.`);
  }
  if (expectedStatus === "FAIL") throw new Error("Duplication ratchet status is FAIL.");
}

export function validateDuplicationPublicationProof({ repositoryRoot = process.cwd(), candidateSha, publicationRoot = null } = {}) {
  if (!SHA_PATTERN.test(String(candidateSha ?? ""))) throw new Error("Duplication publication requires a complete candidate SHA.");
  const errors = [];
  for (const proofFile of proofCandidates(repositoryRoot, candidateSha, publicationRoot)) {
    try {
      const proof = readProof(proofFile);
      validateProofShape(proof, candidateSha);
      if (proof.candidateTreeSha !== candidateTreeSha(repositoryRoot, candidateSha)) throw new Error("Duplication publication candidate tree mismatch.");
      validateSourceManifest(repositoryRoot, candidateSha, proof);
      const reports = validateReportManifest(path.dirname(proofFile), proof);
      validateProofConsistency(repositoryRoot, candidateSha, proof, reports);
      return { status: "PASS", proof, proofFile };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length === 0) throw new Error(`Duplication publication proof is missing for ${candidateSha}.`);
  throw new Error(`Duplication publication proof is stale or invalid for ${candidateSha}: ${errors.join(" | ")}`);
}

export function writeDuplicationPublicationProof({
  repositoryRoot = process.cwd(),
  candidateSha,
  results,
  baseline,
  justificationReport,
  toolVersion,
  candidateScope: candidateScopeOverride = null,
  publicationRoot = null,
  runId = `run-${Date.now()}-${randomUUID().slice(0, 8)}`,
} = {}) {
  const targetDirectory = proofDirectory(repositoryRoot, candidateSha, runId, publicationRoot);
  fs.mkdirSync(targetDirectory, { recursive: true });
  const sourceFiles = SOURCE_FILES.map((source) => ({ path: source, sha256: candidateFileSha(repositoryRoot, candidateSha, source) }));
  const scopes = results.map((result) => {
    const scopeDirectory = path.join(targetDirectory, result.scopeName);
    fs.mkdirSync(scopeDirectory, { recursive: true });
    if (!result.reportArtifacts?.jsonPath || !result.reportArtifacts?.sarifPath) {
      throw new Error(`Duplication publication cannot attest reports for ${result.scopeName}.`);
    }
    if (!result.execution || !["PASS", "FAIL"].includes(result.execution.status)
      || (result.execution.exitCode !== null && !Number.isInteger(result.execution.exitCode))
      || (result.execution.signal !== null && typeof result.execution.signal !== "string")) {
      throw new Error(`Duplication publication execution metadata is incomplete for ${result.scopeName}.`);
    }
    const jsonPath = path.join(scopeDirectory, "jscpd-report.json");
    const sarifPath = path.join(scopeDirectory, "jscpd-report.sarif");
    if (path.resolve(result.reportArtifacts.jsonPath) !== path.resolve(jsonPath)) fs.copyFileSync(result.reportArtifacts.jsonPath, jsonPath);
    if (path.resolve(result.reportArtifacts.sarifPath) !== path.resolve(sarifPath)) fs.copyFileSync(result.reportArtifacts.sarifPath, sarifPath);
    const target = evaluateDuplicationTarget(result.metrics);
    return {
      name: result.scopeName,
      metrics: result.metrics,
      ratchetStatus: result.comparison.status,
      failures: result.comparison.failures,
      execution: result.execution,
      fingerprints: [...result.fingerprints].sort(),
      qualifiedNewFingerprints: result.qualifiedNewFingerprints ?? [],
      threePercent: target,
      baseline: {
        sourceCommit: baseline.sourceCommit,
        scope: baseline.scopes[result.scopeName],
      },
      report: {
        jsonPath: `${result.scopeName}/jscpd-report.json`,
        sarifPath: `${result.scopeName}/jscpd-report.sarif`,
        jsonSha256: fileSha256(jsonPath),
        sarifSha256: fileSha256(sarifPath),
      },
    };
  });
  const staleJustifications = justificationReport?.stale ?? [];
  const statuses = scopes.map((scope) => scope.ratchetStatus);
  const status = staleJustifications.length > 0 || statuses.includes("FAIL")
    ? "FAIL"
    : statuses.includes("PASS_WITH_GRACE") ? "PASS_WITH_GRACE" : "PASS";
  const proof = {
    schemaVersion: DUPLICATION_PUBLICATION_SCHEMA_VERSION,
    kind: "cleanmymap-duplication-publication-proof",
    candidateSha,
    candidateTreeSha: candidateTreeSha(repositoryRoot, candidateSha),
    candidateScope: candidateScopeOverride ?? candidateScope(),
    tool: DUPLICATION_TOOL,
    toolVersion: toolVersion?.actual ?? DUPLICATION_TOOL_VERSION,
    policyFingerprint: DUPLICATION_POLICY_FINGERPRINT,
    targetPercentage: DUPLICATION_TARGET_PERCENTAGE * 100,
    sourceFiles,
    baselineSourceCommit: baseline.sourceCommit,
    justificationStatus: {
      stale: staleJustifications,
      keepIntentional: justificationReport?.keepIntentional ?? 0,
      noActionNoise: justificationReport?.noActionNoise ?? 0,
    },
    scopes,
    status,
    generatedAt: new Date().toISOString(),
  };
  const proofPath = path.join(targetDirectory, "duplication-publication-proof.json");
  const temporaryPath = `${proofPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, proofPath);
  return { proof, proofPath };
}

export function runDuplicationPublicationGate({ repositoryRoot = process.cwd(), candidateSha, changedFiles = [], baseRef = null, publicationRoot = null } = {}) {
  const resolvedFiles = changedFiles.length > 0 ? changedFiles : changedFilesFromBase(repositoryRoot, candidateSha, baseRef);
  const relevantFiles = resolvedFiles.filter(isDuplicationRelevantFile);
  if (relevantFiles.length === 0) {
    console.log("DUPLICATION_PUBLICATION_GATE: NOT_REQUIRED");
    return { status: "NOT_REQUIRED", relevantFiles: [] };
  }
  const result = validateDuplicationPublicationProof({ repositoryRoot, candidateSha, publicationRoot });
  console.log(`DUPLICATION_PUBLICATION_GATE: ${result.status}`);
  return { ...result, relevantFiles };
}

function parseArguments(argv = process.argv.slice(2)) {
  const candidateRef = argv.find((argument) => argument.startsWith("--candidate-ref="))?.slice("--candidate-ref=".length) ?? "HEAD";
  const baseRef = argv.find((argument) => argument.startsWith("--base-ref="))?.slice("--base-ref=".length) ?? null;
  const changedFiles = argv.filter((argument) => argument.startsWith("--changed-file=")).map((argument) => argument.slice("--changed-file=".length));
  return { candidateRef, baseRef, changedFiles };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const { candidateRef, baseRef, changedFiles } = parseArguments();
    const repositoryRoot = process.cwd();
    const candidateSha = git(repositoryRoot, ["rev-parse", `${candidateRef}^{commit}`]);
    const resolvedFiles = changedFiles.length > 0 ? changedFiles : changedFilesFromBase(repositoryRoot, candidateSha, baseRef);
    runDuplicationPublicationGate({ repositoryRoot, candidateSha, changedFiles: resolvedFiles, baseRef });
  } catch (error) {
    console.error(`DUPLICATION_PUBLICATION_GATE_BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
