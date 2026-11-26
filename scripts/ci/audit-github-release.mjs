#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gitExecutable } from "./git-executable.mjs";

const REQUIRED_WORKFLOW_PATHS = Object.freeze([
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
]);
const VALID_CONCLUSIONS = new Set([
  "success",
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure",
  "stale",
  "skipped",
  "neutral",
]);
const IN_FLIGHT_STATUSES = new Set([
  "queued",
  "in_progress",
  "requested",
  "waiting",
  "pending",
]);

function repositoryName() {
  const remote = execFileSync(gitExecutable(), ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!match) throw new Error("origin is not a GitHub repository");
  return `${match[1]}/${match[2]}`;
}

function currentSha() {
  return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function defaultRunner(args) {
  const command = process.platform === "win32" ? "gh.exe" : "gh";
  return spawnSync(command, args, { encoding: "utf8", stdio: "pipe", windowsHide: true });
}

function parseJson(result, label) {
  if (!result || result.status !== 0) {
    throw new Error(`${label} unavailable`);
  }
  try {
    return JSON.parse(result.stdout || "null");
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function parseSlurpedPages(result, label) {
  const payload = parseJson(result, label);
  if (!Array.isArray(payload)) {
    throw new Error(`${label} did not return a JSON array`);
  }
  if (payload.every((entry) => Array.isArray(entry))) {
    return payload.flat();
  }
  if (payload.every((entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry))) {
    return payload;
  }
  throw new Error(`${label} returned malformed paginated entries`);
}

function parseGithubReleaseArgs(argv = []) {
  const shaArgument = argv.find((arg) => arg.startsWith("--sha="));
  return { sha: shaArgument?.slice("--sha=".length) || currentSha() };
}

function isLatestCompletedRunSuperseded(run, allRuns) {
  if (run.status !== "completed" || ["success", "skipped", "neutral"].includes(run.conclusion)) {
    return false;
  }
  const runOrder = Number.isFinite(run.run_number) ? run.run_number : Date.parse(run.created_at ?? "") || 0;
  return allRuns.some((candidate) => {
    if (
      candidate.path !== run.path
      || candidate.head_sha !== run.head_sha
      || candidate.head_branch !== run.head_branch
      || candidate.event !== run.event
      || candidate.status !== "completed"
      || candidate.conclusion !== "success"
    ) {
      return false;
    }
    const candidateOrder = Number.isFinite(candidate.run_number)
      ? candidate.run_number
      : Date.parse(candidate.created_at ?? "") || 0;
    return candidateOrder > runOrder;
  });
}

export function evaluateGithubRelease({
  dependabot,
  codeScanning,
  secretScanning,
  runs,
  rulesets,
  sha,
  defaultBranch = "main",
}) {
  const fail = (reason) => ({
    status: "BLOCKED_ACCESS",
    reason,
    openAlerts: null,
    failedRuns: null,
    pendingRuns: null,
    missingRunEvidence: true,
    rulesetsObserved: false,
    protectionVerified: false,
    missingRequiredWorkflows: [...REQUIRED_WORKFLOW_PATHS],
  });

  if (!/^[a-f0-9]{40}$/i.test(sha ?? "")) return fail("Invalid candidate SHA");
  const validObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const validAlerts = (x) => Array.isArray(x) && x.every((e) => validObject(e) && e.state === "open");
  if (![dependabot, codeScanning, secretScanning].every(validAlerts)) {
    return fail("Invalid or non-open alerts payload");
  }
  if (!Array.isArray(runs) || !runs.every((r) => validObject(r) && r.head_sha === sha && typeof r.path === "string" && typeof r.status === "string")) {
    return fail("Malformed or wrong-SHA workflow evidence");
  }
  if (!Array.isArray(rulesets) || !rulesets.every((r) => validObject(r) && typeof r.enforcement === "string" && typeof r.target === "string" && Array.isArray(r.rules) && Array.isArray(r.bypass_actors))) {
    return fail("Incomplete ruleset details");
  }
  if (runs.some((r) => (r.status === "completed" ? !VALID_CONCLUSIONS.has(r.conclusion) : !IN_FLIGHT_STATUSES.has(r.status)))) {
    return fail("Unknown run status or conclusion");
  }

  const branchRef = `refs/heads/${defaultBranch}`;
  const scoped = rulesets.filter((r) =>
    r.enforcement === "active"
    && r.target === "branch"
    && Array.isArray(r.conditions?.ref_name?.include)
    && Array.isArray(r.conditions?.ref_name?.exclude)
    && r.conditions.ref_name.exclude.length === 0
    && r.conditions.ref_name.include.some((x) => x === branchRef || x === "~DEFAULT_BRANCH"));
  const historyRules = new Set(scoped.filter((r) => r.bypass_actors.length === 0).flatMap((r) => r.rules.map((rule) => rule?.type)));
  const protectionVerified = historyRules.has("deletion")
    && historyRules.has("non_fast_forward")
    && scoped.some((r) => r.rules.some((rule) => rule?.type === "update"));

  const completed = runs.filter((r) => r.status === "completed");
  const failedRuns = completed.filter(
    (r) => !["success", "skipped", "neutral"].includes(r.conclusion) && !isLatestCompletedRunSuperseded(r, runs),
  ).length;
  const pendingRuns = runs.filter((r) => IN_FLIGHT_STATUSES.has(r.status)).length;
  const missingRequiredWorkflows = REQUIRED_WORKFLOW_PATHS.filter((p) =>
    !completed.some((r) =>
      r.path === p
      && r.head_branch === defaultBranch
      && ["push", "workflow_dispatch"].includes(r.event)
      && r.conclusion === "success"));
  const openAlerts = dependabot.length + codeScanning.length + secretScanning.length;

  return {
    status: openAlerts || failedRuns || !protectionVerified ? "FAIL" : pendingRuns || missingRequiredWorkflows.length ? "NOT_RUN" : "PASS",
    openAlerts,
    failedRuns,
    pendingRuns,
    missingRunEvidence: missingRequiredWorkflows.length > 0,
    rulesetsObserved: true,
    protectionVerified,
    missingRequiredWorkflows,
  };
}

export function fetchGithubReleaseEvidence({ repo, sha, runner = defaultRunner }) {
  if (!/^[a-f0-9]{40}$/i.test(sha ?? "")) {
    throw new Error("Invalid candidate SHA");
  }
  const repoMeta = parseJson(runner(["api", `repos/${repo}`]), "repository metadata");
  if (!repoMeta || repoMeta.full_name?.toLowerCase() !== repo.toLowerCase() || typeof repoMeta.default_branch !== "string") {
    throw new Error("Repository identity or default_branch mismatch");
  }

  const endpoint = (suffix, label) => parseSlurpedPages(runner(["api", "--paginate", "--slurp", `repos/${repo}/${suffix}`]), label);
  const dependabot = endpoint("dependabot/alerts?state=open&per_page=100", "Dependabot alerts");
  const codeScanning = endpoint("code-scanning/alerts?state=open&per_page=100", "Code Scanning alerts");
  const secretScanning = endpoint("secret-scanning/alerts?state=open&per_page=100", "Secret Scanning alerts");
  const rulesetSummaries = endpoint("rulesets?per_page=100", "repository rulesets");
  const rulesets = rulesetSummaries.map((summary) => {
    if (!summary || (typeof summary.id !== "number" && typeof summary.id !== "string")) {
      throw new Error("Malformed ruleset summary");
    }
    return parseJson(runner(["api", `repos/${repo}/rulesets/${summary.id}`]), `ruleset ${summary.id}`);
  });

  const runPages = parseJson(
    runner(["api", "--paginate", "--slurp", `repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`]),
    "GitHub workflow runs",
  );
  if (!Array.isArray(runPages) || runPages.length === 0) {
    throw new Error("GitHub workflow runs did not return any page");
  }
  const runs = [];
  const seenRunIds = new Set();
  let expectedTotal = null;
  for (const page of runPages) {
    if (!page || !Array.isArray(page.workflow_runs)) {
      throw new Error("GitHub workflow runs page missing workflow_runs");
    }
    if (!Number.isInteger(page.total_count) || page.total_count < 0) {
      throw new Error("GitHub workflow runs page missing valid total_count");
    }
    if (expectedTotal === null) {
      expectedTotal = page.total_count;
    } else if (page.total_count !== expectedTotal) {
      throw new Error(`Inconsistent workflow runs total_count: ${page.total_count} !== ${expectedTotal}`);
    }
    for (const run of page.workflow_runs) {
      if (!run || (typeof run.id !== "number" && typeof run.id !== "string")) {
        throw new Error("GitHub workflow run missing valid id");
      }
      if (seenRunIds.has(run.id)) {
        throw new Error(`Duplicate GitHub workflow run id: ${run.id}`);
      }
      seenRunIds.add(run.id);
      runs.push(run);
    }
  }
  if (runs.length !== expectedTotal) {
    throw new Error(`Incomplete or inconsistent workflow runs pagination: ${runs.length}/${expectedTotal}`);
  }

  return {
    defaultBranch: repoMeta.default_branch,
    dependabot,
    codeScanning,
    secretScanning,
    rulesets,
    runs,
  };
}

function main() {
  try {
    const { sha } = parseGithubReleaseArgs(process.argv.slice(2));
    const repo = repositoryName();
    const auth = defaultRunner(["auth", "status"]);
    if (auth.status !== 0) {
      console.error("CONTROL_STATUS: BLOCKED_ACCESS");
      console.error("GitHub CLI authentication or permission is unavailable; alerts were not treated as PASS.");
      process.exitCode = 1;
      return;
    }

    const evidence = fetchGithubReleaseEvidence({ repo, sha });
    const summary = evaluateGithubRelease({ ...evidence, sha });

    console.log(`GITHUB_REPOSITORY: ${repo}`);
    console.log(`CANDIDATE_SHA: ${sha}`);
    console.log(`DEPENDABOT_OPEN: ${evidence.dependabot.length}`);
    console.log(`CODE_SCANNING_OPEN: ${evidence.codeScanning.length}`);
    console.log(`SECRET_SCANNING_OPEN: ${evidence.secretScanning.length}`);
    console.log(`WORKFLOW_RUNS_FOR_SHA: ${evidence.runs.length}`);
    console.log(`GITHUB_RULESETS_OBSERVED: ${summary.rulesetsObserved ? "yes" : "no"}`);
    console.log(`PROTECTION_VERIFIED: ${summary.protectionVerified ? "yes" : "no"}`);
    if (summary.reason) console.log(`BLOCK_REASON: ${summary.reason}`);
    console.log(`CONTROL_STATUS: ${summary.status}`);
    if (summary.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error("CONTROL_STATUS: BLOCKED_ACCESS");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
