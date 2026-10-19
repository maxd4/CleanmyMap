#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { gitExecutable } from "../ci/git-executable.mjs";
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
const auditLockRelativePath = ".gitnexus/quality-audit.lock";
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
    return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], {
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
    return execFileSync(gitExecutable(), ["status", "--porcelain", "--untracked-files=all"], {
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
      && metadata.schemaFingerprint.length > 0
      && !metadata.incrementalInProgress,
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
  writeDiagnostic(`GITNEXUS_STEP_EXIT_CODE: ${result.exitCode ?? "null"}`);
  return {
    status: result.exitCode ?? 1,
    processStatus: result.status,
    exitCode: result.exitCode,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    elapsedSeconds: result.elapsedSeconds,
    timedOut: result.status === "TIME_BUDGET_EXCEEDED",
    interrupted: result.status === "INTERRUPTED",
    error: result.error
      ? { name: result.error.name, message: result.error.message, code: result.error.code }
      : null,
  };
}

const MAX_CYCLE_REPORT_LENGTH = 4 * 1024 * 1024;

export function isCompleteCycleReport(stdout = "") {
  const text = String(stdout);
  const jsonStart = text.indexOf("{");
  if (jsonStart < 0) return false;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let jsonEnd = -1;

  for (let index = jsonStart; index < text.length; index += 1) {
    if (index - jsonStart + 1 > MAX_CYCLE_REPORT_LENGTH) return false;

    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        jsonEnd = index + 1;
        break;
      }
      if (depth < 0) return false;
    }
  }

  if (jsonEnd < 0 || inString || depth !== 0) return false;
  if (text.slice(jsonEnd).trim() !== "") return false;

  const candidate = text.slice(jsonStart, jsonEnd);
  try {
    const report = JSON.parse(candidate);
    return report.status === "cycles_found"
      && report.enumeration === "complete"
      && Array.isArray(report.cycles);
  } catch {
    return false;
  }
}

function hasStaleStatus(stdout = "") {
  return /Status:\s*.*stale/i.test(stdout) || /Index incomplete reasons:/i.test(stdout);
}

export function acquireAuditLock(repoDirectory) {
  const lockPath = path.join(repoDirectory, auditLockRelativePath);
  const token = randomUUID();
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, "wx");
    fs.writeSync(descriptor, JSON.stringify({ pid: process.pid, token, startedAt: new Date().toISOString() }));
    return { lockPath, token };
  } catch (error) {
    if (error?.code === "EEXIST") return null;
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

export function releaseAuditLock(lock) {
  if (!lock) return;
  try {
    const current = JSON.parse(fs.readFileSync(lock.lockPath, "utf8"));
    if (current.token === lock.token) fs.unlinkSync(lock.lockPath);
  } catch {
    // A competing process owns the lock or the repository disappeared.
  }
}

function readIndexStatus(repoDirectory, candidate) {
  const metadata = readGitNexusIndexMetadata(repoDirectory);
  return classifyGitNexusIndex({
    metadata,
    candidate,
    worktreeDirty: !isWorktreeClean(repoDirectory),
    runnerPresent: preflightGitNexus(repoDirectory).present,
  });
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
  const candidateAtStart = readCurrentHead(repoDirectory);
  const metadataBeforeAnalysis = readGitNexusIndexMetadata(repoDirectory);
  const indexStatus = classifyGitNexusIndex({
    metadata: metadataBeforeAnalysis,
    candidate: candidateAtStart,
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

  let lock = null;
  if (commands.length > 0) {
    try {
      lock = acquireAuditLock(repoDirectory);
    } catch (error) {
      writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
      writeDiagnostic(`HOST_ENVIRONMENT: GitNexus audit lock could not be created: ${error.message}`);
      return 1;
    }
    if (!lock) {
      writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
      writeDiagnostic("HOST_ENVIRONMENT: another GitNexus audit holds the index lock.");
      return 1;
    }
    writeDiagnostic("GITNEXUS_LOCK_ACQUIRED");
  }

  try {
    for (const args of commands) {
      const result = await runGitNexusCommand(repoDirectory, args, { writeDiagnostic });
      const candidateAfter = readCurrentHead(repoDirectory);
      if (candidateAfter !== candidateAtStart) {
        writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
        writeDiagnostic(`HOST_ENVIRONMENT: GitNexus candidate changed during ${stepLabel(args)}.`);
        writeDiagnostic(`CANDIDATE_START: ${candidateAtStart ?? "unavailable"}`);
        writeDiagnostic(`CANDIDATE_END: ${candidateAfter ?? "unavailable"}`);
        return 1;
      }
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
      if (result.status !== 0 && !(args[0] === "check" && isCompleteCycleReport(result.stdout))) {
        writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
        writeDiagnostic(`GITNEXUS_STEP_FAILED: ${stepLabel(args)}`);
        writeDiagnostic(`HOST_ENVIRONMENT: GitNexus phase exited with code ${result.status}.`);
        return result.status;
      }
      if (args[0] === "analyze") {
        const indexAfterAnalyze = readIndexStatus(repoDirectory, candidateAtStart);
        writeDiagnostic(`GITNEXUS_INDEX_STATUS_AFTER_ANALYZE: ${indexAfterAnalyze}`);
        if (candidateAtStart && !["INDEX_CURRENT", "INDEX_PARTIALLY_STALE"].includes(indexAfterAnalyze)) {
          writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
          writeDiagnostic("HOST_ENVIRONMENT: GitNexus analyze did not produce an index attributable to the candidate.");
          return 1;
        }
        writeGitNexusEvidence(repoDirectory, readGitNexusIndexMetadata(repoDirectory), GITNEXUS_ANALYZE_CHECK);
      }
      if (args[0] === "status") {
        if (hasStaleStatus(result.stdout)) {
          writeDiagnostic("GITNEXUS_INDEX_STATUS: INDEX_STALE");
          writeDiagnostic("GITNEXUS_STATUS: HOST_ENVIRONMENT");
          writeDiagnostic("HOST_ENVIRONMENT: GitNexus status reports an incomplete or stale index.");
          return 1;
        }
        writeGitNexusEvidence(repoDirectory, readGitNexusIndexMetadata(repoDirectory), GITNEXUS_STATUS_CHECK);
      }
    }

    writeDiagnostic(`GITNEXUS_TOTAL_ELAPSED_SECONDS: ${((performance.now() - startedAt) / 1000).toFixed(1)}`);
    writeDiagnostic("GITNEXUS_STATUS: PASS");
    return 0;
  } finally {
    releaseAuditLock(lock);
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) process.exitCode = await main();
