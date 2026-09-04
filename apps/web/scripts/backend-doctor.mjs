#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_LOCAL_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const URL_ENV_KEYS = new Set(["NEXT_PUBLIC_SUPABASE_URL"]);
const LOCAL_KEY_PREFIXES = new Map([
  ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_"],
  ["CLERK_SECRET_KEY", "sk_test_"],
]);

export function parseDotEnv(filePath) {
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
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
  }
  return entries;
}

function isValidLocalEnvValue(key, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  if (!URL_ENV_KEYS.has(key)) {
    const requiredPrefix = LOCAL_KEY_PREFIXES.get(key);
    return !requiredPrefix || value.trim().startsWith(requiredPrefix);
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getAppRoot(cwd = process.cwd()) {
  const resolvedCwd = resolve(cwd);
  return existsSync(resolve(resolvedCwd, "apps", "web", "package.json"))
    ? resolve(resolvedCwd, "apps", "web")
    : resolvedCwd;
}

export function checkBackendEnvironment(appRoot) {
  const localEnv = parseDotEnv(resolve(appRoot, ".env.local"));
  const missingLocal = REQUIRED_LOCAL_ENV_KEYS.filter((key) => !localEnv.get(key)?.trim());
  const invalidLocal = REQUIRED_LOCAL_ENV_KEYS.filter(
    (key) => !missingLocal.includes(key) && !isValidLocalEnvValue(key, localEnv.get(key)),
  );

  const checks = {
    vercelLinked: existsSync(resolve(appRoot, ".vercel", "project.json")),
    supabaseLinked: existsSync(resolve(appRoot, "supabase", ".temp", "linked-project.json")),
    localEnvHasRequired: missingLocal.length === 0,
    localEnvHasValidRequired: missingLocal.length === 0 && invalidLocal.length === 0,
  };

  return { checks, missingLocal, invalidLocal };
}

export function runDoctor({ cwd = process.cwd(), appRoot = null, log = console.log } = {}) {
  const report = checkBackendEnvironment(appRoot ?? getAppRoot(cwd));
  log(JSON.stringify(report, null, 2));

  const { checks } = report;
  return checks.vercelLinked &&
    checks.supabaseLinked &&
    checks.localEnvHasRequired &&
    checks.localEnvHasValidRequired
    ? 0
    : 1;
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  process.exitCode = runDoctor();
}
