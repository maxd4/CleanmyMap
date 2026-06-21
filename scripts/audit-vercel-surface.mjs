#!/usr/bin/env node

import process from "node:process";
import {
  formatDynamicPageLabel,
  formatHeavyImportLabel,
  printList,
  scanVercelSurface,
} from "./vercel-audit-core.mjs";

const command = process.argv[2];
const surface = scanVercelSurface();

function printHelp() {
  console.log("Usage: node scripts/audit-vercel-surface.mjs <command>");
  console.log("");
  console.log("Commands:");
  console.log("  list-api-routes");
  console.log("  list-dynamic-pages");
  console.log("  list-force-dynamic");
  console.log("  list-revalidate-zero");
  console.log("  list-no-store");
  console.log("  list-cookies");
  console.log("  list-headers");
  console.log("  list-auth");
  console.log("  list-heavy-imports");
  console.log("  list-polling");
  console.log("  list-external-fetches");
}

switch (command) {
  case "list-api-routes":
    printList("API routes", surface.apiRoutes);
    break;
  case "list-dynamic-pages":
    printList("Dynamic pages", surface.dynamicPages.map(formatDynamicPageLabel));
    break;
  case "list-force-dynamic":
    printList("force-dynamic files", surface.forceDynamicPages);
    break;
  case "list-revalidate-zero":
    printList("revalidate=0 files", surface.revalidateZeroPages);
    break;
  case "list-no-store":
    printList("API routes using no-store", surface.noStoreRoutes);
    break;
  case "list-cookies":
    printList("Files using cookies()", surface.cookiesFiles);
    break;
  case "list-headers":
    printList("Files using headers()", surface.headersFiles);
    break;
  case "list-auth":
    printList("Files using auth()", surface.authFiles);
    break;
  case "list-heavy-imports":
    printList("Heavy imports", surface.heavyImports.map(formatHeavyImportLabel));
    break;
  case "list-polling":
    printList("Polling files", surface.pollingFiles);
    break;
  case "list-external-fetches":
    printList("Files with external fetches", surface.externalFetches);
    break;
  default:
    printHelp();
    process.exitCode = 1;
    break;
}
