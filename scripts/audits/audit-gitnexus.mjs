#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerRelativePath = ".gitnexus/run.cjs";

export function parseArgs(argv) {
  if (argv.length === 0) {
    return { cycles: false };
  }

  if (argv.length === 1 && argv[0] === "--cycles") {
    return { cycles: true };
  }

  throw new Error("Usage: node scripts/audits/audit-gitnexus.mjs [--cycles]");
}

export function runGitNexusCommand(repoDirectory, args) {
  const result = spawnSync(process.execPath, [runnerRelativePath, ...args], {
    cwd: repoDirectory,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`GitNexus command failed: ${result.error.message}`);
  }

  return result.status ?? 1;
}

export function main(argv = process.argv.slice(2), repoDirectory = repoRoot) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  if (!fs.existsSync(path.join(repoDirectory, runnerRelativePath))) {
    console.error(
      `GitNexus runner missing: ${runnerRelativePath}. Run the repository setup before auditing.`,
    );
    return 1;
  }

  const commands = [
    ["analyze", "--index-only"],
    ["status"],
  ];
  if (options.cycles) {
    commands.push(["check", "--cycles", "--json"]);
  }

  for (const args of commands) {
    const exitCode = runGitNexusCommand(repoDirectory, args);
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  return 0;
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  process.exitCode = main();
}
