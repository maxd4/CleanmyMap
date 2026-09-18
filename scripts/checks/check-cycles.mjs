#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "cycles-baseline.json");
const auditScriptPath = path.join(repositoryRoot, "scripts", "audits", "audit-gitnexus.mjs");

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
  if (!report || report.status !== "clean" || report.enumeration !== "complete" || !Array.isArray(report.cycles)) {
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

export function runCycleGate() {
  if (!fs.existsSync(auditScriptPath)) throw new Error(`HOST_ENVIRONMENT: GitNexus audit script missing: ${auditScriptPath}.`);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  assertBaselineFresh(baseline);
  const result = spawnSync(process.execPath, [auditScriptPath, "--cycles"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`GitNexus cycle check failed with exit ${result.status}: ${result.stderr || result.stdout}`);
  const jsonStart = result.stdout.lastIndexOf("{\n  \"status\"");
  if (jsonStart < 0) throw new Error("GitNexus cycle check produced no JSON report.");
  const jsonEnd = result.stdout.indexOf("\n}", jsonStart);
  if (jsonEnd < 0) throw new Error("GitNexus cycle check JSON report is incomplete.");
  const report = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 2));
  const cycles = normalizeCycleReport(report);
  const comparison = compareCycleBaseline(cycles, baseline.cycles);
  return { report, cycles, comparison };
}

async function main() {
  try {
    const result = runCycleGate();
    console.log(`GitNexus cycles: ${result.cycles.length} current, ${result.comparison.added.length} new, ${result.comparison.stale.length} stale baseline entrie(s).`);
    if (result.comparison.added.length > 0 || result.comparison.stale.length > 0) {
      for (const cycle of result.comparison.added) console.error(`NEW_CYCLE: ${cycle}`);
      for (const cycle of result.comparison.stale) console.error(`STALE_CYCLE_BASELINE: ${cycle}`);
      process.exitCode = 1;
      return;
    }
    console.log("PASS: no new runtime cycle and historical cycle baseline is stable.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
