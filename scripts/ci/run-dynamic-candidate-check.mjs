#!/usr/bin/env node

import fs from "node:fs";
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
    "Usage: node scripts/ci/run-dynamic-candidate-check.mjs --ref=<commit> --command=<tool> -- [arguments]",
  );
  process.exitCode = 2;
}

function parseArguments(argv = process.argv.slice(2)) {
  const separatorIndex = argv.indexOf("--");
  const runnerArguments = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const commandArguments = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const refArgument = runnerArguments.find((argument) => argument.startsWith("--ref="));
  const commandArgument = runnerArguments.find((argument) => argument.startsWith("--command="));

  if (!refArgument || !commandArgument) {
    usage("Both --ref and --command are required.");
  }

  const command = commandArgument.slice("--command=".length);
  if (!command) usage("--command must not be empty.");
  return {
    ref: refArgument.slice("--ref=".length),
    command,
    commandArguments,
  };
}

function cleanGitEnvironment() {
  const environment = { ...process.env };
  delete environment.GIT_DIR;
  delete environment.GIT_WORK_TREE;
  delete environment.GIT_INDEX_FILE;
  return environment;
}

function git(repositoryRoot, arguments_, options = {}) {
  return execFileSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: cleanGitEnvironment(),
    ...options,
  }).trim();
}

