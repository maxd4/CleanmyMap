#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import strykerConfig from "../../apps/web/stryker.config.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";
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

function mutationReportProvenance() {
  const candidateSha = process.env.CMM_DYNAMIC_CANDIDATE_SHA
    ?? execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const worktreeState = execFileSync(gitExecutable(), ["status", "--short"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const attributable = /^[0-9a-f]{40}$/i.test(candidateSha) && worktreeState.length === 0;
  return {
    sourceSha: attributable ? candidateSha : null,
    candidateSha: attributable ? candidateSha : null,
    candidateScope: process.env.CMM_DYNAMIC_CANDIDATE_SHA ? "DYNAMIC_CANDIDATE" : "WORKTREE",
    provenance: attributable ? "EXACT_CANDIDATE" : "WORKTREE_LIVE_NOT_ATTRIBUTABLE",
    generatedAt: new Date().toISOString(),
  };
}

function temporaryReportPath(targetPath, purpose) {
  return path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${purpose}.${process.pid}.${randomUUID()}.tmp`,
  );
}

function readMutationReport(reportPath) {
  const stagedPath = temporaryReportPath(reportPath, "read");
  try {
    fs.copyFileSync(reportPath, stagedPath, fs.constants.COPYFILE_EXCL);
    const descriptor = fs.openSync(stagedPath, fs.constants.O_RDONLY);
    try {
      return JSON.parse(fs.readFileSync(descriptor, { encoding: "utf8" }));
    } finally {
      fs.closeSync(descriptor);
    }
  } finally {
    fs.rmSync(stagedPath, { force: true });
  }
}

function writeMutationReportAtomically(reportPath, report) {
  const temporaryPath = temporaryReportPath(reportPath, "write");
  let descriptor;
  try {
    descriptor = fs.openSync(
      temporaryPath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      0o600,
    );
    fs.writeFileSync(descriptor, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporaryPath, reportPath);
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
    fs.rmSync(temporaryPath, { force: true });
  }
}

export function enrichAndPublishMutationReport(
  reportPath,
  provenanceFactory = mutationReportProvenance,
) {
  const report = readMutationReport(reportPath);
  const enriched = { ...report, ...provenanceFactory() };
  writeMutationReportAtomically(reportPath, enriched);
  return enriched;
}

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
  try {
    return enrichAndPublishMutationReport(reportPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Mutation report missing after Stryker run.", { cause: error });
    }
    throw error;
  }
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
