#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const WARN_LINES = 500;
const FAIL_LINES = 700;
const WARN_BYTES = 40 * 1024;
const FAIL_BYTES = 60 * 1024;
const SOURCE_PREFIX = "apps/web/src/";
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const BASELINE_ALLOWED = new Set([]);

function getExtension(path) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function countLines(path) {
  const content = readFileSync(resolve(ROOT, path), "utf8");
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

function main() {
  const trackedFiles = listTrackedFiles();
  const candidates = trackedFiles.filter(
    (path) =>
      path.startsWith(SOURCE_PREFIX) && CODE_EXTENSIONS.has(getExtension(path)),
  );

  const warnings = [];
  const failures = [];
  for (const path of candidates) {
    const absolutePath = resolve(ROOT, path);
    const size = statSync(absolutePath).size;
    const lines = countLines(path);
    if (lines > FAIL_LINES || size > FAIL_BYTES) {
      failures.push({
        path,
        lines,
        sizeKB: (size / 1024).toFixed(2),
      });
      continue;
    }
    if (lines > WARN_LINES || size > WARN_BYTES) {
      warnings.push({
        path,
        lines,
        sizeKB: (size / 1024).toFixed(2),
      });
    }
  }

  const baselineWarnings = warnings.filter((item) =>
    BASELINE_ALLOWED.has(item.path),
  );
  const unexpectedWarnings = warnings.filter(
    (item) => !BASELINE_ALLOWED.has(item.path),
  );
  const baselineFailures = failures.filter((item) =>
    BASELINE_ALLOWED.has(item.path),
  );
  const unexpectedFailures = failures.filter(
    (item) => !BASELINE_ALLOWED.has(item.path),
  );

  if (unexpectedFailures.length > 0) {
    console.error(
      `[top-heavy] ${unexpectedFailures.length} unexpected file(s) exceed hard thresholds (> ${FAIL_LINES} lines OR > ${(FAIL_BYTES / 1024).toFixed(0)}KB):`,
    );
    for (const violation of unexpectedFailures) {
      console.error(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
    process.exit(1);
  }

  if (baselineFailures.length > 0) {
    console.warn(
      `[top-heavy] baseline hard-threshold warning: ${baselineFailures.length} known file(s) still above fail threshold:`,
    );
    for (const violation of baselineFailures) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  if (unexpectedWarnings.length > 0) {
    console.warn(
      `[top-heavy] audit warning: ${unexpectedWarnings.length} file(s) exceed soft threshold (> ${WARN_LINES} lines OR > ${(WARN_BYTES / 1024).toFixed(0)}KB). Review cohesion/maintainability:`,
    );
    for (const violation of unexpectedWarnings) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  if (baselineWarnings.length > 0) {
    console.warn(
      `[top-heavy] baseline soft-threshold warning: ${baselineWarnings.length} known file(s) still above audit threshold:`,
    );
    for (const violation of baselineWarnings) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  console.log(
    `[top-heavy] OK: no file above hard threshold (${FAIL_LINES} lines / ${(FAIL_BYTES / 1024).toFixed(0)}KB) in ${SOURCE_PREFIX}`,
  );
}

main();
