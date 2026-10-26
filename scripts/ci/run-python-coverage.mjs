#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function resolvePythonExecutable({
  platform = process.platform,
  root = repositoryRoot,
  fileExists = existsSync,
} = {}) {
  const relativePath = platform === "win32"
    ? ["maintenance", "python", ".venv", "Scripts", "python.exe"]
    : ["maintenance", "python", ".venv", "bin", "python"];
  const declaredExecutable = path.join(root, ...relativePath);
  return fileExists(declaredExecutable) ? declaredExecutable : "python";
}

export function pythonCoverageCommands({ pythonExecutable = resolvePythonExecutable() } = {}) {
  return [
    {
      executable: pythonExecutable,
      args: [
        "-m", "coverage", "run", "--branch",
        "--source=maintenance/python/src,maintenance/python/scripts",
        "--data-file=maintenance/python/.coverage.sonar",
        "-m", "pytest", "-q", "maintenance/python/tests",
      ],
    },
    {
      executable: pythonExecutable,
      args: ["-m", "coverage", "xml", "--data-file=maintenance/python/.coverage.sonar", "-o", "maintenance/python/coverage.xml"],
    },
  ];
}

export function runPythonCoverage({
  spawn = spawnSync,
  pythonExecutable = resolvePythonExecutable(),
  nodeExecutable = process.execPath,
} = {}) {
  for (const command of pythonCoverageCommands({ pythonExecutable })) {
    const result = spawn(command.executable, command.args, {
      cwd: repositoryRoot,
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.error) {
      console.error(`Python coverage producer could not start: ${result.error.message}`);
      return result.status ?? 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  const proof = spawn(nodeExecutable, ["scripts/checks/write-coverage-publication-proof.mjs", "--scope=python"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  if (proof.error) {
    console.error(`Python coverage publication could not start: ${proof.error.message}`);
    return proof.status ?? 1;
  }
  return proof.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = runPythonCoverage();
}
