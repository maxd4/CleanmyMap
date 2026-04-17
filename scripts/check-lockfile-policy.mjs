#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const repoRoot = resolve(process.cwd());
const canonicalLockfile = resolve(repoRoot, "package-lock.json");

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
]);

function normalizePath(pathname) {
  return process.platform === "win32" ? pathname.toLowerCase() : pathname;
}

function toRepoRelative(pathname) {
  return relative(repoRoot, pathname).split(sep).join("/");
}

function collectLockfiles(dir, output = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      collectLockfiles(fullPath, output);
      continue;
    }
    if (entry.isFile() && entry.name === "package-lock.json") {
      output.push(fullPath);
    }
  }
  return output;
}

const errors = [];

if (!existsSync(canonicalLockfile)) {
  errors.push("Le lockfile racine `package-lock.json` est manquant.");
}

const lockfiles = collectLockfiles(repoRoot);
for (const lockfile of lockfiles) {
  if (normalizePath(lockfile) !== normalizePath(canonicalLockfile)) {
    errors.push(
      `Lockfile non autorise detecte: \`${toRepoRelative(lockfile)}\`.`,
    );
  }
}

if (errors.length > 0) {
  console.error("Echec lockfile policy:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  "Lockfile policy OK: seul `package-lock.json` racine est autorise.",
);
