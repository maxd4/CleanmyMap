#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  cleanupValidationEvidence,
  createCandidateFingerprint,
  createValidationEvidenceKey,
  getCandidateSha,
  readFastValidationEvidence,
  writeFullValidationEvidence,
  writeFastValidationEvidence,
} from "./validation-evidence.mjs";
import {
  classifyValidationFailure,
  createModeValidationPlan,
  getBudgetDecision,
} from "./validation-modes.mjs";
import {
  resolveValidationCommand,
  runCommandWithTimeout,
} from "./validation-process.mjs";

function parseArgs(argv) {
  const options = { mode: "FAST", candidateScope: "WORKTREE", changedFiles: [], maxParallel: 2 };
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
    } else if (arg === "--max-parallel" && next) {
      options.maxParallel = Number(next);
      index += 1;
    } else if (arg.startsWith("--max-parallel=")) {
      options.maxParallel = Number(arg.slice("--max-parallel=".length));
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
  return resolveValidationCommand(check.command, process.platform, process.execPath);
}

export function runCheck(check, remainingSeconds, cwd = process.cwd(), callbacks = {}) {
  const command = commandFor(check);
  const timeoutMs = Number.isFinite(remainingSeconds)
    ? Math.max(1000, Math.floor(remainingSeconds * 1000))
    : undefined;
  console.log(`\n==> ${check.label}`);
  return runCommandWithTimeout({
    command,
    cwd,
    timeoutMs,
    heartbeatMs: callbacks.heartbeatMs ?? 15_000,
    onHeartbeat: callbacks.onHeartbeat,
  });
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return "n/a";
  if (value < 60) return `${value.toFixed(1)}s`;
  const roundedSeconds = Math.round(value);
  const minutes = Math.floor(roundedSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(roundedSeconds % 60).padStart(2, "0")}`;
}

function isTerminalState(state) {
  return ["PASS", "FAIL", "BLOCKED", "REUSED", "NOT_RUN"].includes(state);
}

const CONTROL_STATUS_PATTERN = /CONTROL_STATUS:\s+(BLOCKED_ACCESS|BLOCKED_ENVIRONMENT|BLOCKED_DECISION|NOT_RUN)/;

export function classifyValidationResult(result = {}) {
  const controlStatus = result.output?.match(CONTROL_STATUS_PATTERN)?.[1];
  const state = controlStatus || result.status === "BLOCKED"
    ? "BLOCKED"
    : result.status === "PASS"
      ? "PASS"
      : result.status === "NOT_RUN"
        ? "NOT_RUN"
        : "FAIL";
  return { state, controlStatus };
}

function createProgressReporter({
  plan,
  candidateSha,
  maxParallel,
  log = console.log,
  write = (value) => process.stdout.write(value),
  interactive = Boolean(process.stdout.isTTY && process.env.CI !== "true"),
} = {}) {
  const records = new Map(plan.checks.map((check) => [check.id, {
    id: check.id,
    label: check.label,
    category: check.category,
    state: "PENDING",
    durationSeconds: 0,
  }]));
  let lastInteractiveLength = 0;

  const snapshot = () => {
    const values = [...records.values()];
    const completed = values.filter((entry) => isTerminalState(entry.state)).length;
    return {
      completed,
      total: values.length,
      percentage: values.length === 0 ? 100 : (completed / values.length) * 100,
      success: values.filter((entry) => ["PASS", "REUSED"].includes(entry.state)).length,
      fail: values.filter((entry) => entry.state === "FAIL").length,
      blocked: values.filter((entry) => entry.state === "BLOCKED").length,
      running: values.filter((entry) => entry.state === "RUNNING").length,
      pending: values.filter((entry) => entry.state === "PENDING").length,
    };
  };

  const lineFor = (record, details = {}) => {
    const counts = snapshot();
    const requestedElapsed = details.elapsedSeconds ?? record.durationSeconds;
    const elapsed = Number.isFinite(Number(requestedElapsed))
      ? Math.max(record.durationSeconds, Number(requestedElapsed), 0)
      : record.durationSeconds;
    const duration = record.durationSeconds;
    const suffix = record.state === "RUNNING"
      ? `elapsed=${formatDuration(elapsed)}`
      : `duration=${formatDuration(duration)}`;
    return `[${plan.mode}] ${record.id} [${record.category}] ${record.state} ${suffix} | ${counts.completed}/${counts.total} (${counts.percentage.toFixed(0)}%) | success=${counts.success} fail=${counts.fail} blocked=${counts.blocked} running=${counts.running} pending=${counts.pending}`;
  };

  const emit = (record, details = {}) => {
    const line = lineFor(record, details);
    if (interactive) {
      const padded = line.padEnd(lastInteractiveLength, " ");
      lastInteractiveLength = line.length;
      write(`\r${padded}`);
    } else {
      log(`[${new Date().toISOString()}] ${line}`);
    }
  };

  log(`[${plan.mode}] START candidate=${candidateSha} scope=${plan.candidateScope} controls=${records.size} maxParallel=${maxParallel}`);
  for (const record of records.values()) emit(record);

  return {
    records,
    snapshot,
    update(check, state, details = {}) {
      const record = records.get(check.id);
      if (!record) return;
      record.state = state;
      for (const value of [details.elapsedSeconds, details.durationSeconds]) {
        if (Number.isFinite(Number(value))) {
          record.durationSeconds = Math.max(record.durationSeconds, Number(value), 0);
        }
      }
      emit(record, details);
    },
    heartbeat(check, elapsedSeconds) {
      const record = records.get(check.id);
      if (!record || record.state !== "RUNNING") return;
      const monotoneElapsed = Number.isFinite(Number(elapsedSeconds))
        ? Math.max(record.durationSeconds, Number(elapsedSeconds), 0)
        : record.durationSeconds;
      record.durationSeconds = monotoneElapsed;
      if (interactive) emit(record, { elapsedSeconds: monotoneElapsed });
      else log(`[${new Date().toISOString()}] [${plan.mode}] Toujours actif — ${record.label} — ${formatDuration(monotoneElapsed)} écoulées`);
    },
    finishInteractive() {
      if (interactive) write("\n");
    },
  };
}

function resourcesConflict(left, right) {
  const leftResources = new Set(left.resources ?? []);
  return (right.resources ?? []).some((resource) => leftResources.has(resource));
}

function canStartCheck(check, activeChecks) {
  if (activeChecks.length === 0) return true;
  if (check.parallelizable === false) return false;
  return activeChecks.every((active) => active.parallelizable !== false && !resourcesConflict(active, check));
}

export async function runChecksWithScheduler({
  checks,
  maxParallel = 2,
  initialStates = new Map(),
  executeCheck,
  getDecision,
  onStart,
  onResult,
} = {}) {
  if (!Number.isInteger(maxParallel) || maxParallel < 1) {
    throw new Error(`--max-parallel doit être un entier positif (reçu: ${maxParallel})`);
  }
  const states = new Map(initialStates);
  for (const check of checks) {
    if (!states.has(check.id)) states.set(check.id, "PENDING");
  }
  const results = new Map();
  const active = new Map();
  let timedOut = false;

  const dependencyState = (check) => {
    const dependencies = check.dependencies ?? [];
    if (dependencies.some((id) => states.get(id) === "FAIL" || states.get(id) === "BLOCKED" || states.get(id) === "NOT_RUN")) {
      return "BLOCKED";
    }
    if (dependencies.some((id) => !isTerminalState(states.get(id)))) return "PENDING";
    return "READY";
  };

  const settle = (check, result) => {
    const classification = classifyValidationResult(result);
    const normalizedResult = {
      ...result,
      state: classification.state,
      controlStatus: classification.controlStatus,
    };
    results.set(check.id, normalizedResult);
    states.set(check.id, classification.state);
    onResult?.(check, normalizedResult, classification.state);
  };

  while (active.size > 0 || [...states.values()].some((state) => state === "PENDING")) {
    for (const check of checks) {
      if (states.get(check.id) !== "PENDING" || active.size >= maxParallel || timedOut) continue;
      const dependency = dependencyState(check);
      if (dependency === "BLOCKED") {
        settle(check, { status: "BLOCKED", reason: "dépendance non réussie" });
        continue;
      }
      if (dependency !== "READY" || !canStartCheck(check, [...active.values()].map((entry) => entry.check))) continue;
      const decision = getDecision(check);
      if (decision.decision === "skip") {
        settle(check, { status: "NOT_RUN", reason: decision.status });
        continue;
      }
      states.set(check.id, "RUNNING");
      const checkStartedAt = performance.now();
      onStart?.(check, { startedAt: checkStartedAt, elapsedSeconds: 0 });
      const promise = Promise.resolve()
        .then(() => executeCheck(check, decision.remainingSeconds))
        .then((result) => ({ check, result }))
        .catch((error) => ({ check, result: { status: "FAIL", exitCode: null, error, output: String(error) } }));
      active.set(check.id, { check, promise });
    }

    if (active.size === 0) {
      const pending = checks.filter((check) => states.get(check.id) === "PENDING");
      for (const check of pending) settle(check, { status: "BLOCKED", reason: "dépendances cycliques ou ordonnanceur bloqué" });
      break;
    }

    const settled = await Promise.race([...active.values()].map((entry) => entry.promise));
    active.delete(settled.check.id);
    settle(settled.check, settled.result);
    if (settled.result.status === "TIME_BUDGET_EXCEEDED") {
      timedOut = true;
      for (const check of checks) {
        if (states.get(check.id) === "PENDING") settle(check, { status: "NOT_RUN", reason: "NOT_RUN_TIME_BUDGET" });
      }
    }
  }

  while (active.size > 0) {
    const settled = await Promise.race([...active.values()].map((entry) => entry.promise));
    active.delete(settled.check.id);
    settle(settled.check, settled.result);
  }
  return { states, results, timedOut };
}

function printReport({
  plan,
  elapsedSeconds,
  candidateFingerprint,
  passed,
  failed,
  blocked,
  notRun,
  timedOut,
  reused,
  preexisting,
  cleanupError,
  records = [],
  log = console.log,
}) {
  log(`\nVALIDATION_MODE: ${plan.mode}`);
  log(`CANDIDATE_SCOPE: ${plan.candidateScope}`);
  log(`ELAPSED_SECONDS: ${elapsedSeconds.toFixed(1)}`);
  log(`TIME_BUDGET_SECONDS: ${plan.budgetSeconds ?? "none"}`);
  log("CHECKS_PASSED:");
  for (const value of passed) log(`- ${value}`);
  log("CHECKS_REUSED:");
  for (const value of reused) {
    log(`- ${value.id}: ALREADY_PROVEN (${value.reason})`);
    log(`  REUSED_EVIDENCE_SOURCE: validation-evidence/${candidateFingerprint}`);
  }
  log("CHECKS_PREEXISTING_PARALLEL_FAILURE:");
  for (const value of preexisting) log(`- ${value}`);
  log("CHECKS_FAILED:");
  for (const value of failed) log(`- ${value}`);
  log("CHECKS_BLOCKED:");
  for (const value of blocked) log(`- ${value}`);
  log("CHECKS_NOT_RUN:");
  for (const value of notRun) log(`- ${value.id}\n  reason: ${value.reason}`);
  log("CHECKS_DEDUPLICATED:");
  for (const value of plan.deduplicated) log(`- ${value.id}: ${value.status} (${value.reason})`);
  log("CHECK_DURATIONS_DESC:");
  for (const record of [...records].sort((left, right) => right.durationSeconds - left.durationSeconds)) {
    log(`- ${record.id} [${record.category}] ${record.state} ${record.durationSeconds.toFixed(1)}s`);
  }
  log(`TOTAL_DURATION_SECONDS: ${elapsedSeconds.toFixed(1)}`);
  if (timedOut) log("TIME_BUDGET_EXCEEDED: yes");
  if (cleanupError) log(`CLEANUP_FAILED: ${cleanupError.message}`);
  const verdict = timedOut || failed.length > 0 || blocked.length > 0 || cleanupError
    ? "FAIL"
    : notRun.length > 0
      ? "INCOMPLETE"
      : "PASS";
  log(`VERDICT: ${verdict}`);
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
  const maxParallel = options.maxParallel ?? 2;
  if (!Number.isInteger(maxParallel) || maxParallel < 1) {
    throw new Error(`--max-parallel doit être un entier positif (reçu: ${maxParallel})`);
  }
  const log = runtime.log ?? console.log;
  const progress = createProgressReporter({
    plan,
    candidateSha: getCandidateSha(repositoryRoot),
    maxParallel,
    log,
    write: runtime.write,
    interactive: runtime.interactive,
  });
  const passed = [];
  const failed = [];
  const blocked = [];
  const notRun = [];
  const reused = [];
  const preexisting = [];
  let timedOut = false;
  let cleanupError;
  const executeCheck = runtime.runCheck ?? runCheck;

  try {
    const evidenceKeys = new Map();
    for (const check of plan.checks) {
      const evidenceKey = createValidationEvidenceKey({
        candidateFingerprint,
        check,
        candidateScope: plan.candidateScope,
        configuration: check.evidenceConfiguration,
      });
      evidenceKeys.set(check.id, evidenceKey);
      if (plan.mode === "FULL" && fastEvidence.has(evidenceKey)) {
        reused.push({ id: check.id, reason: "preuve FAST du même candidat et de la même commande" });
        progress.update(check, "REUSED", { durationSeconds: 0 });
      }
    }

    const schedulerChecks = plan.checks.filter((check) => !reused.some((entry) => entry.id === check.id));
    const schedulerResult = await runChecksWithScheduler({
      checks: schedulerChecks,
      maxParallel,
      initialStates: new Map(reused.map((entry) => [entry.id, "REUSED"])),
      getDecision: (check) => getBudgetDecision({
        elapsedSeconds: (performance.now() - startedAt) / 1000,
        estimatedSeconds: check.estimatedSeconds,
        budgetSeconds: plan.budgetSeconds,
      }),
      onStart: (check, timing) => progress.update(check, "RUNNING", { elapsedSeconds: timing.elapsedSeconds }),
      executeCheck: (check, remainingSeconds) => executeCheck(
        check,
        remainingSeconds,
        repositoryRoot,
        {
          heartbeatMs: runtime.heartbeatMs ?? 15_000,
          onHeartbeat: (elapsedSeconds) => progress.heartbeat(check, elapsedSeconds),
        },
      ),
      onResult: (check, result, state) => {
        const durationSeconds = Number(result.elapsedSeconds ?? 0);
        progress.update(check, state, { durationSeconds });
        if (state === "PASS") {
          passed.push(check.id);
          if (plan.mode === "FAST") {
            fastEvidenceEntries.set(evidenceKeys.get(check.id), {
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
          return;
        }
        if (result.status === "TIME_BUDGET_EXCEEDED") {
          timedOut = true;
          failed.push(`${check.id}: TIME_BUDGET_EXCEEDED`);
          return;
        }
        if (result.status === "NOT_RUN") {
          notRun.push({ id: check.id, reason: result.reason ?? "NOT_RUN" });
          return;
        }
        if (state === "BLOCKED") {
          blocked.push(`${check.id}: ${result.controlStatus ?? result.reason ?? "BLOCKED_DECISION"}`);
          return;
        }
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
      },
    });
    timedOut ||= schedulerResult.timedOut;
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
  const candidateSha = getCandidateSha(repositoryRoot);
  const verdict = printReport({
    plan,
    elapsedSeconds,
    candidateFingerprint,
    passed,
    failed,
    blocked,
    notRun,
    timedOut,
    reused,
    preexisting,
    cleanupError,
    records: [...progress.records.values()],
    log,
  });
  progress.finishInteractive();
  if (plan.mode === "FULL") {
    writeFullValidationEvidence({
      repositoryRoot,
      candidateSha,
      candidateFingerprint,
      plan,
      passed,
      failed,
      blocked,
      notRun,
      reused,
      preexisting,
      verdict,
    });
    log(`CANDIDATE_SHA: ${candidateSha}`);
    log(`RELEASE_READY: ${verdict === "PASS" && candidateSha !== "NO_GIT_HEAD" ? "YES" : "NO"}`);
  }
  return verdict === "PASS" ? 0 : verdict === "INCOMPLETE" ? 2 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("run_validation_mode.mjs")) {
  process.exitCode = await runValidationMode();
}
