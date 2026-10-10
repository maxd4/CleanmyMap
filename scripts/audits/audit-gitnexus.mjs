#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runCommandWithTimeout } from "../ci/validation-process.mjs";
import {
  createCandidateFingerprint,
  createValidationEvidenceKey,
  getWorktreeCandidateFiles,
  readFastValidationEvidence,
  writeFastValidationEvidence,
} from "../ci/validation-evidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerRelativePath = ".gitnexus/run.cjs";
const indexMetadataRelativePath = ".gitnexus/gitnexus.json";
export const GITNEXUS_EXPECTED_VERSION = "1.6.12";
export const GITNEXUS_INDEX_STATUSES = Object.freeze([
  "INDEX_CURRENT",
  "INDEX_PARTIALLY_STALE",
  "INDEX_STALE",
  "INDEX_UNAVAILABLE",
]);
// These limits are per GitNexus phase, based on observed runs of this
// repository: analyze reached ~171 s, status ~53 s, and cycle enumeration
// ~2 s.  They leave bounded headroom for a healthy runner without treating
// the previous 10 s ceiling as an environment failure.
export const GITNEXUS_STEP_TIMEOUTS_MS = Object.freeze({
  analyze: 300_000,
  status: 90_000,
  cycles: 30_000,
});
export const GITNEXUS_HEARTBEAT_MS = 10_000;
const GITNEXUS_ANALYZE_CHECK = Object.freeze({
  id: "audit:gitnexus:analyze",
  command: { executable: "node", args: [".gitnexus/run.cjs", "analyze", "--index-only"] },
});
const GITNEXUS_STATUS_CHECK = Object.freeze({
  id: "audit:gitnexus:status",
  command: { executable: "node", args: [".gitnexus/run.cjs", "status"] },
});

function gitNexusCandidateFingerprint(repoDirectory) {
  return createCandidateFingerprint({
    repositoryRoot: repoDirectory,
    candidateScope: "WORKTREE",
    changedFiles: getWorktreeCandidateFiles(repoDirectory),
  });
}

function gitNexusEvidenceKey(repoDirectory, metadata, check) {
  return createValidationEvidenceKey({
    candidateFingerprint: gitNexusCandidateFingerprint(repoDirectory),
    candidateScope: "WORKTREE",
    check,
    configuration: {
      expectedVersion: GITNEXUS_EXPECTED_VERSION,
      indexCommit: metadata?.lastCommit ?? null,
      schemaFingerprint: metadata?.schemaFingerprint ?? null,
      contentRetention: metadata?.contentRetention ?? null,
      ftsProfile: metadata?.ftsProfile ?? null,
    },
  });
}

function hasReusableGitNexusAnalyzeEvidence(repoDirectory, metadata) {
  if (!metadata?.lastCommit || metadata.lastCommit !== readCurrentHead(repoDirectory)) return false;
  const candidateFingerprint = gitNexusCandidateFingerprint(repoDirectory);
  const entries = readFastValidationEvidence({ repositoryRoot: repoDirectory, candidateFingerprint });
  const entry = entries.get(gitNexusEvidenceKey(repoDirectory, metadata, GITNEXUS_ANALYZE_CHECK));
  return Boolean(
    entry
      && entry.checkId === GITNEXUS_ANALYZE_CHECK.id
      && entry.indexCommit === metadata.lastCommit
      && entry.runnerVersion === GITNEXUS_EXPECTED_VERSION,
  );
}

function hasReusableGitNexusStatusEvidence(repoDirectory, metadata) {
  if (!metadata?.lastCommit || metadata.lastCommit !== readCurrentHead(repoDirectory)) return false;
  const candidateFingerprint = gitNexusCandidateFingerprint(repoDirectory);
  const entries = readFastValidationEvidence({ repositoryRoot: repoDirectory, candidateFingerprint });
  const entry = entries.get(gitNexusEvidenceKey(repoDirectory, metadata, GITNEXUS_STATUS_CHECK));
  return Boolean(
    entry
      && entry.checkId === GITNEXUS_STATUS_CHECK.id
      && entry.indexCommit === metadata.lastCommit
      && entry.runnerVersion === GITNEXUS_EXPECTED_VERSION,
  );
}

function writeGitNexusEvidence(repoDirectory, metadata, check) {
  if (!metadata?.lastCommit) return;
  const candidateFingerprint = gitNexusCandidateFingerprint(repoDirectory);
  const entries = readFastValidationEvidence({ repositoryRoot: repoDirectory, candidateFingerprint });
  entries.set(gitNexusEvidenceKey(repoDirectory, metadata, check), {
    checkId: check.id,
    command: check.command,
    indexCommit: metadata.lastCommit,
    runnerVersion: metadata.runnerIdentity?.cliVersion ?? null,
    passedAt: new Date().toISOString(),
  });
  writeFastValidationEvidence({
    repositoryRoot: repoDirectory,
    candidateFingerprint,
    entries,
  });
}

