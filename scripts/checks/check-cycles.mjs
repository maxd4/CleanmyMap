#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runCommandWithTimeout } from "../ci/validation-process.mjs";
import {
  GITNEXUS_HEARTBEAT_MS,
  GITNEXUS_STEP_TIMEOUT_MS,
} from "../audits/audit-gitnexus.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "cycles-baseline.json");
const auditScriptPath = path.join(repositoryRoot, "scripts", "audits", "audit-gitnexus.mjs");
export const GITNEXUS_AUDIT_TIMEOUT_MS = GITNEXUS_STEP_TIMEOUT_MS * 3 + 5_000;

export class CycleGateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CycleGateError";
    this.code = code;
  }
}

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function cycleFingerprint(cycle) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(cycle))).digest("hex").slice(0, 24);
}

export function normalizeCycleReport(report) {
  if (!report || !["clean", "cycles_found"].includes(report.status) || report.enumeration !== "complete" || !Array.isArray(report.cycles)) {
    throw new Error("GitNexus cycle report malformed or incomplete.");
  }
  return report.cycles.map(cycleFingerprint).sort();
}

export function compareCycleBaseline(currentCycles, baselineCycles) {
  const current = new Set(currentCycles);
  const baseline = new Set(baselineCycles);
  return {
    added: [...current].filter((cycle) => !baseline.has(cycle)),
    stale: [...baseline].filter((cycle) => !current.has(cycle)),
  };
}

function assertBaselineFresh(baseline) {
  if (!baseline || baseline.schemaVersion !== 1 || baseline.tool !== "gitnexus" || baseline.toolVersion !== "1.6.12" || !Array.isArray(baseline.cycles)) {
    throw new Error("GitNexus cycle baseline malformed or tool version mismatch.");
  }
  const head = git(["rev-parse", "HEAD"]);
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { cwd: repositoryRoot, stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error(`GitNexus cycle baseline stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
}

function parseCycleReport(stdout) {
  const jsonStarts = [...stdout.matchAll(/\{\s*"status"\s*:/g)].map((match) => match.index ?? -1);
  const jsonStart = jsonStarts.at(-1) ?? -1;
  if (jsonStart < 0) throw new Error("GitNexus cycle check produced no JSON report.");
  try {
    return JSON.parse(stdout.slice(jsonStart));
  } catch {
    throw new Error("GitNexus cycle check JSON report is incomplete.");
  }
}

function cycleGateError(code, message) {
  return new CycleGateError(code, message);
}

function classifyAuditResult(result) {
  if (result.timedOut || result.interrupted) {
    throw cycleGateError("TIMEOUT", "GitNexus audit process timed out or was interrupted.");
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const timeout = output.match(/HOST_ENVIRONMENT: GitNexus step timed out[^\r\n]*/);
  if (timeout) throw cycleGateError("TIMEOUT", timeout[0]);
  const hostEnvironment = output.match(/HOST_ENVIRONMENT:[^\r\n]*/);
  if (hostEnvironment) throw cycleGateError("HOST_ENVIRONMENT", hostEnvironment[0]);
}

async function runAuditProcess() {
  const result = await runCommandWithTimeout({
    command: { executable: process.execPath, args: [auditScriptPath, "--cycles"] },
    cwd: repositoryRoot,
    timeoutMs: GITNEXUS_AUDIT_TIMEOUT_MS,
    heartbeatMs: GITNEXUS_HEARTBEAT_MS,
    onStdout: (text) => process.stdout.write(text),
    onStderr: (text) => process.stderr.write(text),
    onHeartbeat: (elapsedSeconds) => {
      process.stderr.write(`GITNEXUS_AUDIT_STILL_RUNNING: elapsed=${Math.floor(elapsedSeconds)}s\n`);
    },
  });
  return {
    status: result.exitCode ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: result.timedOut,
    interrupted: result.interrupted,
  };
}

export function formatCycleDiagnostic(cycle) {
  const files = Array.isArray(cycle?.files) ? cycle.files.join(" -> ") : "unknown files";
  return `files=${files}`;
}

export async function runCycleGate({ runAudit = runAuditProcess, baseline: suppliedBaseline } = {}) {
  if (!fs.existsSync(auditScriptPath)) throw cycleGateError("HOST_ENVIRONMENT", `HOST_ENVIRONMENT: GitNexus audit script missing: ${auditScriptPath}.`);
  let baseline;
  try {
    baseline = suppliedBaseline ?? JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    assertBaselineFresh(baseline);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("cycle baseline stale")) throw cycleGateError("FAIL_STALE_BASELINE", message);
    throw cycleGateError("MALFORMED_REPORT", message);
  }
  const result = await runAudit();
  classifyAuditResult(result);
  let report;
  try {
    report = parseCycleReport(result.stdout ?? "");
  } catch (error) {
    throw cycleGateError("MALFORMED_REPORT", error instanceof Error ? error.message : String(error));
  }
  if (result.status !== 0 && report.status !== "cycles_found") {
    throw cycleGateError("MALFORMED_REPORT", `GitNexus cycle check failed with exit ${result.status}: ${result.stderr || result.stdout}`);
  }
  let cycles;
  try {
    cycles = normalizeCycleReport(report);
  } catch (error) {
    throw cycleGateError("MALFORMED_REPORT", error instanceof Error ? error.message : String(error));
  }
  const comparison = compareCycleBaseline(cycles, baseline.cycles);
  const gateStatus = comparison.added.length > 0
    ? "FAIL_NEW_CYCLE"
    : comparison.stale.length > 0
      ? "FAIL_STALE_BASELINE"
      : "PASS";
  return { report, cycles, comparison, cycleObjects: report.cycles, gateStatus };
}

async function main() {
  try {
    const result = await runCycleGate();
    console.log(`CYCLES_STATUS: ${result.gateStatus}`);
    console.log(`GitNexus cycles: ${result.cycles.length} current, ${result.comparison.added.length} new, ${result.comparison.stale.length} stale baseline entrie(s).`);
    if (result.comparison.added.length > 0 || result.comparison.stale.length > 0) {
      const cyclesByFingerprint = new Map(result.cycleObjects.map((cycle) => [cycleFingerprint(cycle), cycle]));
      for (const cycle of result.comparison.added) console.error(`NEW_CYCLE: ${cycle} ${formatCycleDiagnostic(cyclesByFingerprint.get(cycle))}`);
      for (const cycle of result.comparison.stale) console.error(`STALE_CYCLE_BASELINE: ${cycle}`);
      process.exitCode = 1;
      return;
    }
    console.log("PASS: no new runtime cycle and historical cycle baseline is stable.");
  } catch (error) {
    console.error(`CYCLES_STATUS: ${error instanceof CycleGateError ? error.code : "MALFORMED_REPORT"}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
