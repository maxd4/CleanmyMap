#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SECURITY_ADVISOR_COMMAND_OPTIONS = Object.freeze([
  "--type",
  "security",
  "--level",
  "info",
  "--fail-on",
  "none",
  "--output-format",
  "json",
]);

const RLS_ADVISOR_NAMES = new Set([
  "rls_disabled_in_public",
  "rls_enabled_no_policy",
  "policy_exists_rls_disabled",
]);

function normalizeAdvisorName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function advisorFindingsFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of ["advisors", "findings", "results", "data", "issues"]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
}

export function parseSecurityAdvisorOutput(output) {
  const trimmed = String(output ?? "").trim();
  if (trimmed.length === 0) {
    return [];
  }

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `Supabase security advisors did not return JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return advisorFindingsFromPayload(payload);
}

function findingName(finding) {
  if (!finding || typeof finding !== "object") {
    return "";
  }

  for (const key of ["name", "id", "slug", "key", "code"]) {
    if (typeof finding[key] === "string" && finding[key].trim().length > 0) {
      return finding[key];
    }
  }

  return "";
}

function isRlsContractFinding(finding) {
  const name = normalizeAdvisorName(findingName(finding));
  if (RLS_ADVISOR_NAMES.has(name)) {
    return true;
  }

  // Keep the filter explicit while accepting renamed Supabase equivalents
  // that still describe a disabled RLS contract or a missing policy.
  return (
    name.includes("rls") &&
    (name.includes("disabled") || name.includes("no_policy") || name.includes("policy_exists"))
  );
}

export function findRlsContractFindings(output) {
  return parseSecurityAdvisorOutput(output).filter(isRlsContractFinding);
}

function formatRlsFinding(finding) {
  const name = findingName(finding) || "unknown";
  const title = typeof finding?.title === "string" ? ` — ${finding.title}` : "";
  const level = typeof finding?.level === "string" ? ` [${finding.level}]` : "";
  return `${name}${level}${title}`;
}

function assertRlsContractClear(output) {
  const findings = findRlsContractFindings(output);
  if (findings.length > 0) {
    throw new Error(
      `Supabase RLS contract advisors found:\n${findings.map(formatRlsFinding).join("\n")}`,
    );
  }
}

function parseArgs(argv) {
  const out = {
    mode: "auto",
  };

  for (const arg of argv) {
    if (arg === "--local") {
      out.mode = "local";
      continue;
    }
    if (arg === "--linked") {
      out.mode = "linked";
      continue;
    }
  }

  return out;
}

function run(command, args, cwd) {
  if (process.platform === "win32") {
    const commandLine = [command, ...args].join(" ");
    return spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    });
  }

  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function runSupabase(args, cwd) {
  return run("npx", ["supabase", ...args], cwd);
}

function formatError(title, result) {
  const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return details ? `${title}\n${details}` : title;
}

function formatLinked403Help(result) {
  const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const accessTokenHelp = [
    "Supabase linked security advisors require a personal access token with project access and the `advisors_read` permission.",
    "Generate a fresh token from Supabase Dashboard -> Account -> Tokens, then run `supabase login --token <token>` or export `SUPABASE_ACCESS_TOKEN` before retrying.",
    "If the project was linked from another Supabase account, re-link it with the account that has Owner/Admin access to the target project ref.",
    "If you want a local-only path, install Docker Desktop so `backend:supabase:advisors:local` can run the CLI against the local stack.",
  ].join(" ");

  if (!details) {
    return accessTokenHelp;
  }

  return `${details}\n\n${accessTokenHelp}`;
}

function hasLinkedProject(cwd) {
  return existsSync(resolve(cwd, "supabase", ".temp", "linked-project.json"));
}

function runLocalAdvisors(cwd) {
  const status = runSupabase(["status", "--workdir", ".", "-o", "json"], cwd);
  if (status.status !== 0) {
    const start = runSupabase(["start", "--workdir", ".", "--yes"], cwd);
    if (start.status !== 0) {
      throw new Error(formatError("Supabase local start failed", start));
    }
  }

  const advisors = runSupabase(
    ["db", "advisors", "--local", ...SECURITY_ADVISOR_COMMAND_OPTIONS],
    cwd,
  );
  if (advisors.status !== 0) {
    throw new Error(formatError("Supabase local security advisors failed", advisors));
  }

  assertRlsContractClear(advisors.stdout || "");
  process.stdout.write(advisors.stdout || "");
}

function runLinkedAdvisors(cwd) {
  const advisors = runSupabase(
    ["db", "advisors", "--linked", ...SECURITY_ADVISOR_COMMAND_OPTIONS],
    cwd,
  );
  if (advisors.status !== 0) {
    const combinedOutput = `${advisors.stdout || ""}\n${advisors.stderr || ""}`;
    if (
      advisors.status === 403 ||
      combinedOutput.includes("necessary privileges to access this endpoint") ||
      combinedOutput.includes("LegacyDbConfigLoginRoleStatusError")
    ) {
      throw new Error(`Supabase linked security advisors failed with 403.\n${formatLinked403Help(advisors)}`);
    }

    throw new Error(formatError("Supabase linked security advisors failed", advisors));
  }

  assertRlsContractClear(advisors.stdout || "");
  process.stdout.write(advisors.stdout || "");
}

function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));

  try {
    if (args.mode === "linked") {
      runLinkedAdvisors(cwd);
      process.exit(0);
    }

    if (args.mode === "local") {
      runLocalAdvisors(cwd);
      process.exit(0);
    }

    try {
      runLocalAdvisors(cwd);
      process.exit(0);
    } catch (error) {
      if (!hasLinkedProject(cwd)) {
        throw error;
      }

      console.warn("[supabase] Local stack unavailable, falling back to linked project advisors.");
      runLinkedAdvisors(cwd);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
