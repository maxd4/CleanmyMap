#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * CleanMyMap - Vercel Env Sync Tool
 * Version: 1.1.0 (Auto-branch & Dry-run support)
 */

function parseArgs(argv) {
  const out = {
    file: ".env.local",
    environments: ["development"],
    previewBranch: "",
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg.startsWith("--file=")) {
      out.file = arg.slice("--file=".length);
      continue;
    }
    if (arg.startsWith("--environments=")) {
      const raw = arg.slice("--environments=".length);
      const parsed = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (parsed.length > 0) {
        out.environments = parsed;
      }
      continue;
    }
    if (arg.startsWith("--preview-branch=")) {
      out.previewBranch = arg.slice("--preview-branch=".length).trim();
      continue;
    }
  }
  return out;
}

function getGitBranch() {
  try {
    const git = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
    if (git.status === 0) {
      return git.stdout.trim();
    }
  } catch (e) {
    // Git not available
  }
  return null;
}

function parseDotEnv(content) {
  const entries = new Map();
  const lines = content.split(/\r?\n/);
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
    const value = trimmed.slice(idx + 1);
    entries.set(key, value);
  }
  return entries;
}

function loadAllowedKeysFromExample(examplePath) {
  if (!existsSync(examplePath)) {
    return new Set();
  }
  const content = readFileSync(examplePath, "utf8");
  const map = parseDotEnv(content);
  const keys = new Set([...map.keys()]);
  keys.add("CLERK_ADMIN_USER_IDS");
  return keys;
}

function runCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    // PowerShell execution logic for Windows
    const quoted = [command, ...args]
      .map((value) => `'${String(value).replace(/'/g, "''")}'`)
      .join(" ");
    return spawnSync("powershell", ["-NoProfile", "-Command", `& ${quoted}`], {
      cwd: options.cwd,
      encoding: "utf8",
    });
  }
  return spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: "utf8",
  });
}

// MAIN LOGIC
const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const envPath = resolve(cwd, args.file);
const examplePath = resolve(cwd, ".env.example");

if (args.dryRun) {
  console.log("--- DRY RUN MODE (No changes will be applied) ---");
}

if (!existsSync(envPath)) {
  console.error(`[backend] Env source file missing: ${envPath}`);
  process.exit(1);
}

const source = parseDotEnv(readFileSync(envPath, "utf8"));
const allowed = loadAllowedKeysFromExample(examplePath);

if (allowed.size === 0) {
  console.error("[backend] .env.example not found or empty. Cannot determine allowed keys.");
  process.exit(1);
}

const toSync = [];
for (const [key, value] of source.entries()) {
  if (!allowed.has(key)) continue;
  if (!value || value.trim().length === 0) continue;
  if (key === "RESEND_TEST_TOKEN") continue;
  toSync.push([key, value]);
}

if (toSync.length === 0) {
  console.log("[backend] No non-empty env var to sync.");
  process.exit(0);
}

const failures = [];
let synced = 0;
let skipped = 0;

for (const target of args.environments) {
  let previewBranch = target === "preview" ? args.previewBranch : "";
  
  // Auto-detect branch if target is preview and no branch provided
  if (target === "preview" && !previewBranch) {
    const detected = getGitBranch();
    if (detected) {
      previewBranch = detected;
      console.log(`[backend] Auto-detected git branch for preview: ${previewBranch}`);
    } else {
      console.warn(`[backend] Warning: No branch provided for 'preview' environment and Git detection failed. Skipping.`);
      skipped += toSync.length;
      continue;
    }
  }

  console.log(`[backend] Syncing [${target}] ${previewBranch ? `(Branch: ${previewBranch})` : ""}...`);

  for (const [key, value] of toSync) {
    if (
      key === "NEXT_PUBLIC_APP_URL" &&
      target !== "development" &&
      /localhost|127\.0\.0\.1/i.test(value)
    ) {
      skipped += 1;
      continue;
    }

    if (args.dryRun) {
      console.log(`  [DRY] + ${key} (${target})`);
      synced += 1;
      continue;
    }

    const addArgs =
      target === "preview"
        ? ["vercel", "env", "add", key, "preview", previewBranch, "--value", value, "--yes", "--force"]
        : ["vercel", "env", "add", key, target, "--value", value, "--yes", "--force"];
    
    // Using npx vercel ensures the latest CLI or project local one is used
    const add = runCommand("npx", addArgs, { cwd });

    if (add.status === 0) {
      synced += 1;
      continue;
    }

    const addLog = `${add.stdout || ""}\n${add.stderr || ""}`;
    if (add.error) {
      failures.push(`[${target}] add ${key}: ${add.error.message}`.trim());
      continue;
    }
    
    // If it exists, we try to remove and re-add (clean replace)
    if (!/already exists|was found|exists/i.test(addLog)) {
      failures.push(`[${target}] add ${key}: ${addLog}`.trim());
      continue;
    }

    const rmArgs =
      target === "preview"
        ? ["vercel", "env", "rm", key, "preview", previewBranch, "--yes"]
        : ["vercel", "env", "rm", key, target, "--yes"];
    runCommand("npx", rmArgs, { cwd });

    const addAgain = runCommand("npx", addArgs, { cwd });
    if (addAgain.error) {
      failures.push(`[${target}] replace ${key}: ${addAgain.error.message}`.trim());
      continue;
    }
    if (addAgain.status !== 0) {
      failures.push(`[${target}] replace ${key}: ${(addAgain.stderr || addAgain.stdout || "").trim()}`.trim());
      continue;
    }
    synced += 1;
  }
}

console.log(`[backend] Vercel env sync done. synced=${synced} skipped=${skipped} failures=${failures.length}`);
if (failures.length > 0) {
  console.log("--- Failures (first 20) ---");
  for (const failure of failures.slice(0, 20)) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
