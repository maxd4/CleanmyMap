#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runCommandWithTimeout } from "../ci/validation-process.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerRelativePath = ".gitnexus/run.cjs";
const indexMetadataRelativePath = ".gitnexus/gitnexus.json";
export const GITNEXUS_EXPECTED_VERSION = "1.6.12";
// The repository graph is large enough that a normal Windows index can exceed
// a few seconds, but a broken native graph store must still terminate.
export const GITNEXUS_STEP_TIMEOUT_MS = 180_000;
export const GITNEXUS_HEARTBEAT_MS = 10_000;

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

export function isReusableGitNexusIndex(repoDirectory) {
  if (!isWorktreeClean(repoDirectory)) return false;
  return canReuseGitNexusIndex(readGitNexusIndexMetadata(repoDirectory), {
    candidate: readCurrentHead(repoDirectory),
  });
}

export function preflightGitNexus(repoDirectory) {
  const runnerPath = path.resolve(repoDirectory, runnerRelativePath);
  return { runnerPath, present: fs.existsSync(runnerPath) };
}

export async function runGitNexusCommand(
  repoDirectory,
  args,
  {
    timeoutMs = GITNEXUS_STEP_TIMEOUT_MS,
    heartbeatMs = GITNEXUS_HEARTBEAT_MS,
    writeStdout = (text) => process.stdout.write(text),
    writeStderr = (text) => process.stderr.write(text),
    writeDiagnostic = (line) => process.stderr.write(`${line}\n`),
  } = {},
) {
  const label = stepLabel(args);
  writeDiagnostic(`GITNEXUS_STEP_START: ${label}`);
  const result = await runCommandWithTimeout({
    command: { executable: process.execPath, args: [runnerRelativePath, ...args] },
    cwd: repoDirectory,
    timeoutMs,
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
  if (isReusableGitNexusIndex(repoDirectory)) {
    writeDiagnostic("GITNEXUS_STEP_REUSED: analyze --index-only");
  } else {
    commands.push(["analyze", "--index-only"]);
  }
  commands.push(["status"]);
  if (options.cycles) commands.push(["check", "--cycles", "--json"]);

  for (const args of commands) {
    const result = await runGitNexusCommand(repoDirectory, args, { writeDiagnostic });
    if (result.timedOut) {
      writeDiagnostic("HOST_ENVIRONMENT: GitNexus step timed out");
      writeDiagnostic(`STEP: ${stepLabel(args)}`);
      writeDiagnostic(`ELAPSED_SECONDS: ${Math.ceil(result.elapsedSeconds)}`);
      return 1;
    }
    if (result.interrupted) {
      writeDiagnostic("HOST_ENVIRONMENT: GitNexus step interrupted");
      writeDiagnostic(`STEP: ${stepLabel(args)}`);
      writeDiagnostic(`ELAPSED_SECONDS: ${Math.ceil(result.elapsedSeconds)}`);
      return 130;
    }
    if (result.status !== 0) return result.status;
  }

  writeDiagnostic(`GITNEXUS_TOTAL_ELAPSED_SECONDS: ${((performance.now() - startedAt) / 1000).toFixed(1)}`);
  writeDiagnostic("GITNEXUS_STATUS: PASS");
  return 0;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) process.exitCode = await main();
