#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

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

  const advisors = runSupabase(["db", "advisors", "--local", "--type", "security", "--level", "warn"], cwd);
  if (advisors.status !== 0) {
    throw new Error(formatError("Supabase local security advisors failed", advisors));
  }

  process.stdout.write(advisors.stdout || "");
}

function runLinkedAdvisors(cwd) {
  const advisors = runSupabase(["db", "advisors", "--linked", "--type", "security", "--level", "warn"], cwd);
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

  process.stdout.write(advisors.stdout || "");
}

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
