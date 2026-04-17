#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return new Map();
  }
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    entries.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1));
  }
  return entries;
}

const cwd = process.cwd();
const appRoot = existsSync(resolve(cwd, "apps", "web", "package.json")) ? resolve(cwd, "apps", "web") : cwd;
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const localEnv = parseDotEnv(resolve(appRoot, ".env.local"));
const vercelPulledEnv = parseDotEnv(resolve(appRoot, ".env.vercel.local"));

const missingLocal = required.filter((key) => !localEnv.get(key));
const missingVercelPulled = required.filter((key) => !vercelPulledEnv.get(key));

const checks = {
  vercelLinked: existsSync(resolve(appRoot, ".vercel", "project.json")),
  supabaseLinked: existsSync(resolve(appRoot, "supabase", ".temp", "linked-project.json")),
  localEnvHasRequired: missingLocal.length === 0,
  pulledVercelEnvHasRequired: missingVercelPulled.length === 0,
};

console.log(JSON.stringify({ checks, missingLocal, missingVercelPulled }, null, 2));

if (!checks.vercelLinked || !checks.supabaseLinked || !checks.localEnvHasRequired || !checks.pulledVercelEnvHasRequired) {
  process.exit(1);
}
