#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { createModeValidationPlan, getBudgetDecision, VALIDATION_MODE_BUDGETS } from "./validation-modes.mjs";

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

function readLines(executable, args) {
  try {
    return execFileSync(executable, args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getCandidateFiles(scope) {
  if (scope === "STAGED") {
    return [...new Set(readLines("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"]))];
  }
  return [
    ...new Set([
      ...readLines("git", ["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD", "--"]),
      ...readLines("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"]),
      ...readLines("git", ["ls-files", "--others", "--exclude-standard"]),
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

function runCheck(check, remainingSeconds) {
  const command = commandFor(check);
  const timeoutMs = Math.max(1000, Math.floor(remainingSeconds * 1000));
  console.log(`\n==> ${check.label}`);
  const quoteCmdArg = (value) => {
    const text = String(value);
    return /^[A-Za-z0-9_./:-]+$/.test(text)
      ? text
      : `"${text.replaceAll('"', '\\"')}"`;
  };
  const spawnExecutable = process.platform === "win32" && command.executable.endsWith(".cmd")
    ? process.env.ComSpec || "cmd.exe"
    : command.executable;
  const spawnArgs = process.platform === "win32" && command.executable.endsWith(".cmd")
    ? ["/d", "/s", "/c", [command.executable, ...command.args.map(quoteCmdArg)].join(" ")]
    : command.args;
  const result = spawnSync(spawnExecutable, spawnArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    timeout: timeoutMs,
    windowsHide: true,
  });
  if (result.error?.code === "ETIMEDOUT") {
    return { status: "TIME_BUDGET_EXCEEDED", exitCode: null };
  }
  return { status: result.status === 0 ? "PASS" : "FAIL", exitCode: result.status ?? 1 };
}

function printReport({ plan, elapsedSeconds, passed, failed, notRun, timedOut }) {
  console.log(`\nVALIDATION_MODE: ${plan.mode}`);
  console.log(`CANDIDATE_SCOPE: ${plan.candidateScope}`);
  console.log(`ELAPSED_SECONDS: ${elapsedSeconds.toFixed(1)}`);
  console.log(`TIME_BUDGET_SECONDS: ${plan.budgetSeconds}`);
  console.log("CHECKS_PASSED:");
  for (const value of passed) console.log(`- ${value}`);
  console.log("CHECKS_FAILED:");
  for (const value of failed) console.log(`- ${value}`);
  console.log("CHECKS_NOT_RUN:");
  for (const value of notRun) console.log(`- ${value.id}\n  reason: ${value.reason}`);
  for (const value of plan.deduplicated) console.log(`- ${value.id}: ${value.status} (${value.reason})`);
  if (timedOut) console.log("TIME_BUDGET_EXCEEDED: yes");
  const verdict = timedOut || failed.length > 0 ? "FAIL" : notRun.length > 0 ? "INCOMPLETE" : "PASS";
  console.log(`VERDICT: ${verdict}`);
  return verdict;
}

export function runValidationMode(options = parseArgs(process.argv.slice(2))) {
  const changedFiles = options.changedFiles.length > 0
    ? options.changedFiles
    : getCandidateFiles(options.candidateScope);
  const plan = createModeValidationPlan({ ...options, changedFiles });
  const startedAt = performance.now();
  const passed = [];
  const failed = [];
  const notRun = [];
  let timedOut = false;

  try {
    for (const check of plan.checks) {
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
      const result = runCheck(check, decision.remainingSeconds);
      if (result.status === "PASS") passed.push(check.id);
      else if (result.status === "TIME_BUDGET_EXCEEDED") {
        timedOut = true;
        failed.push(`${check.id}: TIME_BUDGET_EXCEEDED`);
        break;
      } else failed.push(`${check.id}: exit ${result.exitCode}`);
    }
  } finally {
    // Checks run synchronously and create no candidate or persistent process.
    // This finally is the cleanup boundary for future command adapters.
  }

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const verdict = printReport({ plan, elapsedSeconds, passed, failed, notRun, timedOut });
  return verdict === "PASS" ? 0 : verdict === "INCOMPLETE" ? 2 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("run_validation_mode.mjs")) {
  process.exitCode = runValidationMode();
}
