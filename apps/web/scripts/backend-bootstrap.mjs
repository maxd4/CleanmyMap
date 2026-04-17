#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function run(title, command, args, cwd) {
  console.log(`[backend] ${title}`);
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`${title} failed\n${details}`);
  }
}

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

const cwd = process.cwd();
const skipSupabase = hasFlag("--skip-supabase");
const skipVercelLink = hasFlag("--skip-vercel-link");
const skipVercelEnv = hasFlag("--skip-vercel-env");

if (!skipVercelLink && !existsSync(resolve(cwd, ".vercel", "project.json"))) {
  run("Vercel link", "npx", ["vercel", "link", "--yes"], cwd);
}

if (!skipSupabase) {
  run("Supabase migrations push", "npx", ["supabase", "db", "push", "--workdir", ".", "--yes"], cwd);
}

if (!skipVercelEnv) {
  run(
    "Vercel env sync (development, production)",
    "node",
    ["scripts/vercel-sync-env.mjs", "--file=.env.local", "--environments=development,production"],
    cwd,
  );
}

console.log("[backend] Bootstrap completed.");
