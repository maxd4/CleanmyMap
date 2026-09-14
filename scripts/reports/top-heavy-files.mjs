#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  HARD_THRESHOLD,
  REVIEW_THRESHOLD,
} from "../checks/top-heavy-policy.mjs";

const ROOT = resolve(".");
const WARN_LINES = REVIEW_THRESHOLD.lines;
const FAIL_LINES = HARD_THRESHOLD.lines;
const WARN_BYTES = REVIEW_THRESHOLD.bytes;
const FAIL_BYTES = HARD_THRESHOLD.bytes;
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
      `[top-heavy] ${unexpectedFailures.length} unexpected file(s) exceed HARD thresholds (> ${FAIL_LINES} lines OR > ${(FAIL_BYTES / 1024).toFixed(0)} KiB):`,
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
      `[top-heavy] ${baselineFailures.length} ratified exception(s) remain above HARD threshold:`,
    );
    for (const violation of baselineFailures) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  if (unexpectedWarnings.length > 0) {
    console.warn(
      `[top-heavy] REVIEW_REQUIRED: ${unexpectedWarnings.length} file(s) exceed review threshold (> ${WARN_LINES} lines OR > ${(WARN_BYTES / 1024).toFixed(0)} KiB). No automatic split:`,
    );
    for (const violation of unexpectedWarnings) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  if (baselineWarnings.length > 0) {
    console.warn(
      `[top-heavy] ${baselineWarnings.length} ratified exception(s) remain above REVIEW_THRESHOLD:`,
    );
    for (const violation of baselineWarnings) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  console.log(
    `[top-heavy] PASS: HARD threshold is >${FAIL_LINES} lines OR >${(FAIL_BYTES / 1024).toFixed(0)} KiB; REVIEW threshold is >${WARN_LINES} lines OR >${(WARN_BYTES / 1024).toFixed(0)} KiB in ${SOURCE_PREFIX}`,
  );
}

main();
