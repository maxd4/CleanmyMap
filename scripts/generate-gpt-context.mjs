import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contextRoot = path.join(repoRoot, "documentation", "gpt-context");
const manifestPath = path.join(contextRoot, "INDEX.md");
const manifestRow = /^\| `([^`]+)` \| `([^`]+)` \|/;

export function readManifest() {
  const entries = [];
  for (const line of fs.readFileSync(manifestPath, "utf8").split(/\r?\n/)) {
    const match = line.match(manifestRow);
    if (match) {
      entries.push({ target: match[1], source: match[2] });
    }
  }
  return entries;
}

function resolveInside(root, relativePath, label) {
  const absolutePath = path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its allowed boundary: ${relativePath}`);
  }
  return absolutePath;
}

export function resolveManifestEntries() {
  return readManifest().map(({ target, source }) => ({
    target,
    source,
    sourcePath: resolveInside(repoRoot, source, "Source"),
    targetPath: resolveInside(contextRoot, target, "Target"),
  }));
}

function compareEntries(entries) {
  const issues = [];
  for (const entry of entries) {
    if (!fs.existsSync(entry.sourcePath)) {
      issues.push(`missing source: ${entry.source}`);
      continue;
    }
    if (!fs.existsSync(entry.targetPath)) {
      issues.push(`missing target: ${entry.target}`);
      continue;
    }
    if (!fs.readFileSync(entry.sourcePath).equals(fs.readFileSync(entry.targetPath))) {
      issues.push(`drift: ${entry.target} <- ${entry.source}`);
    }
  }
  return issues;
}

export function check() {
  const issues = compareEntries(resolveManifestEntries());
  if (issues.length > 0) {
    console.error("GPT context snapshot check failed.");
    for (const issue of issues) console.error(`- ${issue}`);
    return false;
  }
  console.log(`GPT context snapshot is synchronized (${readManifest().length} files).`);
  return true;
}

export function sync() {
  const entries = resolveManifestEntries();
  for (const entry of entries) {
    if (!fs.existsSync(entry.sourcePath)) {
      throw new Error(`Missing source: ${entry.source}`);
    }
    fs.mkdirSync(path.dirname(entry.targetPath), { recursive: true });
    fs.copyFileSync(entry.sourcePath, entry.targetPath);
  }
  console.log(`GPT context snapshot regenerated (${entries.length} files).`);
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentFile === invokedFile) {
  if (process.argv.includes("--check")) {
    process.exitCode = check() ? 0 : 1;
  } else {
    sync();
  }
}
