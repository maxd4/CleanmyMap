#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";

const repoRoot = resolve(process.cwd());
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefixed = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefixed));
  if (!raw) {
    return fallback;
  }
  return raw.slice(prefixed.length);
}

function hasFlag(flag) {
  return args.includes(flag);
}

const maxLines = Number(readArg("--max-lines", "500"));
const maxKb = Number(readArg("--max-kb", "40"));
const topCount = Number(readArg("--top", "20"));
const enforce = hasFlag("--enforce");
const baselinePath = resolve(
  repoRoot,
  readArg("--baseline", "scripts/heavy-files-baseline.json"),
);

const scanRoots = (readArg("--roots", "apps/web/src") ?? "apps/web/src")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => resolve(repoRoot, value));

const includedExts = new Set([".ts", ".tsx"]);
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "legacy",
]);

function toRepoRelative(pathname) {
  return relative(repoRoot, pathname).split(sep).join("/");
}

function collectFiles(dir, output) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      collectFiles(fullPath, output);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!includedExts.has(extname(entry.name))) {
      continue;
    }
    output.push(fullPath);
  }
}

function loadBaseline() {
  if (!existsSync(baselinePath)) {
    return new Set();
  }
  const raw = readFileSync(baselinePath, "utf8");
  const parsed = JSON.parse(raw);
  const allowed = Array.isArray(parsed?.allowed) ? parsed.allowed : [];
  return new Set(
    allowed
      .filter((value) => typeof value === "string")
      .map((value) => value.trim()),
  );
}

const files = [];
for (const root of scanRoots) {
  if (!existsSync(root)) {
    continue;
  }
  collectFiles(root, files);
}

const rows = files.map((filePath) => {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).length;
  const bytes = statSync(filePath).size;
  return {
    file: toRepoRelative(filePath),
    lines,
    bytes,
  };
});

rows.sort((a, b) => {
  if (b.lines !== a.lines) {
    return b.lines - a.lines;
  }
  return b.bytes - a.bytes;
});

const maxBytes = Math.round(maxKb * 1024);
const offenders = rows.filter(
  (row) => row.lines > maxLines || row.bytes > maxBytes,
);
const baseline = loadBaseline();
const newOffenders = offenders.filter((row) => !baseline.has(row.file));

console.log(
  `Top heavy files (${scanRoots
    .map((root) => toRepoRelative(root))
    .join(", ")}): seuil lignes>${maxLines} ou taille>${maxKb}KB`,
);
for (const row of rows.slice(0, Math.max(1, topCount))) {
  const lineFlag = row.lines > maxLines ? "!" : " ";
  const sizeFlag = row.bytes > maxBytes ? "!" : " ";
  const kb = (row.bytes / 1024).toFixed(1);
  console.log(
    ` ${lineFlag}${sizeFlag} ${row.lines
      .toString()
      .padStart(5, " ")} lignes | ${kb.padStart(6, " ")} KB | ${row.file}`,
  );
}

if (offenders.length === 0) {
  console.log("OK: aucun fichier au-dessus des seuils.");
  process.exit(0);
}

console.log("");
console.log(`Alerte: ${offenders.length} fichier(s) depassent les seuils.`);

if (newOffenders.length > 0) {
  console.log(
    `Nouveaux depassements hors baseline (${newOffenders.length}):`,
  );
  for (const row of newOffenders) {
    const reasons = [];
    if (row.lines > maxLines) {
      reasons.push(`${row.lines} lignes`);
    }
    if (row.bytes > maxBytes) {
      reasons.push(`${(row.bytes / 1024).toFixed(1)} KB`);
    }
    console.log(` - ${row.file} (${reasons.join(", ")})`);
  }
}

if (enforce && newOffenders.length > 0) {
  process.exit(1);
}

process.exit(0);
