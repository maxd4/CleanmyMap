import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, realpath, rename, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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

const quarantineDirectoryPrefix = ".cleanmymap-temp-cleanup-";

function defaultTempRoot() {
  return process.env.TEMP || process.env.TMP || os.tmpdir();
}

function isDirectChild(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.includes(path.sep) && !path.isAbsolute(relative);
}

async function assertSafeTempRoot(value) {
  const root = path.resolve(value);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Refusing to clean an unsafe temporary root: ${root}`);
  }

  const canonicalRoot = await realpath(root);
  if (canonicalRoot !== root) {
    throw new Error(`Refusing to clean a redirected temporary root: ${root}`);
  }

  return root;
}

async function assertSafeCandidate(root, candidate) {
  const candidatePath = path.resolve(candidate.fullPath);
  if (!isDirectChild(root, candidatePath) || path.basename(candidatePath) !== candidate.name) {
    throw new Error(`Refusing to clean a path outside the temporary root: ${candidatePath}`);
  }

  const candidateStat = await lstat(candidatePath);
  if (candidateStat.isSymbolicLink()) {
    throw new Error(`Refusing to clean a symbolic link: ${candidatePath}`);
  }

  const canonicalCandidate = await realpath(candidatePath);
  if (!isDirectChild(root, canonicalCandidate) || path.basename(canonicalCandidate) !== candidate.name) {
    throw new Error(`Refusing to clean a redirected temporary entry: ${candidatePath}`);
  }

  const expectedKind = candidate.kind === "directory" ? candidateStat.isDirectory() : candidateStat.isFile();
  if (!expectedKind) {
    throw new Error(`Temporary entry changed type before cleanup: ${candidatePath}`);
  }

  return candidateStat;
}

export function resolvePowerShellExecutable({ platform = process.platform, env = process.env } = {}) {
  if (platform !== "win32") {
    return null;
  }

  const systemRoot = typeof env.SystemRoot === "string" ? env.SystemRoot.trim() : "";
  const windowsPath = path.win32;
  if (!systemRoot || !windowsPath.isAbsolute(systemRoot)) {
    return null;
  }

  return windowsPath.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

export function hasActiveEditorProcesses({ spawn = spawnSync, platform = process.platform, env = process.env } = {}) {
  const executable = resolvePowerShellExecutable({ platform, env });
  if (!executable) {
    return true;
  }

  let result;
  try {
    result = spawn(
      executable,
      [
        "-NoProfile",
        "-Command",
        `@(Get-Process -Name ${activeSafeAppNames.map((name) => `'${name}'`).join(",")} -ErrorAction SilentlyContinue).Count`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
  } catch {
    return true;
  }

  if (result?.error || result?.status !== 0) {
    return true;
  }

  const output = String(result.stdout ?? "").trim();
  if (!/^\d+$/.test(output)) {
    return true;
  }

  const count = Number(output);
  return Number.isSafeInteger(count) && count >= 0 ? count > 0 : true;
}

function hasSameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function createQuarantineDirectory(root) {
  const quarantineDirectory = path.join(root, `${quarantineDirectoryPrefix}${randomUUID()}`);
  await mkdir(quarantineDirectory, { mode: 0o700 });
  return quarantineDirectory;
}

async function removeEmptyQuarantineDirectory(quarantineDirectory) {
  try {
    await rmdir(quarantineDirectory);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY" && error?.code !== "EEXIST") {
      throw error;
    }
  }
}

export async function directorySize(root) {
  let total = 0;
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const currentStat = await lstat(current);
    if (currentStat.isSymbolicLink()) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const entryStat = await lstat(fullPath);
      if (entryStat.isSymbolicLink()) {
        continue;
      }
      if (entryStat.isDirectory()) {
        stack.push(fullPath);
      } else if (entryStat.isFile()) {
        total += entryStat.size;
      }
    }
  }

  return total;
}

export async function collectCandidates({
  root = defaultTempRoot(),
  now = Date.now(),
  force = false,
  activeEditorProcesses = false,
} = {}) {
  const tempRoot = await assertSafeTempRoot(root);
  const minAgeMs = force ? 0 : 24 * 60 * 60 * 1000;
  const entries = await readdir(tempRoot, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    const fullPath = path.join(tempRoot, entry.name);
    const entryStat = await lstat(fullPath);
    if (entryStat.isSymbolicLink()) {
      continue;
    }

    const ageMs = now - entryStat.mtimeMs;
    if (entryStat.isDirectory()) {
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

    if (entryStat.isFile()) {
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

  return { tempRoot, candidates };
}

export async function removeCandidate(root, candidate, { beforeRename } = {}) {
  const tempRoot = await assertSafeTempRoot(root);
  const isAllowedDirectory = candidate.kind === "directory" && trackedDirectories.has(candidate.name);
  const isAllowedFile = candidate.kind === "file" && trackedFilePatterns.some((pattern) => pattern.test(candidate.name));
  if (!isAllowedDirectory && !isAllowedFile) {
    throw new Error(`Refusing to clean an unallowlisted temporary entry: ${candidate.name}`);
  }

  const candidateStat = await assertSafeCandidate(tempRoot, candidate);
  const quarantineDirectory = await createQuarantineDirectory(tempRoot);
  const quarantinedPath = path.join(quarantineDirectory, candidate.name);

  try {
    if (beforeRename) {
      await beforeRename();
    }

    await assertSafeTempRoot(tempRoot);
    await rename(candidate.fullPath, quarantinedPath);

    const quarantinedStat = await lstat(quarantinedPath);
    if (!hasSameFileIdentity(candidateStat, quarantinedStat)) {
      throw new Error(`Temporary entry changed identity before cleanup: ${candidate.fullPath}`);
    }

    await rm(quarantinedPath, {
      recursive: candidate.kind === "directory",
      force: false,
      maxRetries: 2,
    });
  } finally {
    await removeEmptyQuarantineDirectory(quarantineDirectory);
  }
}

export async function cleanLocalTemp({
  root = defaultTempRoot(),
  dryRun = false,
  force = false,
  now = Date.now(),
  activeEditorProcesses = hasActiveEditorProcesses(),
  log = console.log,
} = {}) {
  const { tempRoot, candidates } = await collectCandidates({
    root,
    now,
    force,
    activeEditorProcesses,
  });

  if (candidates.length === 0) {
    log(`[temp-clean] Aucun cache temporaire ciblé dans ${tempRoot}.`);
    return;
  }

  const totalSize = candidates.reduce((sum, item) => sum + item.size, 0);
  log(
    `[temp-clean] ${candidates.length} élément(s) ciblé(s), ${Math.round(totalSize / 1_048_576)} Mo à nettoyer${dryRun ? " (simulation)" : ""}.`,
  );

  for (const candidate of candidates.toSorted((a, b) => b.size - a.size)) {
    const ageHours = Math.round((now - candidate.mtimeMs) / 3_600_000);
    log(`- ${candidate.kind}: ${candidate.name} (${Math.round(candidate.size / 1_048_576)} Mo, ~${ageHours} h)`);
  }

  if (dryRun) {
    return;
  }

  for (const candidate of candidates) {
    await removeCandidate(tempRoot, candidate);
  }

  log("[temp-clean] Nettoyage terminé.");
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  cleanLocalTemp({
    dryRun: process.argv.includes("--dry-run"),
    force: process.argv.includes("--force"),
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
