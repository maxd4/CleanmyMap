#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function currentSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function parseArgs(argv = []) {
  const shaArgument = argv.find((arg) => arg.startsWith("--sha="));
  return { sha: shaArgument?.slice("--sha=".length) || currentSha() };
}

function isClean() {
  return execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim() === "";
}

export function evaluateReleaseGate({ evidence, current, clean, deploymentEnabled }) {
  const evidenceMatches = Boolean(evidence && evidence.candidateSha === current && evidence.candidateSha === deploymentEnabled.sha);
  const fullGreen = Boolean(evidence?.mode === "FULL" && evidence.verdict === "PASS" && evidence.releaseReady === true
    && evidence.failed?.length === 0 && evidence.blocked?.length === 0 && evidence.notRun?.length === 0);
  const ready = clean && evidenceMatches && fullGreen && deploymentEnabled.main === false;
  return {
    ready,
    reasons: [
      !clean && "worktree is not clean",
      !evidenceMatches && "FULL evidence does not match the requested SHA",
      !fullGreen && "FULL evidence is not green",
      deploymentEnabled.main !== false && "Vercel main auto-deployment is not disabled",
    ].filter(Boolean),
  };
}

function readVercelPolicy() {
  const config = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "apps/web/vercel.json"), "utf8"));
  const deploymentEnabled = config.git?.deploymentEnabled;
  return { main: deploymentEnabled === false ? false : deploymentEnabled?.main };
}

function main() {
  const { sha } = parseArgs(process.argv.slice(2));
  const evidencePath = path.join(repositoryRoot, "artifacts", "validation", "full", `${sha}.json`);
  const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, "utf8")) : null;
  const current = currentSha();
  const result = evaluateReleaseGate({
    evidence,
    current,
    clean: isClean(),
    deploymentEnabled: { ...readVercelPolicy(), sha },
  });

  console.log(`CANDIDATE_SHA: ${sha}`);
  console.log(`CURRENT_SHA: ${current}`);
  console.log(`FULL_EVIDENCE: ${evidence ? "FOUND" : "MISSING"}`);
  console.log(`RELEASE_READY: ${result.ready ? "YES" : "NO"}`);
  for (const reason of result.reasons) console.error(`BLOCKED_DECISION: ${reason}`);
  process.exitCode = result.ready ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
