#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_GITHUB_LIMIT = 10;
const DEFAULT_CACHE_LOG_LIMIT = 8;
const DEFAULT_VERCEL_LIMIT = 10;
const DEFAULT_ENV_FILES = [".env", ".env.local"];
const INITIAL_ENV_KEYS = new Set(Object.keys(process.env));

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return "";
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    const inner = value.slice(1, -1);
    if (first === '"') {
      return inner
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return inner;
  }

  const hashIndex = value.indexOf(" #");
  return hashIndex >= 0 ? value.slice(0, hashIndex).trimEnd() : value;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return false;
  }

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    if (!key || INITIAL_ENV_KEYS.has(key)) {
      continue;
    }

    const value = parseEnvValue(normalized.slice(equalsIndex + 1));
    process.env[key] = value;
  }

  return true;
}

function loadLocalEnvFiles() {
  const cwd = process.cwd();
  for (const fileName of DEFAULT_ENV_FILES) {
    loadEnvFile(path.join(cwd, fileName));
  }
}

loadLocalEnvFiles();

function parseArgs(argv) {
  const options = {
    windowDays: DEFAULT_WINDOW_DAYS,
    githubLimit: DEFAULT_GITHUB_LIMIT,
    cacheLogLimit: DEFAULT_CACHE_LOG_LIMIT,
    vercelLimit: DEFAULT_VERCEL_LIMIT,
    format: "markdown",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--days" && next) {
      options.windowDays = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--github-limit" && next) {
      options.githubLimit = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--cache-log-limit" && next) {
      options.cacheLogLimit = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--vercel-limit" && next) {
      options.vercelLimit = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--format" && next) {
      options.format = next;
      index += 1;
      continue;
    }
    if (arg === "--json") {
      options.format = "json";
    }
  }

  return options;
}

function runCommand(command, args, { allowFailure = false } = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      maxBuffer: 80 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    const stderr = error?.stderr ? String(error.stderr) : "";
    throw new Error(
      `${command} ${args.join(" ")} failed${stderr ? `\n${stderr}` : ""}`,
    );
  }
}

function readRepoInfo() {
  const remote = runCommand("git", ["remote", "get-url", "origin"]).trim();
  const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error(`Unable to parse GitHub remote: ${remote}`);
  }

  const owner = match[1];
  const repo = match[2];
  return { owner, repo, fullName: `${owner}/${repo}` };
}

function readVercelProjectInfo() {
  const raw = readFileSync(path.join(process.cwd(), ".vercel", "project.json"), "utf8");
  const parsed = JSON.parse(raw);
  return {
    projectId: parsed.projectId,
    teamId: parsed.orgId,
  };
}

function formatDateTime(value) {
  if (!value) {
    return "n/a";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().replace(".000Z", "Z");
}

function formatDurationMs(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  const seconds = value / 1000;
  if (!Number.isFinite(seconds)) {
    return "n/a";
  }

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m${String(remainingSeconds).padStart(2, "0")}s`;
}

export function escapeTableCell(value) {
  const normalized = value === null || value === undefined ? "n/a" : String(value);
  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/`/g, "\\`")
    .replace(/\r?\n/g, " ");
}

export function markdownTable(headers, rows) {
  const headerRow = `| ${headers.map(escapeTableCell).join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyRows = rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`);
  return [headerRow, separatorRow, ...bodyRows].join("\n");
}

function parseJsonCommand(command, args) {
  const output = runCommand(command, args);
  return JSON.parse(output);
}

function getGitHubRuns(repoFullName, workflowFile, limit) {
  const data = parseJsonCommand("gh", [
    "run",
    "list",
    "--repo",
    repoFullName,
    "--workflow",
    workflowFile,
    "--limit",
    String(limit),
    "--json",
    "databaseId,workflowName,conclusion,attempt,displayTitle,headBranch,createdAt,startedAt,updatedAt,status,url,headSha",
  ]);

  return Array.isArray(data) ? data : [];
}

function getGitHubJobCount(repoFullName, runId) {
  const output = runCommand("gh", [
    "api",
    `repos/${repoFullName}/actions/runs/${runId}/jobs`,
    "--jq",
    ".jobs | length",
  ]);

  return Number.parseInt(output.trim(), 10) || 0;
}

function analyzeCacheLog(stdout) {
  const lines = stdout.split(/\r?\n/);
  let hitCount = 0;
  let missCount = 0;

  for (const line of lines) {
    if (/Found in cache\s*@|Cache hit|Cache restored from key|Restored from key/i.test(line)) {
      hitCount += 1;
    }
    if (/Cache not found|not found for input keys|npm cache is not found|No cache found/i.test(line)) {
      missCount += 1;
    }
  }

  return {
    hitCount,
    missCount,
  };
}

