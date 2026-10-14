#!/usr/bin/env node

import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  CANDIDATE_FAMILIES,
  createCandidateMaterialization,
  installCandidateSignalCleanup,
} from "./candidate-lifecycle.mjs";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/ci/run-static-candidate-check.mjs --ref=<commit> --script=<repository-relative-script> [--script=<repository-relative-script> ...] -- [checker arguments]",
  );
  process.exitCode = 2;
}

function parseArguments(argv = process.argv.slice(2)) {
  const separatorIndex = argv.indexOf("--");
  const runnerArguments = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const checkerArguments = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const refArgument = runnerArguments.find((argument) => argument.startsWith("--ref="));
  const scriptArguments = runnerArguments.filter((argument) => argument.startsWith("--script="));

  if (!refArgument || scriptArguments.length === 0) {
    usage("Both --ref and at least one --script are required.");
  }

  return {
    ref: refArgument.slice("--ref=".length),
    scripts: scriptArguments.map((argument) =>
      normalizeRepositoryPath(argument.slice("--script=".length)),
    ),
    checkerArguments,
  };
}

function normalizeRepositoryPath(value) {
  const normalizedSeparators = String(value ?? "").replaceAll("\\", "/");
  if (
    !normalizedSeparators ||
    normalizedSeparators.startsWith("/") ||
    path.posix.isAbsolute(normalizedSeparators) ||
    normalizedSeparators.split("/").includes("..")
  ) {
    throw new Error(`Expected a repository-relative path without '..': ${value}`);
  }

  const normalized = path.posix.normalize(normalizedSeparators);
  if (normalized === "." || normalized !== normalizedSeparators) {
    throw new Error(`Expected a normalized repository-relative path: ${value}`);
  }
  return normalized;
}

function git(repositoryRoot, arguments_, options = {}) {
  return execFileSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  }).trim();
}

function readGitTree(repositoryRoot, candidateSha) {
  const output = execFileSync("git", ["ls-tree", "--full-tree", "-r", "-z", candidateSha, "--"], {
    cwd: repositoryRoot,
    maxBuffer: 64 * 1024 * 1024,
  });

  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf("\t");
      const [mode, type, objectId] = record.slice(0, separator).split(" ");
      return { mode, type, objectId, relativePath: record.slice(separator + 1) };
    });
}

function readGitBlobs(repositoryRoot, entries) {
  const objectIds = [...new Set(entries.filter((entry) => entry.type === "blob").map((entry) => entry.objectId))];
  const batchOutput = execFileSync("git", ["cat-file", "--batch"], {
    cwd: repositoryRoot,
    input: `${objectIds.join("\n")}\n`,
    maxBuffer: 256 * 1024 * 1024,
  });
  const blobs = new Map();
  let offset = 0;

  for (const objectId of objectIds) {
    const headerEnd = batchOutput.indexOf(10, offset);
    if (headerEnd < 0) throw new Error(`Git blob header is missing for ${objectId}`);
    const header = batchOutput.toString("utf8", offset, headerEnd).split(" ");
    offset = headerEnd + 1;
    if (header[1] !== "blob") throw new Error(`Expected a Git blob for ${objectId}`);
    const size = Number(header[2]);
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > batchOutput.length) {
      throw new Error(`Invalid Git blob size for ${objectId}`);
    }
    blobs.set(objectId, Buffer.from(batchOutput.subarray(offset, offset + size)));
    offset += size + 1;
  }

  return blobs;
}

function materializeGitTree(candidateTreeRoot, entries, blobs) {
  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    const destination = path.join(candidateTreeRoot, ...entry.relativePath.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, blobs.get(entry.objectId), {
      mode: entry.mode === "100755" ? 0o755 : 0o644,
    });
  }
}

function materializeCandidate(repositoryRoot, candidateRef, scripts) {
  const candidateSha = git(repositoryRoot, ["rev-parse", "--verify", `${candidateRef}^{commit}`]);
  const lifecycle = createCandidateMaterialization({
    repositoryRoot,
    family: CANDIDATE_FAMILIES.PREPUSH,
    key: candidateSha,
    purpose: "static-validation",
  });
  const { materializedRoot } = lifecycle;
  const candidateTreeRoot = path.join(materializedRoot, "tree");
  fs.mkdirSync(candidateTreeRoot);

  try {
    for (const script of scripts) {
      git(repositoryRoot, ["cat-file", "-e", `${candidateSha}:${script}`]);
    }
    const entries = readGitTree(repositoryRoot, candidateSha);
    const blobs = readGitBlobs(repositoryRoot, entries);
    materializeGitTree(candidateTreeRoot, entries, blobs);

    return {
      ...lifecycle,
      candidateSha,
      candidateTreeRoot,
      materializedRoot,
      trackedPaths: entries.filter((entry) => entry.type === "blob").map((entry) => entry.relativePath),
    };
  } catch (error) {
    lifecycle.cleanup();
    throw error;
  }
}

