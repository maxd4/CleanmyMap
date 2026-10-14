import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WINDOWS_GIT_PATHS = Object.freeze([
  "C:\\Program Files\\Git\\cmd\\git.exe",
  "C:\\Program Files\\Git\\bin\\git.exe",
  "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
  "C:\\Program Files (x86)\\Git\\bin\\git.exe",
]);

const POSIX_GIT_PATHS = Object.freeze([
  "/usr/bin/git",
  "/usr/local/bin/git",
  "/bin/git",
  "/opt/homebrew/bin/git",
]);

let cachedGitExecutable;

function normalizedPath(value, platform) {
  const normalized = platform === "win32"
    ? path.win32.normalize(String(value)).replaceAll("/", "\\")
    : path.posix.normalize(String(value));
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isTrustedGitPath(candidate, platform = process.platform) {
  const normalized = normalizedPath(candidate, platform);
  const trustedPaths = platform === "win32"
    ? WINDOWS_GIT_PATHS.map((value) => normalizedPath(value, platform))
    : POSIX_GIT_PATHS.map((value) => normalizedPath(value, platform));
  return trustedPaths.includes(normalized);
}

function existingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveGitExecutable({
  platform = process.platform,
  candidates = platform === "win32" ? WINDOWS_GIT_PATHS : POSIX_GIT_PATHS,
  fileExists = existingFile,
} = {}) {
  for (const candidate of candidates) {
    if (isTrustedGitPath(candidate, platform) && fileExists(candidate)) return candidate;
  }

  throw new Error(
    `HOST_ENVIRONMENT: Git executable was not found in trusted fixed paths for ${platform}. PATH is intentionally not used.`,
  );
}

export function gitExecutable() {
  cachedGitExecutable ??= resolveGitExecutable();
  return cachedGitExecutable;
}

export { isTrustedGitPath, resolveGitExecutable };
