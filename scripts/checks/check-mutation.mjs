#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import strykerConfig from "../../apps/web/stryker.config.mjs";
import {
  assertMutationBaselineFresh,
  compareMutationReport,
  getMutationScope,
  mutationScopeFingerprint,
  summarizeMutationReport,
  validateMutationBaseline,
} from "./mutation-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(repositoryRoot, "scripts", "checks", "mutation-baseline.json");
const reportPath = path.join(repositoryRoot, "artifacts", "quality-hardening", "mutation", "stryker-report.json");
const runnerPath = path.join(repositoryRoot, "node_modules", "@stryker-mutator", "core", "bin", "stryker.js");

function runMutation() {
  if (!fs.existsSync(runnerPath)) throw new Error("HOST_ENVIRONMENT: Stryker 10.0.0 is not installed.");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const result = spawnSync(process.execPath, [runnerPath, "run", "stryker.config.mjs", "--reporters", "json", "--logLevel", "warn"], {
    cwd: path.join(repositoryRoot, "apps", "web"),
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Mutation runner failed with exit ${result.status}: ${result.stderr || result.stdout || "no output"}`);
  }
  if (!fs.existsSync(reportPath)) throw new Error("Mutation report missing after Stryker run.");
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

export function runMutationPolicy() {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  validateMutationBaseline(baseline, strykerConfig);
  const head = assertMutationBaselineFresh(baseline, { repositoryRoot });
  const report = runMutation();
  const current = summarizeMutationReport(report);
  return { baseline, current, failures: compareMutationReport(current, baseline), head };
}

function formatSummary(label, summary) {
  const { counts } = summary;
  return `${label}: ${summary.score.toFixed(2)}% (${counts.Killed} killed, ${counts.Survived} survived, ${counts.NoCoverage} no coverage, ${counts.Timeout} timeout, ${counts.error} error)`;
}

async function main() {
  try {
    const result = runMutationPolicy();
    console.log(`Mutation scope: ${getMutationScope(strykerConfig).mutate.join(", ")}`);
    console.log(`Mutation scope fingerprint: ${mutationScopeFingerprint(strykerConfig)}`);
    console.log(formatSummary("Baseline", result.baseline.summary));
    console.log(formatSummary("Current", result.current));
    for (const [file, summary] of Object.entries(result.current.files)) console.log(formatSummary(`Current ${file}`, summary));
    if (result.failures.length > 0) {
      for (const failure of result.failures) console.error(`FAIL: ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log("PASS: mutation baseline ratchet respected.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) await main();
