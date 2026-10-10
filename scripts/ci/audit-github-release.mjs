#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

function repositoryName() {
  const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!match) throw new Error("origin is not a GitHub repository");
  return `${match[1]}/${match[2]}`;
}

function currentSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function runGh(args, runner = defaultRunner) {
  return runner(args);
}

function defaultRunner(args) {
  const command = process.platform === "win32" ? "gh.exe" : "gh";
  return spawnSync(command, args, { encoding: "utf8", stdio: "pipe", windowsHide: true });
}

function parseJson(result, label) {
  if (result.status !== 0) throw new Error(`${label} unavailable`);
  try {
    return JSON.parse(result.stdout || "null");
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
  return [];
}

export function parseGithubReleaseArgs(argv = []) {
  const shaArgument = argv.find((arg) => arg.startsWith("--sha="));
  return { sha: shaArgument?.slice("--sha=".length) || currentSha() };
}

export function evaluateGithubRelease({ dependabot, codeScanning, secretScanning, runs, rulesets }) {
  const openAlerts = [dependabot, codeScanning, secretScanning].reduce(
    (total, entries) => total + asArray(entries).filter((entry) => entry.state === "open").length,
    0,
  );
  const runList = asArray(runs);
  const failedRuns = runList.filter((run) => ["failure", "cancelled", "timed_out", "action_required"].includes(run.conclusion));
  const pendingRuns = runList.filter((run) => ["queued", "in_progress", "requested", "waiting", "pending"].includes(run.status));
  const missingRunEvidence = runList.length === 0;
  return {
    openAlerts,
    failedRuns: failedRuns.length,
    pendingRuns: pendingRuns.length,
    missingRunEvidence,
    rulesetsObserved: Array.isArray(rulesets),
    status: openAlerts > 0 || failedRuns.length > 0 ? "FAIL" : missingRunEvidence || pendingRuns.length > 0 ? "NOT_RUN" : "PASS",
  };
}

function main() {
  try {
    const { sha } = parseGithubReleaseArgs(process.argv.slice(2));
    const repo = repositoryName();
    const auth = runGh(["auth", "status"]);
    if (auth.status !== 0) {
      console.error("CONTROL_STATUS: BLOCKED_ACCESS");
      console.error("GitHub CLI authentication or permission is unavailable; alerts were not treated as PASS.");
      process.exitCode = 1;
      return;
    }

    const endpoint = (suffix) => runGh(["api", "--paginate", "--slurp", `repos/${repo}/${suffix}`]);
    const dependabot = parseJson(endpoint("dependabot/alerts?state=open&per_page=100"), "Dependabot alerts");
    const codeScanning = parseJson(endpoint("code-scanning/alerts?state=open&per_page=100"), "Code Scanning alerts");
    const secretScanning = parseJson(endpoint("secret-scanning/alerts?state=open&per_page=100"), "Secret Scanning alerts");
    const rulesets = parseJson(endpoint("rulesets?per_page=100"), "repository rulesets");
    const runsResult = runGh(["run", "list", "--repo", repo, "--commit", sha, "--limit", "100", "--json", "status,conclusion,name"]);
    const runs = parseJson(runsResult, "GitHub workflow runs");
    const summary = evaluateGithubRelease({ dependabot, codeScanning, secretScanning, runs, rulesets });

    console.log(`GITHUB_REPOSITORY: ${repo}`);
    console.log(`CANDIDATE_SHA: ${sha}`);
    console.log(`DEPENDABOT_OPEN: ${asArray(dependabot).length}`);
    console.log(`CODE_SCANNING_OPEN: ${asArray(codeScanning).length}`);
    console.log(`SECRET_SCANNING_OPEN: ${asArray(secretScanning).length}`);
    console.log(`WORKFLOW_RUNS_FOR_SHA: ${asArray(runs).length}`);
    console.log(`GITHUB_RULESETS_OBSERVED: ${summary.rulesetsObserved ? "yes" : "no"}`);
    console.log(`CONTROL_STATUS: ${summary.status}`);
    if (summary.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error("CONTROL_STATUS: BLOCKED_ACCESS");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
