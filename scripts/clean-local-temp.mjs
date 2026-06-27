import os from "node:os";
import { spawnSync } from "node:child_process";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const tempRoot = process.env.TEMP || process.env.TMP || os.tmpdir();
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const minAgeMs = force ? 0 : 24 * 60 * 60 * 1000;
const now = Date.now();
const activeSafeAppNames = ["Codex", "Code", "Cursor"];

const trackedDirectories = new Set([
  "node-compile-cache",
  "vscode-stable-user-x64",
  "vscode-typescript",
  "vsch",
]);

const trackedFilePatterns = [
  /^codex-clipboard-.*\.png$/i,
  /^[0-9a-f-]+\.tmp\.(?:js|css|mjs|ts|json|map|html)$/i,
  /^__PSScriptPolicyTest_.*\.(?:ps1|psm1)$/i,
];

function hasActiveEditorProcesses() {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `@(Get-Process -Name ${activeSafeAppNames.map((name) => `'${name}'`).join(",")} -ErrorAction SilentlyContinue).Count`,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    return true;
  }

  return Number.parseInt(String(result.stdout).trim(), 10) > 0;
}

const activeEditorProcesses = hasActiveEditorProcesses();

async function directorySize(root) {
  let total = 0;
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        total += fileStat.size;
      }
    }
  }

  return total;
}

async function collectCandidates() {
  const entries = await readdir(tempRoot, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    const fullPath = join(tempRoot, entry.name);
    const entryStat = await stat(fullPath);
    const ageMs = now - entryStat.mtimeMs;

    if (entry.isDirectory()) {
      const isSensitiveDirectory = trackedDirectories.has(entry.name);
      const allowSensitiveDirectory = force || !activeEditorProcesses;

      if (!isSensitiveDirectory || ageMs < minAgeMs || !allowSensitiveDirectory) {
        continue;
      }

      candidates.push({
        kind: "directory",
        name: entry.name,
        fullPath,
        size: await directorySize(fullPath),
        mtimeMs: entryStat.mtimeMs,
      });
      continue;
    }

    if (entry.isFile()) {
      const matched = trackedFilePatterns.some((pattern) => pattern.test(entry.name));
      if (!matched || ageMs < minAgeMs) {
        continue;
      }

      candidates.push({
        kind: "file",
        name: entry.name,
        fullPath,
        size: entryStat.size,
        mtimeMs: entryStat.mtimeMs,
      });
    }
  }

  return candidates;
}

const candidates = await collectCandidates();

if (candidates.length === 0) {
  console.log(`[temp-clean] Aucun cache temporaire ciblé dans ${tempRoot}.`);
  process.exit(0);
}

const totalSize = candidates.reduce((sum, item) => sum + item.size, 0);
console.log(
  `[temp-clean] ${candidates.length} élément(s) ciblé(s), ${Math.round(totalSize / 1_048_576)} Mo à nettoyer${dryRun ? " (simulation)" : ""}.`,
);

for (const candidate of candidates.sort((a, b) => b.size - a.size)) {
  const ageHours = Math.round((now - candidate.mtimeMs) / 3_600_000);
  console.log(`- ${candidate.kind}: ${candidate.name} (${Math.round(candidate.size / 1_048_576)} Mo, ~${ageHours} h)`);
}

if (dryRun) {
  process.exit(0);
}

for (const candidate of candidates) {
  await rm(candidate.fullPath, { recursive: true, force: true, maxRetries: 2 });
}

console.log("[temp-clean] Nettoyage terminé.");
