#!/usr/bin/env node

import path from "node:path";
import { createRepositoryView, normalizeRepositoryPath, parseRepositoryRef } from "./repository-view.mjs";

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefixed = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefixed));
  return raw ? raw.slice(prefixed.length) : fallback;
}

function hasFlag(flag) {
  return args.includes(flag);
}

const maxLines = Number(readArg("--max-lines", "1000"));
const maxKb = Number(readArg("--max-kb", "50"));
const topCount = Number(readArg("--top", "20"));
const enforce = hasFlag("--enforce");
const baselinePath = normalizeRepositoryPath(readArg("--baseline", "scripts/checks/heavy-files-baseline.json"));
const scanRoots = (readArg("--roots", "apps/web/src") ?? "apps/web/src")
  .split(",")
  .map((value) => normalizeRepositoryPath(value.trim()))
  .filter(Boolean);

const includedExts = new Set([".ts", ".tsx"]);

function collectFiles(view, root) {
  return view.listFiles(root)
    .filter((file) => includedExts.has(path.posix.extname(file)))
    .filter((file) => !/(?:^|\/)(?:\.git|node_modules|\.next|dist|build|coverage|maintenance)(?:\/|$)/.test(file));
}

function loadBaseline(view) {
  if (!view.isFile(baselinePath)) {
    return new Set();
  }
  const parsed = JSON.parse(view.readText(baselinePath));
  const allowed = Array.isArray(parsed?.allowed) ? parsed.allowed : [];
  return new Set(allowed.filter((value) => typeof value === "string").map((value) => value.trim()));
}

function isCoveredByScanRoot(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

function main() {
  const ref = parseRepositoryRef(args);
  const view = createRepositoryView({ root: repoRoot, ref });
  const files = [...new Set(scanRoots.flatMap((root) => collectFiles(view, root)))];
  const rows = files.map((file) => {
    const content = view.readBinary(file);
    return { file, lines: content.toString("utf8").split(/\r?\n/).length, bytes: content.length };
  });

  rows.sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);
  const maxBytes = Math.round(maxKb * 1024);
  const offenders = rows.filter((row) => row.lines > maxLines || row.bytes > maxBytes);
  const baseline = loadBaseline(view);
  const newOffenders = offenders.filter((row) => !baseline.has(row.file));
  const offenderPaths = new Set(offenders.map((row) => row.file));
  const staleBaselineEntries = [...baseline].filter((file) =>
    scanRoots.some((root) => isCoveredByScanRoot(file, root)) && !offenderPaths.has(file));

  console.log(`Top heavy files (${scanRoots.join(", ")}): seuil lignes>${maxLines} ou taille>${maxKb}KB`);
  for (const row of rows.slice(0, Math.max(1, topCount))) {
    const lineFlag = row.lines > maxLines ? "!" : " ";
    const sizeFlag = row.bytes > maxBytes ? "!" : " ";
    const kb = (row.bytes / 1024).toFixed(1);
    console.log(` ${lineFlag}${sizeFlag} ${row.lines.toString().padStart(5, " ")} lignes | ${kb.padStart(6, " ")} KB | ${row.file}`);
  }

  if (staleBaselineEntries.length > 0) {
    console.log(`\nEntrées baseline obsolètes à retirer (${staleBaselineEntries.length}):`);
    for (const file of staleBaselineEntries) console.log(` - ${file}`);
  }

  if (offenders.length === 0) {
    console.log("OK: aucun fichier au-dessus des seuils.");
    process.exitCode = enforce && staleBaselineEntries.length > 0 ? 1 : 0;
    return;
  }

  console.log(`\nAlerte: ${offenders.length} fichier(s) depassent les seuils.`);
  if (newOffenders.length > 0) {
    console.log(`Nouveaux depassements hors baseline (${newOffenders.length}):`);
    for (const row of newOffenders) {
      const reasons = [];
      if (row.lines > maxLines) reasons.push(`${row.lines} lignes`);
      if (row.bytes > maxBytes) reasons.push(`${(row.bytes / 1024).toFixed(1)} KB`);
      console.log(` - ${row.file} (${reasons.join(", ")})`);
    }
  }
  process.exitCode = enforce && (newOffenders.length > 0 || staleBaselineEntries.length > 0) ? 1 : 0;
}

main();
