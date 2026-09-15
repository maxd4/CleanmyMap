#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  cleanupValidationEvidence,
  createCandidateFingerprint,
  createValidationEvidenceKey,
  readFastValidationEvidence,
  writeFastValidationEvidence,
} from "./validation-evidence.mjs";
import {
  classifyValidationFailure,
  createModeValidationPlan,
  getBudgetDecision,
  VALIDATION_MODE_BUDGETS,
} from "./validation-modes.mjs";
import { runCommandWithTimeout } from "./validation-process.mjs";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

function parseArgs(argv) {
  const options = { mode: "FAST", candidateScope: "WORKTREE", changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--mode" && next) {
      options.mode = next.toUpperCase();
      index += 1;
    } else if (arg === "--candidate-scope" && next) {
      options.candidateScope = next.toUpperCase();
      index += 1;
    } else if (arg === "--changed-file" && next) {
      options.changedFiles.push(next);
      index += 1;
    }
  }
  return options;
}

function readLines(executable, args, cwd = process.cwd()) {
  try {
    return execFileSync(executable, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getCandidateFiles(scope, cwd = process.cwd()) {
  if (scope === "STAGED") {
    return [...new Set(readLines("git", ["diff", "--cached", "--name-only", "--"], cwd))];
  }
  return [
    ...new Set([
      ...readLines("git", ["diff", "--name-only", "HEAD", "--"], cwd),
      ...readLines("git", ["diff", "--cached", "--name-only", "--"], cwd),
      ...readLines("git", ["ls-files", "--others", "--exclude-standard"], cwd),
    ]),
  ];
}

function commandFor(check) {
  return {
    executable: check.command.executable === "npm"
      ? npmExecutable
      : check.command.executable === "npx" && process.platform === "win32"
        ? "npx.cmd"
        : check.command.executable,
    args: check.command.args,
  };
}

export function runCheck(check, remainingSeconds, cwd = process.cwd()) {
  const command = commandFor(check);
  const timeoutMs = Math.max(1000, Math.floor(remainingSeconds * 1000));
  console.log(`\n==> ${check.label}`);
  return runCommandWithTimeout({ command, cwd, timeoutMs });
}

function printReport({
  plan,
  elapsedSeconds,
  passed,
  failed,
  notRun,
  timedOut,
  reused,
  preexisting,
  cleanupError,
}) {
  console.log(`\nVALIDATION_MODE: ${plan.mode}`);
  console.log(`CANDIDATE_SCOPE: ${plan.candidateScope}`);
  console.log(`ELAPSED_SECONDS: ${elapsedSeconds.toFixed(1)}`);
  console.log(`TIME_BUDGET_SECONDS: ${plan.budgetSeconds}`);
  console.log("CHECKS_PASSED:");
  for (const value of passed) console.log(`- ${value}`);
  console.log("CHECKS_REUSED:");
  for (const value of reused) console.log(`- ${value.id}: ALREADY_PROVEN (${value.reason})`);
  console.log("CHECKS_PREEXISTING_PARALLEL_FAILURE:");
  for (const value of preexisting) console.log(`- ${value}`);
  console.log("CHECKS_FAILED:");
  for (const value of failed) console.log(`- ${value}`);
  console.log("CHECKS_NOT_RUN:");
  for (const value of notRun) console.log(`- ${value.id}\n  reason: ${value.reason}`);
  for (const value of plan.deduplicated) console.log(`- ${value.id}: ${value.status} (${value.reason})`);
  if (timedOut) console.log("TIME_BUDGET_EXCEEDED: yes");
  if (cleanupError) console.log(`CLEANUP_FAILED: ${cleanupError.message}`);
  const verdict = timedOut || failed.length > 0 || cleanupError
    ? "FAIL"
    : notRun.length > 0
      ? "INCOMPLETE"
      : "PASS";
  console.log(`VERDICT: ${verdict}`);
  return verdict;
}

export async function runValidationMode(
  options = parseArgs(process.argv.slice(2)),
  runtime = {},
) {
  const repositoryRoot = runtime.repositoryRoot ?? process.cwd();
  const changedFiles = options.changedFiles.length > 0
    ? options.changedFiles
    : getCandidateFiles(options.candidateScope, repositoryRoot);
  const plan = createModeValidationPlan({ ...options, changedFiles });
  const candidateFingerprint = createCandidateFingerprint({
    repositoryRoot,
    candidateScope: plan.candidateScope,
    changedFiles,
  });
  const fastEvidence = plan.mode === "FULL"
    ? readFastValidationEvidence({ repositoryRoot, candidateFingerprint })
    : new Map();
  const fastEvidenceEntries = plan.mode === "FAST"
    ? readFastValidationEvidence({ repositoryRoot, candidateFingerprint })
    : new Map();
  const startedAt = performance.now();
  const passed = [];
  const failed = [];
  const notRun = [];
  const reused = [];
  const preexisting = [];
  let timedOut = false;
  let cleanupError;
  const executeCheck = runtime.runCheck ?? runCheck;

  try {
    for (const check of plan.checks) {
      const evidenceKey = createValidationEvidenceKey({
        candidateFingerprint,
        check,
        candidateScope: plan.candidateScope,
        budgetSeconds: plan.budgetSeconds,
      });
      if (plan.mode === "FULL" && fastEvidence.has(evidenceKey)) {
        reused.push({ id: check.id, reason: "preuve FAST du même candidat et de la même commande" });
        continue;
      }

      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const decision = getBudgetDecision({
        elapsedSeconds,
        estimatedSeconds: check.estimatedSeconds,
        budgetSeconds: VALIDATION_MODE_BUDGETS[plan.mode],
      });
      if (decision.decision === "skip") {
        notRun.push({ id: check.id, reason: "NOT_RUN_TIME_BUDGET" });
        continue;
      }
      const result = await executeCheck(check, decision.remainingSeconds, repositoryRoot);
      if (result.status === "PASS") {
        passed.push(check.id);
        if (plan.mode === "FAST") {
          fastEvidenceEntries.set(evidenceKey, {
            checkId: check.id,
            command: check.command,
            passedAt: new Date().toISOString(),
          });
          writeFastValidationEvidence({
            repositoryRoot,
            candidateFingerprint,
            entries: fastEvidenceEntries,
          });
        }
      } else if (result.status === "TIME_BUDGET_EXCEEDED") {
        timedOut = true;
        failed.push(`${check.id}: TIME_BUDGET_EXCEEDED`);
        break;
      } else {
        const classification = classifyValidationFailure({
          candidateChangedFiles: changedFiles,
          failureFiles: result.failureFiles ?? [],
          preexistingProof: result.preexistingProof ?? check.preexistingProof,
        });
        if (classification === "PREEXISTING_PARALLEL_FAILURE") {
          preexisting.push(`${check.id}: ${classification}`);
        } else {
          failed.push(`${check.id}: exit ${result.exitCode ?? 1}`);
        }
      }
    }
  } finally {
    if (plan.mode === "FULL") {
      try {
        cleanupValidationEvidence({ repositoryRoot, candidateFingerprint });
      } catch (error) {
        cleanupError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const verdict = printReport({
    plan,
    elapsedSeconds,
    passed,
    failed,
    notRun,
    timedOut,
    reused,
    preexisting,
    cleanupError,
  });
  return verdict === "PASS" ? 0 : verdict === "INCOMPLETE" ? 2 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("run_validation_mode.mjs")) {
  process.exitCode = await runValidationMode();
}
