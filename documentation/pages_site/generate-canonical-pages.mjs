#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  hasPagesSiteRouteDrift,
  renderPagesSiteRouteDriftMarkdown,
  runPagesSiteRouteDriftAudit,
} from "../../scripts/check-pages-site-route-drift.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const args = process.argv.slice(2);
const forbiddenWriteFlags = new Set([
  "--write",
  "--write-index",
  "--generate",
  "--overwrite",
]);

const forbiddenFlag = args.find((arg) => forbiddenWriteFlags.has(arg));
if (forbiddenFlag) {
  console.error(
    [
      "generate-canonical-pages.mjs est désormais non destructif.",
      `Le flag ${forbiddenFlag} est refusé pour éviter d'écraser des fiches enrichies manuellement.`,
      "Utiliser scripts/check-pages-site-route-drift.mjs pour auditer la dérive.",
    ].join("\n"),
  );
  process.exit(2);
}

const strict = args.includes("--strict");
const reportIndex = args.indexOf("--report");
const reportPath =
  reportIndex >= 0 && args[reportIndex + 1]
    ? path.resolve(repoRoot, args[reportIndex + 1])
    : null;

const report = await runPagesSiteRouteDriftAudit();
const markdown = renderPagesSiteRouteDriftMarkdown(report);

process.stdout.write(
  [
    "# Compatibilité — ancien générateur pages_site",
    "",
    "Ce fichier ne génère plus ni INDEX.md, ni README, ni dossiers photo.",
    "Il exécute uniquement l'audit de dérive route ↔ documentation.",
    "",
    markdown,
  ].join("\n"),
);

if (reportPath) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, markdown, "utf8");
  console.log(`Rapport écrit dans ${path.relative(repoRoot, reportPath)}`);
}

if (strict && hasPagesSiteRouteDrift(report)) {
  process.exitCode = 1;
}