function readGitTree(repositoryRoot, candidateSha) {
  const output = execFileSync("git", ["ls-tree", "--full-tree", "-r", "-z", candidateSha, "--"], {
    cwd: repositoryRoot,
    env: cleanGitEnvironment(),
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
    env: cleanGitEnvironment(),
    input: objectIds.length > 0 ? objectIds.join("\n") + "\n" : "",
    maxBuffer: 256 * 1024 * 1024,
  });
  const blobs = new Map();
  let offset = 0;
  for (const objectId of objectIds) {
    const headerEnd = batchOutput.indexOf(10, offset);
    if (headerEnd < 0) throw new Error("Git blob header is missing for " + objectId);
    const header = batchOutput.toString("utf8", offset, headerEnd).split(" ");
    offset = headerEnd + 1;
    if (header[1] !== "blob") throw new Error("Expected a Git blob for " + objectId);
    const size = Number(header[2]);
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > batchOutput.length) {
      throw new Error("Invalid Git blob size for " + objectId);
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

function mapRepositoryPath(candidateTreeRoot, repositoryRoot, sourcePath) {
  const relativeSource = path.relative(repositoryRoot, sourcePath);
  if (relativeSource.startsWith(".." + path.sep) || path.isAbsolute(relativeSource)) return null;
  return path.join(candidateTreeRoot, relativeSource);
}

function linkDirectory(candidateTreeRoot, relativePath, sourcePath, linkedPaths) {
  if (!fs.existsSync(sourcePath)) return;
  const destination = path.join(candidateTreeRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(sourcePath, destination, "junction");
  linkedPaths.push(destination);
}

function materializeLocalDependencyDirectory(candidateTreeRoot, repositoryRoot, relativePath, sourcePath, linkedPaths) {
  if (!fs.existsSync(sourcePath)) return;
  const destination = path.join(candidateTreeRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  const materializeEntry = (source, target) => {
    const sourceStat = fs.lstatSync(source);
    if (sourceStat.isSymbolicLink()) {
      const resolvedSource = fs.realpathSync(source);
      const mappedTarget = mapRepositoryPath(candidateTreeRoot, repositoryRoot, resolvedSource);
      if (mappedTarget) {
        fs.symlinkSync(mappedTarget, target, "junction");
        linkedPaths.push(target);
        return;
      }
      fs.cpSync(resolvedSource, target, { recursive: true, dereference: true });
      return;
    }
    fs.cpSync(source, target, { recursive: true, dereference: true });
  };

  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(sourcePath)) {
    materializeEntry(path.join(sourcePath, entry), path.join(destination, entry));
  }
}

function findGitExecutable() {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  return execFileSync(locator, ["git"], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function createGitShim(materialization) {
  const realGit = findGitExecutable();
  if (!realGit) throw new Error("HOST_ENVIRONMENT: git is unavailable for dynamic candidate validation.");
  const shimRoot = path.join(materialization.materializedRoot, "git-shim");
  fs.mkdirSync(shimRoot);
  const helperPath = path.join(shimRoot, "git-wrapper.cjs");
  fs.writeFileSync(
    helperPath,
    [
      'const { spawnSync } = require("node:child_process");',
      'const path = require("node:path");',
      `const realGit = ${JSON.stringify(realGit)};`,
      'const candidateRoot = path.resolve(process.env.CMM_DYNAMIC_CANDIDATE_ROOT || "");',
      'const currentDirectory = path.resolve(process.cwd());',
      'const insideCandidate = currentDirectory === candidateRoot || currentDirectory.startsWith(candidateRoot + path.sep);',
      'const environment = { ...process.env };',
      'if (!insideCandidate) { delete environment.GIT_DIR; delete environment.GIT_WORK_TREE; delete environment.GIT_INDEX_FILE; }',
      'const result = spawnSync(realGit, process.argv.slice(2), { cwd: process.cwd(), env: environment, stdio: "inherit", windowsHide: true });',
      'if (result.error) { console.error(result.error.message); process.exitCode = 127; } else { process.exitCode = result.status ?? 1; }',
      "",
    ].join("\n"),
  );
  const commandPath = path.join(shimRoot, process.platform === "win32" ? "git.cmd" : "git");
  if (process.platform === "win32") {
    fs.writeFileSync(commandPath, `@echo off\r\n"${process.execPath}" "${helperPath}" %*\r\nexit /b %errorlevel%\r\n`);
  } else {
    fs.writeFileSync(commandPath, `#!/bin/sh\nexec "${process.execPath}" "${helperPath}" "$@"\n`, { mode: 0o755 });
  }
  materialization.gitShimRoot = shimRoot;
}

function createCandidateGitDirectory(materialization) {
  const gitDirectory = path.join(materialization.candidateTreeRoot, ".git");
  fs.mkdirSync(path.join(gitDirectory, "objects", "info"), { recursive: true });
  fs.mkdirSync(path.join(gitDirectory, "objects", "pack"), { recursive: true });
  fs.mkdirSync(path.join(gitDirectory, "refs", "heads"), { recursive: true });
  fs.mkdirSync(path.join(gitDirectory, "refs", "remotes", "origin"), { recursive: true });
  fs.mkdirSync(path.join(gitDirectory, "refs", "tags"), { recursive: true });
  fs.mkdirSync(path.join(gitDirectory, "hooks"), { recursive: true });
  fs.writeFileSync(path.join(gitDirectory, "description"), "Candidate validation repository.\n");
  fs.writeFileSync(path.join(gitDirectory, "HEAD"), `${materialization.candidateSha}\n`);
  fs.writeFileSync(path.join(gitDirectory, "refs", "remotes", "origin", "main"), `${materialization.candidateSha}\n`);
  fs.writeFileSync(
    path.join(gitDirectory, "config"),
    [
      "[core]",
      "\trepositoryformatversion = 0",
      "\tfilemode = false",
      "\tbare = false",
      `\tworktree = ${materialization.candidateTreeRoot.replaceAll("\\", "/")}`,
      "\tlogallrefupdates = false",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(gitDirectory, "objects", "info", "alternates"),
    `${path.join(materialization.repositoryRoot, ".git", "objects")}\n`,
  );
  fs.copyFileSync(materialization.candidateIndexPath, path.join(gitDirectory, "index"));
  materialization.gitDirectory = gitDirectory;
}

function materializeCandidate(repositoryRoot, candidateRef, { materializeRootDependencies = false } = {}) {
  const candidateSha = git(repositoryRoot, ["rev-parse", "--verify", candidateRef + "^{commit}"]);
  const lifecycle = createCandidateMaterialization({
    repositoryRoot,
    family: CANDIDATE_FAMILIES.PREPUSH,
    key: candidateSha,
    purpose: "dynamic-validation",
  });
  const { candidateRoot, materializedRoot } = lifecycle;
  const candidateTreeRoot = path.join(materializedRoot, "tree");
  const candidateIndexPath = path.join(materializedRoot, "candidate.index");
  const linkedPaths = [];
  lifecycle.linkedPaths = linkedPaths;
  fs.mkdirSync(candidateTreeRoot);

  try {
    const entries = readGitTree(repositoryRoot, candidateSha);
    const blobs = readGitBlobs(repositoryRoot, entries);
    materializeGitTree(candidateTreeRoot, entries, blobs);
    if (materializeRootDependencies) {
      materializeLocalDependencyDirectory(
        candidateTreeRoot,
        repositoryRoot,
        "node_modules",
        path.join(repositoryRoot, "node_modules"),
        linkedPaths,
      );
    } else {
      linkDirectory(candidateTreeRoot, "node_modules", path.join(repositoryRoot, "node_modules"), linkedPaths);
    }
    materializeLocalDependencyDirectory(
      candidateTreeRoot,
      repositoryRoot,
      "apps/web/node_modules",
      path.join(repositoryRoot, "apps", "web", "node_modules"),
      linkedPaths,
    );
    linkDirectory(
      candidateTreeRoot,
      "apps/mobile/node_modules",
      path.join(repositoryRoot, "apps", "mobile", "node_modules"),
      linkedPaths,
    );
    linkDirectory(candidateTreeRoot, ".vercel", path.join(repositoryRoot, ".vercel"), linkedPaths);
    linkDirectory(
      candidateTreeRoot,
      "apps/web/.vercel",
      path.join(repositoryRoot, "apps", "web", ".vercel"),
      linkedPaths,
    );

    const gitEnvironment = {
      ...process.env,
      GIT_DIR: path.join(repositoryRoot, ".git"),
      GIT_WORK_TREE: candidateTreeRoot,
      GIT_INDEX_FILE: candidateIndexPath,
    };
    git(repositoryRoot, ["read-tree", candidateSha], {
      cwd: candidateTreeRoot,
      env: gitEnvironment,
    });
    const materialization = {
      ...lifecycle,
      repositoryRoot,
      candidateSha,
      candidateTreeRoot,
      materializedRoot,
      candidateRoot,
      candidateIndexPath,
      gitEnvironment,
      linkedPaths,
    };
    createCandidateGitDirectory(materialization);
    createGitShim(materialization);
    return materialization;
  } catch (error) {
    lifecycle.cleanup(linkedPaths);
    throw error;
  }
}

function resolveInvocation(command) {
  if (process.platform !== "win32") return { executable: command, prefixArguments: [], shell: false };
  if (command === "node") return { executable: process.execPath, prefixArguments: [], shell: false };
  if (command === "npm" || command === "npx") {
    const cliName = command === "npm" ? "npm-cli.js" : "npx-cli.js";
    const cliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", cliName);
    if (fs.existsSync(cliPath)) {
      return { executable: process.execPath, prefixArguments: [cliPath], shell: false };
    }
    return { executable: null, prefixArguments: [], shell: false };
  }
  return { executable: command, prefixArguments: [], shell: false };
}

function run() {
  const { ref, command, commandArguments } = parseArguments();
  const repositoryRoot = path.resolve(process.cwd());
  const materializeRootDependencies =
    (command === "npm" && commandArguments.some((argument) => argument === "build")) ||
    (command === "npx" && commandArguments.includes("vercel") && commandArguments.includes("build"));
  const materialization = materializeCandidate(repositoryRoot, ref, { materializeRootDependencies });
  const detachSignalCleanup = installCandidateSignalCleanup(materialization);
  try {
    const invocation = resolveInvocation(command);
    if (!invocation.executable) {
      console.error(
        '[dynamic-candidate] HOST_ENVIRONMENT: required tool "' +
          command +
          '" is unavailable in the local environment.',
      );
      return 127;
    }
    const childEnvironment = cleanGitEnvironment();
    delete childEnvironment.CMM_DYNAMIC_CANDIDATE_ROOT;
    const result = spawnSync(invocation.executable, [...invocation.prefixArguments, ...commandArguments], {
      cwd: materialization.candidateTreeRoot,
      env: {
        ...childEnvironment,
        PATH: [materialization.gitShimRoot, process.env.PATH].filter(Boolean).join(path.delimiter),
        CMM_DYNAMIC_CANDIDATE_SHA: materialization.candidateSha,
        CMM_DYNAMIC_CANDIDATE_ROOT: materialization.candidateTreeRoot,
        CMM_VALIDATION_SCOPE: "DYNAMIC_CANDIDATE",
      },
      stdio: "inherit",
      windowsHide: true,
      shell: invocation.shell,
    });
    if (result.error) {
      if (result.error.code === "ENOENT") {
        console.error(
          '[dynamic-candidate] HOST_ENVIRONMENT: required tool "' +
            command +
            '" is unavailable in the local environment.',
        );
      } else {
        console.error('[dynamic-candidate] failed to start "' + command + '": ' + result.error.message);
      }
      return 127;
    }
    return typeof result.status === "number" ? result.status : 1;
  } finally {
    detachSignalCleanup();
    materialization.cleanup(materialization.linkedPaths);
  }
}

try {
  process.exitCode = run();
} catch (error) {
  console.error("[dynamic-candidate] " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
