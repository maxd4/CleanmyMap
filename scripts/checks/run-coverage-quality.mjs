#!/usr/bin/env node

import process from "node:process";

import { validateCoverageEvidence } from "./coverage-evidence.mjs";
import { runCommandWithTimeout, resolveValidationCommand } from "../ci/validation-process.mjs";

const repositoryRoot = process.cwd();
const fromExistingSummary = process.argv.includes("--from-existing-summary");

async function run(command) {
  const resolved = resolveValidationCommand(command, process.platform, process.execPath);
  const result = await runCommandWithTimeout({
    command: resolved,
    cwd: repositoryRoot,
    onStdout: (text) => process.stdout.write(text),
    onStderr: (text) => process.stderr.write(text),
  });
  if (result.status !== "PASS") process.exitCode = result.exitCode ?? 1;
  return result.status === "PASS";
}

let reusableEvidence = false;
if (!fromExistingSummary) {
  try {
    validateCoverageEvidence({ repositoryRoot });
    reusableEvidence = true;
    console.log("ALREADY_PROVEN: web coverage execution");
    console.log("REUSED_EVIDENCE_SOURCE: apps/web/coverage/coverage-evidence.json");
  } catch {
    reusableEvidence = false;
  }
  if (!reusableEvidence && !await run({ executable: "npm", args: ["run", "test:coverage"] })) process.exitCode = 1;
}

if (!process.exitCode || process.exitCode === 0) {
  const checkerArgs = ["scripts/checks/check-coverage.mjs", "--from-existing-summary"];
  await run({ executable: process.execPath, args: checkerArgs });
}
