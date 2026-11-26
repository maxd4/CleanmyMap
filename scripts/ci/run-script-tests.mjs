#!/usr/bin/env node

import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const SCRIPT_TEST_ROOTS = Object.freeze(["scripts", "apps/web/scripts"]);

export const EXCLUSIVE_SCRIPT_TEST_FILES = new Set([
  "scripts/checks/coverage-evidence.test.mjs",
  "scripts/checks/guard-artifacts.test.mjs",
  "scripts/ci/coverage-publication.test.mjs",
  "scripts/ci/pre_push_guard.test.mjs",
  "scripts/reports/generate-coverage-reference.test.mjs",
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

export function discoverScriptTestFiles(root = REPO_ROOT) {
  const discovered = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "coverage") continue;
        walk(fullPath);
        continue;
      }
      if (/\.(?:test)\.(?:mjs|js)$/.test(entry.name)) {
        discovered.push(normalizePath(path.relative(root, fullPath)));
      }
    }
  }
  for (const relativeRoot of SCRIPT_TEST_ROOTS) {
    const absRoot = path.join(root, relativeRoot);
    walk(absRoot);
  }
  return discovered.sort((a, b) => a.localeCompare(b, "en"));
}

export function partitionScriptTestFiles(allFiles) {
  const parallelFiles = [];
  const exclusiveFiles = [];
  for (const file of allFiles) {
    if (EXCLUSIVE_SCRIPT_TEST_FILES.has(file)) {
      exclusiveFiles.push(file);
    } else {
      parallelFiles.push(file);
    }
  }
  return { parallelFiles, exclusiveFiles };
}

function runNodeTestBatch(files, concurrency) {
  if (files.length === 0) return 0;
  const args = [
    "--experimental-strip-types",
    "--test",
    `--test-concurrency=${concurrency}`,
    "--test-reporter=dot",
    "--test-timeout=300000",
    ...files,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const allFiles = discoverScriptTestFiles();
  const { parallelFiles, exclusiveFiles } = partitionScriptTestFiles(allFiles);
  console.log(
    `[test:scripts] parallel=${parallelFiles.length} (concurrency=6) exclusive=${exclusiveFiles.length} (concurrency=1) total=${allFiles.length}`,
  );
  const parallelStatus = runNodeTestBatch(parallelFiles, 6);
  const exclusiveStatus = runNodeTestBatch(exclusiveFiles, 1);
  process.exitCode = parallelStatus !== 0 ? parallelStatus : exclusiveStatus;
}
