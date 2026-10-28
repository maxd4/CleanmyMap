#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertCoverageCandidateIdentity } from "./validation-evidence.mjs";
import { resolveCoverageCandidate } from "./coverage-publication.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultC8Executable = process.platform === "win32" ? process.execPath : "c8";
const defaultC8Script = path.join(repositoryRoot, "node_modules", "c8", "bin", "c8.js");

export function nodeCoverageCommands({
  c8Executable = defaultC8Executable,
  npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm",
  c8Script = c8Executable === process.execPath && process.platform === "win32" ? defaultC8Script : null,
} = {}) {
  return [{
    executable: c8Executable,
    args: [
      ...(c8Script ? [c8Script] : []),
      "--all",
      "--src", "scripts",
      "--src", "apps/web/scripts",
      "--exclude", "scripts/**/*.test.*",
      "--exclude", "apps/web/scripts/**/*.test.*",
      "--exclude", "scripts/coverage/**",
      "--exclude", "apps/web/scripts/coverage/**",
      "--reporter=lcov",
      "--reporter=json-summary",
      "--reports-dir=scripts/coverage",
      npmExecutable,
      "run",
      "test:scripts",
    ],
  }];
}

export function runNodeCoverage({
  spawn = spawnSync,
  nodeExecutable = process.execPath,
  c8Executable = defaultC8Executable,
  npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm",
  candidateIdentity = ({ repositoryRoot: root, scope }) => {
    const candidate = resolveCoverageCandidate({ repositoryRoot: root });
    return assertCoverageCandidateIdentity({
      repositoryRoot: root,
      candidateSha: candidate.candidateSha,
      candidateScope: candidate.candidateScope,
      scope,
    });
  },
} = {}) {
  let identity;
  try {
    identity = candidateIdentity({ repositoryRoot, scope: "node" });
  } catch (error) {
    console.error(`Node coverage candidate identity is not exact: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const executionEnvironment = { ...process.env };
  if (identity?.verified) {
    executionEnvironment.CMM_COVERAGE_CANDIDATE_IDENTITY = JSON.stringify(identity);
  } else {
    delete executionEnvironment.CMM_COVERAGE_CANDIDATE_IDENTITY;
  }
  console.log(`COVERAGE_CANDIDATE_PREFLIGHT: ${identity?.verified ? "PASS" : "DIAGNOSTIC_WORKTREE_LIVE"} (node)`);

  for (const command of nodeCoverageCommands({ c8Executable, npmExecutable })) {
    const result = spawn(command.executable, command.args, {
      cwd: repositoryRoot,
      stdio: "inherit",
      windowsHide: true,
      env: executionEnvironment,
    });
    if (result.error) {
      console.error(`Node coverage producer could not start: ${result.error.message}`);
      return result.status ?? 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }

  const proof = spawn(nodeExecutable, ["scripts/checks/write-coverage-publication-proof.mjs", "--scope=node"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    windowsHide: true,
    env: executionEnvironment,
  });
  if (proof.error) {
    console.error(`Node coverage publication could not start: ${proof.error.message}`);
    return proof.status ?? 1;
  }
  return proof.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = runNodeCoverage();
}
