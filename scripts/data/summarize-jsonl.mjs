#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  NA,
  TOKEN_FIELDS,
  DERIVED_TOKEN_FIELDS,
  ALL_TOKEN_FIELDS,
  parseArgs,
  walkFiles,
} from "./summarize-jsonl-input.mjs";
import { analyzeRoot } from "./summarize-jsonl-analysis.mjs";
import {
  escapeCell,
  table,
  printMarkdown,
  writeArtifacts,
} from "./summarize-jsonl-report.mjs";

export {
  NA,
  TOKEN_FIELDS,
  DERIVED_TOKEN_FIELDS,
  ALL_TOKEN_FIELDS,
  walkFiles,
  analyzeRoot,
  escapeCell,
  table,
  printMarkdown,
  writeArtifacts,
};

export function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.root)) {
    console.error("Root directory not found: " + options.root);
    process.exitCode = 1;
    return;
  }
  const report = analyzeRoot(options.root, { currentHead: options.currentHead });
  if (options.outputDir) report.artifacts = writeArtifacts(report, options.outputDir);
  if (options.format === "json") console.log(JSON.stringify(report, null, 2));
  else printMarkdown(report);
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) main();