function fingerprintCandidateTree(candidateTreeRoot, trackedPaths) {
  const hash = createHash("sha256");

  for (const relativePath of [...trackedPaths].sort()) {
    const absolutePath = path.join(candidateTreeRoot, ...relativePath.split("/"));
    let descriptor;
    try {
      descriptor = fs.openSync(absolutePath, "r");
      if (!fs.fstatSync(descriptor).isFile()) throw new Error(`Candidate source is missing tracked file: ${relativePath}`);
      hash.update(relativePath);
      hash.update("\0");
      hash.update(fs.readFileSync(descriptor));
      hash.update("\0");
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`Candidate source is missing tracked file: ${relativePath}`);
      throw error;
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  }

  return hash.digest("hex");
}

function run() {
  const { ref, scripts, checkerArguments } = parseArguments();
  const repositoryRoot = path.resolve(process.cwd());
  const totalStartedAt = performance.now();
  const preparationStartedAt = performance.now();
  const materialization = materializeCandidate(repositoryRoot, ref, scripts);
  const preparationSeconds = (performance.now() - preparationStartedAt) / 1000;
  const detachSignalCleanup = installCandidateSignalCleanup(materialization);
  const candidateFingerprint = fingerprintCandidateTree(
    materialization.candidateTreeRoot,
    materialization.trackedPaths,
  );
  let checksExecuted = 0;
  let exitCode = 1;

  try {
    for (const script of scripts) {
      const candidateScriptPath = path.join(materialization.candidateTreeRoot, ...script.split("/"));
      const candidateArguments = [
        ...checkerArguments.filter((argument) => !argument.startsWith("--ref=")),
        `--ref=${materialization.candidateSha}`,
      ];
      const result = spawnSync(process.execPath, [candidateScriptPath, ...candidateArguments], {
        cwd: materialization.candidateTreeRoot,
        env: {
          ...process.env,
          CMM_STATIC_CANDIDATE_SHA: materialization.candidateSha,
          CMM_STATIC_CANDIDATE_ROOT: materialization.candidateTreeRoot,
        },
        stdio: "inherit",
        windowsHide: true,
      });

      checksExecuted += 1;
      if (result.error) throw result.error;

      const currentFingerprint = fingerprintCandidateTree(
        materialization.candidateTreeRoot,
        materialization.trackedPaths,
      );
      if (currentFingerprint !== candidateFingerprint) {
        throw new Error(`Static checker mutated the candidate source tree: ${script}`);
      }

      if (typeof result.status !== "number") {
        exitCode = 1;
        break;
      }
      if (result.status !== 0) {
        exitCode = result.status;
        break;
      }

      exitCode = 0;
    }
  } finally {
    detachSignalCleanup();
    const cleanupStartedAt = performance.now();
    materialization.cleanup();
    const cleanupSeconds = (performance.now() - cleanupStartedAt) / 1000;
    const totalSeconds = (performance.now() - totalStartedAt) / 1000;
    console.log(`STATIC_CANDIDATE_SHA: ${materialization.candidateSha}`);
    console.log(`STATIC_CANDIDATE_CHECKS: ${scripts.length}`);
    console.log(`STATIC_CANDIDATE_CHECKS_EXECUTED: ${checksExecuted}`);
    console.log("STATIC_CANDIDATE_MATERIALIZATIONS: 1");
    console.log(`STATIC_CANDIDATE_PREPARATION_SECONDS: ${preparationSeconds.toFixed(3)}`);
    console.log(`STATIC_CANDIDATE_CLEANUP_SECONDS: ${cleanupSeconds.toFixed(3)}`);
    console.log(`STATIC_CANDIDATE_TOTAL_SECONDS: ${totalSeconds.toFixed(3)}`);
  }

  return exitCode;
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(`[static-candidate-runner] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
