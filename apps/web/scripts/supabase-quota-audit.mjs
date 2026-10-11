#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { main, resolveDbUrl } from "./supabase-quota-audit-cli.mjs";
export {
  analyzeFile,
  aggregateTables,
} from "./supabase-quota-audit-analysis.mjs";
export { buildReport, formatMarkdownReport } from "./supabase-quota-audit-report.mjs";
export { listFilesRecursive } from "./supabase-quota-audit-source.mjs";
export { resolveDbUrl };

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  main();
}
