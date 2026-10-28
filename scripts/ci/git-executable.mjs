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

export function trustedCommandEnvironment(baseEnvironment = process.env, additionalExecutables = []) {
  const directories = new Set([
    path.dirname(gitExecutable()),
    path.dirname(process.execPath),
    ...additionalExecutables.filter(Boolean).map((executable) => path.dirname(executable)),
  ]);
  if (process.platform !== "win32") {
    directories.add("/usr/bin");
    directories.add("/bin");
  } else if (typeof baseEnvironment.SystemRoot === "string" && path.win32.isAbsolute(baseEnvironment.SystemRoot)) {
    directories.add(path.win32.join(baseEnvironment.SystemRoot, "System32"));
  }
  return { ...baseEnvironment, PATH: [...directories].join(path.delimiter) };
}

export function assertSafeGitRef(value, label = "Git ref") {
  const ref = String(value ?? "").trim();
  if (
    !ref
    || ref.startsWith("-")
    || ref.includes("\0")
    || /\s/.test(ref)
    || ref.includes("..")
    || ref.includes("@{")
    || ref.endsWith(".")
    || ref.endsWith("/")
    || ref.includes("//")
    || !/^[A-Za-z0-9._/~^-]+$/.test(ref)
  ) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return ref;
}

export { isTrustedGitPath, resolveGitExecutable };
