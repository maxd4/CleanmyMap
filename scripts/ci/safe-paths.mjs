import fs from "node:fs";
import path from "node:path";

function normalizedPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isPortableAbsolute(value) {
  return path.isAbsolute(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value);
}

function validatePathValue(value, label) {
  const raw = String(value ?? "");
  const normalized = raw.replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0")) {
    throw new Error(`Unsafe path supplied for ${label}.`);
  }
  return normalized;
}

function assertNoSymlinkInPath(value, { label = "path" } = {}) {
  const absolute = path.resolve(validatePathValue(value, label));
  let current = absolute;
  while (true) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(`Refusing a symbolic-link path for ${label}: ${value}`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return absolute;
}

export function assertSafeDirectoryRoot(value, { label = "directory root" } = {}) {
  const absolute = assertNoSymlinkInPath(value, { label });
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    throw new Error(`Unsafe ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`Unsafe ${label}: expected a real directory: ${value}`);
  }
  const canonical = fs.realpathSync.native(absolute);
  if (normalizedPath(canonical) !== normalizedPath(absolute)) {
    throw new Error(`Unsafe ${label}: redirected path: ${value}`);
  }
  return absolute;
}

export function resolvePathWithinRoot(root, relativePath, { label = "relative path" } = {}) {
  const normalizedRoot = assertNoSymlinkInPath(root, { label: `${label} root` });
  const normalized = validatePathValue(relativePath, label);
  const segments = normalized.split("/");
  if (isPortableAbsolute(normalized) || segments.includes("..")) {
    throw new Error(`Path escapes its ${label} root: ${relativePath}`);
  }
  const candidate = path.resolve(normalizedRoot, ...segments);
  const relative = path.relative(normalizedRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes its ${label} root: ${relativePath}`);
  }
  return assertNoSymlinkInPath(candidate, { label });
}

export function assertSafeExternalPath(value, { label = "path" } = {}) {
  const normalized = validatePathValue(value, label);
  if (normalized.split("/").includes("..")) {
    throw new Error(`Path traversal is not allowed for ${label}.`);
  }
  return assertNoSymlinkInPath(normalized, { label });
}