export { hasReusableGitNexusStatusEvidence };

export function getGitNexusStepTimeoutMs(args) {
  if (args[0] === "analyze") return GITNEXUS_STEP_TIMEOUTS_MS.analyze;
  if (args[0] === "status") return GITNEXUS_STEP_TIMEOUTS_MS.status;
  if (args[0] === "check" && args.includes("--cycles")) return GITNEXUS_STEP_TIMEOUTS_MS.cycles;
  return GITNEXUS_STEP_TIMEOUTS_MS.status;
}

export function parseArgs(argv) {
  if (argv.length === 0) return { cycles: false };
  if (argv.length === 1 && argv[0] === "--cycles") return { cycles: true };
  throw new Error("Usage: node scripts/audits/audit-gitnexus.mjs [--cycles]");
}

function stepLabel(args) {
  return args.join(" ");
}

function readCurrentHead(repoDirectory) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function isWorktreeClean(repoDirectory) {
  try {
    return execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: repoDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "";
  } catch {
    return false;
  }
}

export function readGitNexusIndexMetadata(repoDirectory) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoDirectory, indexMetadataRelativePath), "utf8"));
  } catch {
    return null;
  }
}

export function canReuseGitNexusIndex(
  metadata,
  {
    candidate,
    expectedVersion = GITNEXUS_EXPECTED_VERSION,
  } = {},
) {
  return Boolean(
    metadata
      && candidate
      && metadata.lastCommit === candidate
      && metadata.runnerIdentity?.cliVersion === expectedVersion
      && metadata.contentRetention === "full"
      && metadata.ftsProfile === "full"
      && typeof metadata.schemaFingerprint === "string"
      && metadata.schemaFingerprint.length > 0,
  );
}

export function classifyGitNexusIndex(
  {
    metadata,
    candidate,
    expectedVersion = GITNEXUS_EXPECTED_VERSION,
    worktreeDirty = false,
    runnerPresent = true,
    mcpAvailable = true,
  } = {},
) {
  if (!runnerPresent || !mcpAvailable || !metadata || !candidate) return "INDEX_UNAVAILABLE";
  if (!canReuseGitNexusIndex(metadata, { candidate, expectedVersion })) return "INDEX_STALE";
  return worktreeDirty ? "INDEX_PARTIALLY_STALE" : "INDEX_CURRENT";
}

export function isReusableGitNexusIndex(repoDirectory) {
  return classifyGitNexusIndex({
    metadata: readGitNexusIndexMetadata(repoDirectory),
    candidate: readCurrentHead(repoDirectory),
    worktreeDirty: !isWorktreeClean(repoDirectory),
    runnerPresent: preflightGitNexus(repoDirectory).present,
  }) === "INDEX_CURRENT";
}

export function preflightGitNexus(repoDirectory) {
  const runnerPath = path.resolve(repoDirectory, runnerRelativePath);
  return { runnerPath, present: fs.existsSync(runnerPath) };
}

export async function runGitNexusCommand(
  repoDirectory,
  args,
  {
    timeoutMs,
    heartbeatMs = GITNEXUS_HEARTBEAT_MS,
    runCommand = runCommandWithTimeout,
    writeStdout = (text) => process.stdout.write(text),
    writeStderr = (text) => process.stderr.write(text),
    writeDiagnostic = (line) => process.stderr.write(`${line}\n`),
  } = {},
) {
  const label = stepLabel(args);
  writeDiagnostic(`GITNEXUS_STEP_START: ${label}`);
  const result = await runCommand({
    command: { executable: process.execPath, args: [runnerRelativePath, ...args] },
    cwd: repoDirectory,
    timeoutMs: timeoutMs ?? getGitNexusStepTimeoutMs(args),
    heartbeatMs,
    onStdout: writeStdout,
    onStderr: writeStderr,
    onHeartbeat: (elapsedSeconds) => {
      writeDiagnostic(`GITNEXUS_STILL_RUNNING: ${label} elapsed=${Math.floor(elapsedSeconds)}s`);
    },
  });

  writeDiagnostic(`GITNEXUS_STEP_DONE: ${label} elapsed=${result.elapsedSeconds.toFixed(1)}s`);
  return {
    status: result.exitCode ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    elapsedSeconds: result.elapsedSeconds,
    timedOut: result.status === "TIME_BUDGET_EXCEEDED",
    interrupted: result.status === "INTERRUPTED",
  };
}

