#!/usr/bin/env node

import process from "node:process";
import {
  formatDynamicPageLabel,
  formatHeavyImportLabel,
  scanVercelSurface,
} from "./vercel-audit-core.mjs";

const surface = scanVercelSurface();

function emitWarning(title, message) {
  console.log(`::warning title=${title}::${message}`);
}

function printSection(title, values, formatter = (value) => value, limit = 10) {
  console.log(`${title}: ${values.length}`);
  for (const value of values.slice(0, limit)) {
    console.log(`  - ${formatter(value)}`);
  }
  if (values.length > limit) {
    console.log(`  - … ${values.length - limit} autres`);
  }
}

console.log("Audit Vercel CI (warnings only)");
console.log("");
console.log(
  "Les garde-fous critiques sont bloqués par les tests de régression; ce rapport n'échoue jamais la CI.",
);
console.log("");

const sections = [
  {
    title: "API routes",
    values: surface.apiRoutes,
  },
  {
    title: "Pages dynamiques",
    values: surface.dynamicPages,
    formatter: formatDynamicPageLabel,
  },
  {
    title: "force-dynamic",
    values: surface.forceDynamicPages,
  },
  {
    title: "revalidate=0",
    values: surface.revalidateZeroPages,
  },
  {
    title: "Fetchs no-store",
    values: surface.noStoreRoutes,
  },
  {
    title: "Files utilisant cookies()",
    values: surface.cookiesFiles,
  },
  {
    title: "Files utilisant headers()",
    values: surface.headersFiles,
  },
  {
    title: "Files utilisant auth()",
    values: surface.authFiles,
  },
  {
    title: "Imports lourds",
    values: surface.heavyImports,
    formatter: formatHeavyImportLabel,
    limit: 15,
  },
  {
    title: "Polling",
    values: surface.pollingFiles,
  },
  {
    title: "Fetchs externes",
    values: surface.externalFetches,
  },
];

for (const section of sections) {
  if (section.values.length === 0) {
    continue;
  }

  emitWarning(
    section.title,
    `${section.values.length} élément(s) détecté(s). Vérifier l'impact sur Invocations, Edge Requests et Origin Transfer.`,
  );
  printSection(section.title, section.values, section.formatter, section.limit ?? 10);
  console.log("");
}

if (surface.apiRoutes.length === 0 && surface.dynamicPages.length === 0) {
  console.log("Aucune surface Vercel sensible détectée.");
}

process.exitCode = 0;
