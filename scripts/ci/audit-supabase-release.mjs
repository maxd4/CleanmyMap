#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webRoot = path.join(repoRoot, "apps", "web");
const localEnvPath = path.join(webRoot, ".env.local");
const projectRefPattern = /^[a-z0-9]{20}$/;

function normalizeProjectRef(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidProjectRef(value) {
  return projectRefPattern.test(normalizeProjectRef(value));
}

function readProjectRefFromLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return "";

  const line = fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .find((entry) => /^\s*(?:export\s+)?SUPABASE_PROJECT_REF\s*=/.test(entry));
  if (!line) return "";

  const rawValue = line.replace(/^\s*(?:export\s+)?SUPABASE_PROJECT_REF\s*=\s*/, "").trim();
  return rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
}

function readProjectRefArgument(argv = []) {
  const equalsArg = argv.find((arg) => arg.startsWith("--project-ref="));
  if (equalsArg) return equalsArg.slice("--project-ref=".length);

  const index = argv.indexOf("--project-ref");
  return index >= 0 ? argv[index + 1] ?? "" : undefined;
}

function isLocalExecution(env) {
  return env?.CI !== "true" && env?.CI !== "1" && env?.GITHUB_ACTIONS !== "true";
}

export function resolveProjectRef({ argv = [], env = process.env, envPath = localEnvPath, localExecution = isLocalExecution(env) } = {}) {
  const explicitProjectRef = readProjectRefArgument(argv);
  if (explicitProjectRef !== undefined) return isValidProjectRef(explicitProjectRef) ? normalizeProjectRef(explicitProjectRef) : "";

  if (env && Object.prototype.hasOwnProperty.call(env, "SUPABASE_PROJECT_REF")) {
    return isValidProjectRef(env.SUPABASE_PROJECT_REF) ? normalizeProjectRef(env.SUPABASE_PROJECT_REF) : "";
  }

  if (!localExecution) return "";
  const localProjectRef = readProjectRefFromLocalEnv(envPath);
  return isValidProjectRef(localProjectRef) ? normalizeProjectRef(localProjectRef) : "";
}

export function parseArgs(argv = [], options = {}) {
  const healthArg = argv.find((arg) => arg.startsWith("--health-report="));
  return {
    projectRef: resolveProjectRef({ argv, ...options }),
    healthReport: healthArg?.slice("--health-report=".length) || options.env?.SUPABASE_HEALTH_LOG_REPORT?.trim() || process.env.SUPABASE_HEALTH_LOG_REPORT?.trim(),
  };
}

function runSupabase(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(executable, ["supabase", ...args], {
    cwd: webRoot,
    encoding: "utf8",
    stdio: "pipe",
    // Windows exposes npx.cmd as a command wrapper; Node cannot pipe it
    // directly without the platform shell, while Unix npx remains direct.
    shell: process.platform === "win32",
    windowsHide: true,
  });
}

function parseJson(result, label) {
  if (result.status !== 0) throw new Error(`${label} unavailable`);
  try {
    return JSON.parse(result.stdout || "null");
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function projectMatches(projects, projectRef) {
  const values = Array.isArray(projects) ? projects.flatMap((entry) => (Array.isArray(entry) ? entry : [entry])) : [];
  return values.some((project) => [project?.id, project?.ref, project?.project_ref].includes(projectRef));
}

function verifyHealthLogReport(reportPath, projectRef) {
  if (!reportPath) return { status: "BLOCKED_ACCESS", reason: "Supabase health/log evidence was not supplied by the authorized read-only interface." };
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const matchingProject = report.projectRef === projectRef;
  const healthPass = report.health?.status === "PASS";
  const logsPass = report.logs?.status === "PASS";
  return matchingProject && healthPass && logsPass
    ? { status: "PASS", reason: "health and logs evidence matches the target project" }
    : { status: "FAIL", reason: "health/log evidence is incomplete or targets another project" };
}

export function evaluateSupabaseRelease({ projectRef, projects, commands, healthLogs }) {
  const commandFailures = commands.filter((command) => command.status !== 0);
  const status = !projectRef || !projectMatches(projects, projectRef)
    ? "BLOCKED_ACCESS"
    : commandFailures.length > 0
      ? "FAIL"
      : healthLogs.status;
  return { status, commandFailures: commandFailures.length };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!isValidProjectRef(args.projectRef)) {
    console.error("CONTROL_STATUS: BLOCKED_ACCESS");
    console.error("SUPABASE_PROJECT_REF is required and must be a valid explicit project reference.");
    process.exitCode = 1;
    return;
  }

  try {
    const projects = parseJson(runSupabase(["projects", "list", "--output", "json"]), "Supabase projects list");
    const commands = [
      runSupabase(["branches", "list", "--project-ref", args.projectRef, "--output", "json"]),
      runSupabase(["migration", "list", "--linked"]),
      runSupabase(["db", "push", "--dry-run"]),
      runSupabase(["db", "advisors", "--linked", "--type", "security", "--level", "info", "--fail-on", "none", "--output-format", "json"]),
      runSupabase(["db", "advisors", "--linked", "--type", "performance", "--level", "info", "--fail-on", "none", "--output-format", "json"]),
    ];
    const healthLogs = verifyHealthLogReport(args.healthReport, args.projectRef);
    const summary = evaluateSupabaseRelease({ projectRef: args.projectRef, projects, commands, healthLogs });
    console.log(`SUPABASE_PROJECT_REF: ${args.projectRef}`);
    console.log(`SUPABASE_COMMAND_FAILURES: ${summary.commandFailures}`);
    console.log(`SUPABASE_HEALTH_LOG_STATUS: ${healthLogs.status}`);
    console.log(`CONTROL_STATUS: ${summary.status}`);
    if (summary.status !== "PASS") {
      console.error(healthLogs.reason);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("CONTROL_STATUS: BLOCKED_ACCESS");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