function getGitHubCacheStats(repoFullName, runs) {
  const rows = [];
  let totalHits = 0;
  let totalMisses = 0;

  for (const run of runs) {
    const logOutput = runCommand(
      "gh",
      [
        "run",
        "view",
        String(run.databaseId),
        "--repo",
        repoFullName,
        "--log",
        "--attempt",
        String(run.attempt ?? 1),
      ],
      { allowFailure: true },
    );

    if (!logOutput) {
      rows.push([
        run.workflowName,
        String(run.number ?? run.databaseId),
        "n/a",
        "n/a",
        "log unavailable",
      ]);
      continue;
    }

    const { hitCount, missCount } = analyzeCacheLog(logOutput);
    totalHits += hitCount;
    totalMisses += missCount;
    const result =
      hitCount > 0 && missCount > 0
        ? "mixed"
        : hitCount > 0
          ? "hit"
          : missCount > 0
            ? "miss"
            : "none";

    rows.push([
      run.workflowName,
      String(run.number ?? run.databaseId),
      String(hitCount),
      String(missCount),
      result,
    ]);
  }

  return {
    rows,
    totalHits,
    totalMisses,
  };
}

function getDerivedRunDurationMs(run) {
  if (!run.startedAt || !run.updatedAt) {
    return null;
  }

  const start = Date.parse(run.startedAt);
  const end = Date.parse(run.updatedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return end - start;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Vercel API ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

function pickDeploymentMeta(deployment, keys) {
  for (const key of keys) {
    const directValue = deployment?.[key];
    if (directValue !== undefined && directValue !== null && directValue !== "") {
      return String(directValue);
    }
  }

  const meta = deployment?.meta;
  if (meta && typeof meta === "object") {
    for (const key of keys) {
      const metaValue = meta[key];
      if (metaValue !== undefined && metaValue !== null && metaValue !== "") {
        return String(metaValue);
      }
    }
  }

  return "n/a";
}

async function getVercelDeployments({ token, projectId, teamId, limit, since }) {
  const deployments = [];
  let cursorSince = since;

  while (deployments.length < limit) {
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId", projectId);
    if (teamId) {
      url.searchParams.set("teamId", teamId);
    }
    url.searchParams.set("limit", String(Math.min(100, limit - deployments.length)));
    url.searchParams.set("since", String(cursorSince));

    const payload = await fetchJson(url, token);
    const batch = Array.isArray(payload.deployments) ? payload.deployments : [];
    deployments.push(...batch);

    const next = payload.pagination?.next;
    if (!next || next === cursorSince || batch.length === 0) {
      break;
    }

    cursorSince = next;
  }

  return deployments;
}

function buildVercelRows(deployments) {
  return deployments.map((deployment) => {
    const durationMs =
      deployment.ready && deployment.ready > 0
        ? deployment.ready - (deployment.buildingAt ?? deployment.createdAt ?? deployment.ready)
        : null;

    const gitBranch = pickDeploymentMeta(deployment, [
      "gitBranch",
      "githubCommitBranch",
      "branch",
      "ref",
    ]);
    const gitCommitRef = pickDeploymentMeta(deployment, [
      "gitCommitRef",
      "githubCommitRef",
      "commitRef",
      "sha",
    ]);

    return [
      formatDateTime(deployment.createdAt),
      deployment.readyState ?? deployment.state ?? "n/a",
      formatDurationMs(durationMs),
      gitBranch,
      gitCommitRef,
      deployment.url ?? "n/a",
    ];
  });
}

function summarizeByWorkflow(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = run.workflowName ?? "unknown";
    const bucket = groups.get(key) ?? {
      count: 0,
      durationMs: 0,
    };
    bucket.count += 1;
    const durationMs = getDerivedRunDurationMs(run);
    if (durationMs !== null) {
      bucket.durationMs += durationMs;
    }
    groups.set(key, bucket);
  }

  return Array.from(groups.entries()).map(([workflowName, bucket]) => [
    workflowName,
    String(bucket.count),
    formatDurationMs(bucket.durationMs),
    bucket.count > 0 ? formatDurationMs(bucket.durationMs / bucket.count) : "n/a",
  ]);
}

function summarizeVercelDeployments(deployments) {
  const readyDeployments = deployments.filter((deployment) => deployment.ready && deployment.ready > 0);
  const totalDuration = readyDeployments.reduce((sum, deployment) => {
    const durationMs = deployment.ready - (deployment.buildingAt ?? deployment.createdAt ?? deployment.ready);
    return sum + Math.max(durationMs, 0);
  }, 0);

  return [
    ["deployments", String(deployments.length)],
    ["ready deployments", String(readyDeployments.length)],
    ["total build duration", formatDurationMs(totalDuration)],
    [
      "average build duration",
      readyDeployments.length > 0
        ? formatDurationMs(totalDuration / readyDeployments.length)
        : "n/a",
    ],
  ];
}

export async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repo = readRepoInfo();
  const windowStart = new Date(Date.now() - options.windowDays * 24 * 60 * 60 * 1000);

  const ciRuns = getGitHubRuns(repo.fullName, "ci.yml", options.githubLimit).filter((run) => {
    const createdAt = Date.parse(run.createdAt);
    return Number.isFinite(createdAt) && createdAt >= windowStart.getTime();
  });

  const codeqlRuns = getGitHubRuns(repo.fullName, "codeql.yml", options.githubLimit).filter((run) => {
    const createdAt = Date.parse(run.createdAt);
    return Number.isFinite(createdAt) && createdAt >= windowStart.getTime();
  });

  const githubRuns = [...ciRuns, ...codeqlRuns];
  const githubSummary = summarizeByWorkflow(githubRuns);
  const githubRows = githubRuns.map((run) => {
    const jobsCount = getGitHubJobCount(repo.fullName, run.databaseId);
    const durationMs = getDerivedRunDurationMs(run);
    return [
      run.workflowName,
      String(run.number ?? run.databaseId),
      String(run.attempt ?? 1),
      run.conclusion ?? "n/a",
      String(jobsCount),
      formatDurationMs(durationMs),
      formatDateTime(run.startedAt),
      formatDateTime(run.updatedAt),
      run.headBranch ?? "n/a",
      run.headSha ? run.headSha.slice(0, 7) : "n/a",
    ];
  });

  const cacheRuns = ciRuns.slice(0, options.cacheLogLimit);
  const cacheStats = getGitHubCacheStats(repo.fullName, cacheRuns);

  const vercelProject = readVercelProjectInfo();
  const vercelToken = process.env.VERCEL_TOKEN?.trim() || "";
  let vercelDeployments = [];
  let vercelError = null;
  if (vercelToken) {
    try {
      vercelDeployments = await getVercelDeployments({
        token: vercelToken,
        projectId: process.env.VERCEL_PROJECT_ID?.trim() || vercelProject.projectId,
        teamId: process.env.VERCEL_ORG_ID?.trim() || vercelProject.teamId,
        limit: options.vercelLimit,
        since: windowStart.getTime(),
      });
    } catch (error) {
      vercelError = error instanceof Error ? error.message : String(error);
    }
  } else {
    vercelError = "VERCEL_TOKEN absent";
  }

  const vercelRows = buildVercelRows(vercelDeployments);
  const vercelSummary = summarizeVercelDeployments(vercelDeployments);

  if (options.format === "json") {
    const payload = {
      windowDays: options.windowDays,
      repository: repo.fullName,
      github: {
        summaryByWorkflow: githubSummary,
        runs: githubRows,
        cache: {
          runs: cacheStats.rows,
          totalHits: cacheStats.totalHits,
          totalMisses: cacheStats.totalMisses,
        },
      },
      vercel: {
        projectId: vercelProject.projectId,
        teamId: vercelProject.teamId,
        error: vercelError,
        summary: vercelSummary,
        deployments: vercelRows,
      },
    };

    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const lines = [];
  lines.push(`# CI/CD Metrics Report`);
  lines.push(`- Repository: ${repo.fullName}`);
  lines.push(`- Window: last ${options.windowDays} days`);
  lines.push(`- Generated at: ${new Date().toISOString()}`);
  lines.push("");

  lines.push(`## GitHub Actions Summary`);
  lines.push(markdownTable(["workflow", "builds", "total duration", "average duration"], githubSummary));
  lines.push("");

  lines.push(`## GitHub Actions Runs`);
  lines.push(
    markdownTable(
      [
        "workflow",
        "run",
        "attempt",
        "conclusion",
        "jobs",
        "duration_ms (derived)",
        "started_at",
        "updated_at",
        "branch",
        "sha",
      ],
      githubRows,
    ),
  );
  lines.push("");

  lines.push(`## GitHub Cache Logs`);
  lines.push(
    markdownTable(
      ["workflow", "run", "hit lines", "miss lines", "result"],
      cacheStats.rows,
    ),
  );
  lines.push("");
  lines.push(`Cache lines scanned: hits=${cacheStats.totalHits}, misses=${cacheStats.totalMisses}`);
  lines.push("");

  lines.push(`## Vercel Deployments`);
  lines.push(`Project ID: ${vercelProject.projectId}`);
  lines.push(`Team ID: ${vercelProject.teamId}`);
  if (vercelError) {
    lines.push(`Status: ${vercelError}`);
  } else {
    lines.push(markdownTable(["created_at", "readyState", "duration_ms (derived)", "gitBranch", "gitCommitRef", "url"], vercelRows));
    lines.push("");
    lines.push(markdownTable(["metric", "value"], vercelSummary));
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
