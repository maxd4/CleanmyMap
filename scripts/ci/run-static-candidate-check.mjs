#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/ci/run-static-candidate-check.mjs --ref=<commit> --script=<repository-relative-script> -- [checker arguments]",
  );
  process.exitCode = 2;
}

function parseArguments(argv = process.argv.slice(2)) {
  const separatorIndex = argv.indexOf("--");
  const runnerArguments = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const checkerArguments = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const refArgument = runnerArguments.find((argument) => argument.startsWith("--ref="));
  const scriptArgument = runnerArguments.find((argument) => argument.startsWith("--script="));

  if (!refArgument || !scriptArgument) {
    usage("Both --ref and --script are required.");
  }

  return {
    ref: refArgument.slice("--ref=".length),
    script: normalizeRepositoryPath(scriptArgument.slice("--script=".length)),
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

function materializeCandidate(repositoryRoot, candidateRef, script) {
  const candidateSha = git(repositoryRoot, ["rev-parse", "--verify", `${candidateRef}^{commit}`]);
  const candidateScriptRoot = path.join(repositoryRoot, ".artifacts");
  const hadArtifactsRoot = fs.existsSync(candidateScriptRoot);
  fs.mkdirSync(candidateScriptRoot, { recursive: true });

  const materializedRoot = fs.mkdtempSync(
    path.join(candidateScriptRoot, ".static-candidate-"),
  );
  const candidateTreeRoot = path.join(materializedRoot, "tree");
  fs.mkdirSync(candidateTreeRoot);

  try {
    git(repositoryRoot, [
      "cat-file",
      "-e",
      `${candidateSha}:${script}`,
    ]);
    const entries = readGitTree(repositoryRoot, candidateSha);
    const blobs = readGitBlobs(repositoryRoot, entries);
    materializeGitTree(candidateTreeRoot, entries, blobs);

    return {
      candidateSha,
      candidateTreeRoot,
      materializedRoot,
      hadArtifactsRoot,
    };
  } catch (error) {
    fs.rmSync(materializedRoot, { recursive: true, force: true });
    if (!hadArtifactsRoot && fs.readdirSync(candidateScriptRoot).length === 0) {
      fs.rmdirSync(candidateScriptRoot);
    }
    throw error;
  }
}

function cleanupMaterialization(materialization) {
  fs.rmSync(materialization.materializedRoot, { recursive: true, force: true });
  const artifactsRoot = path.dirname(materialization.materializedRoot);
  if (!materialization.hadArtifactsRoot && fs.readdirSync(artifactsRoot).length === 0) {
    fs.rmdirSync(artifactsRoot);
  }
}

function run() {
  const { ref, script, checkerArguments } = parseArguments();
  const repositoryRoot = path.resolve(process.cwd());
  const materialization = materializeCandidate(repositoryRoot, ref, script);

  try {
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

    if (result.error) throw result.error;
    if (typeof result.status === "number") return result.status;
    return 1;
  } finally {
    cleanupMaterialization(materialization);
  }
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(`[static-candidate-runner] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