function printPreflight(preflight, writeDiagnostic) {
  writeDiagnostic("GITNEXUS_PREFLIGHT");
  writeDiagnostic(`RUNNER_PATH: ${preflight.runnerPath}`);
  writeDiagnostic(`RUNNER_PRESENT: ${preflight.present ? "yes" : "no"}`);
  if (!preflight.present) {
    writeDiagnostic("GITNEXUS_STATUS: RUNNER_MISSING");
    writeDiagnostic("HOST_ENVIRONMENT: GitNexus runner missing");
    writeDiagnostic("SETUP_CANONICAL: npm install --global gitnexus@1.6.12");
    writeDiagnostic("SETUP_CANONICAL: gitnexus analyze --index-only");
  }
}

export async function main(
  argv = process.argv.slice(2),
  repoDirectory = repoRoot,
  { writeDiagnostic = (line) => process.stderr.write(`${line}\n`) } = {},
) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    writeDiagnostic(error.message);
    return 2;
  }

  const preflight = preflightGitNexus(repoDirectory);
  printPreflight(preflight, writeDiagnostic);
  if (!preflight.present) return 1;

  const startedAt = performance.now();
  const commands = [];
  const metadataBeforeAnalysis = readGitNexusIndexMetadata(repoDirectory);
  const indexStatus = classifyGitNexusIndex({
    metadata: metadataBeforeAnalysis,
    candidate: readCurrentHead(repoDirectory),
    worktreeDirty: !isWorktreeClean(repoDirectory),
    runnerPresent: preflight.present,
  });
  writeDiagnostic(`GITNEXUS_INDEX_STATUS: ${indexStatus}`);
  const reusableIndex = indexStatus === "INDEX_CURRENT"
    && (isReusableGitNexusIndex(repoDirectory)
      || hasReusableGitNexusAnalyzeEvidence(repoDirectory, metadataBeforeAnalysis));
  if (reusableIndex) {
    writeDiagnostic("GITNEXUS_STEP_REUSED: analyze --index-only");
    writeDiagnostic(`REUSED_EVIDENCE_SOURCE: validation-evidence/${gitNexusCandidateFingerprint(repoDirectory)}`);
  } else {
    commands.push(["analyze", "--index-only"]);
  }
  const metadataBeforeStatus = readGitNexusIndexMetadata(repoDirectory);
  if (reusableIndex && hasReusableGitNexusStatusEvidence(repoDirectory, metadataBeforeStatus)) {
    writeDiagnostic("GITNEXUS_STEP_REUSED: status");
    writeDiagnostic(`REUSED_EVIDENCE_SOURCE: validation-evidence/${gitNexusCandidateFingerprint(repoDirectory)}`);
  } else {
    commands.push(["status"]);
  }
  if (options.cycles) commands.push(["check", "--cycles", "--json"]);

  for (const args of commands) {
    const result = await runGitNexusCommand(repoDirectory, args, { writeDiagnostic });
    if (result.timedOut) {
      writeDiagnostic("GITNEXUS_STATUS: TIMEOUT");
      writeDiagnostic("HOST_ENVIRONMENT: GitNexus step timed out");
      writeDiagnostic(`STEP: ${stepLabel(args)}`);
      writeDiagnostic(`ELAPSED_SECONDS: ${Math.ceil(result.elapsedSeconds)}`);
      return 1;
    }
    if (result.interrupted) {
      writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
      writeDiagnostic("HOST_ENVIRONMENT: GitNexus step interrupted");
      writeDiagnostic(`STEP: ${stepLabel(args)}`);
      writeDiagnostic(`ELAPSED_SECONDS: ${Math.ceil(result.elapsedSeconds)}`);
      return 130;
    }
    if (result.status !== 0) return result.status;
    if (args[0] === "analyze") writeGitNexusEvidence(repoDirectory, readGitNexusIndexMetadata(repoDirectory), GITNEXUS_ANALYZE_CHECK);
    if (args[0] === "status") writeGitNexusEvidence(repoDirectory, readGitNexusIndexMetadata(repoDirectory), GITNEXUS_STATUS_CHECK);
  }

  writeDiagnostic(`GITNEXUS_TOTAL_ELAPSED_SECONDS: ${((performance.now() - startedAt) / 1000).toFixed(1)}`);
  writeDiagnostic("GITNEXUS_STATUS: PASS");
  return 0;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) process.exitCode = await main();
