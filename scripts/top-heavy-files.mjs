#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const MAX_LINES = 500;
const MAX_BYTES = 40 * 1024;
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

  const violations = [];
  for (const path of candidates) {
    const absolutePath = resolve(ROOT, path);
    const size = statSync(absolutePath).size;
    const lines = countLines(path);
    if (lines > MAX_LINES || size > MAX_BYTES) {
      violations.push({
        path,
        lines,
        sizeKB: (size / 1024).toFixed(2),
      });
    }
  }

  const baselineViolations = violations.filter((item) =>
    BASELINE_ALLOWED.has(item.path),
  );
  const unexpectedViolations = violations.filter(
    (item) => !BASELINE_ALLOWED.has(item.path),
  );

  if (unexpectedViolations.length > 0) {
    console.error(
      `[top-heavy] ${unexpectedViolations.length} unexpected file(s) exceed thresholds (> ${MAX_LINES} lines OR > 40KB):`,
    );
    for (const violation of unexpectedViolations) {
      console.error(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
    process.exit(1);
  }

  if (baselineViolations.length > 0) {
    console.warn(
      `[top-heavy] baseline warning: ${baselineViolations.length} known file(s) still above threshold:`,
    );
    for (const violation of baselineViolations) {
      console.warn(
        ` - ${violation.path} (${violation.lines} lines, ${violation.sizeKB} KB)`,
      );
    }
  }

  console.log(
    `[top-heavy] OK: no file above ${MAX_LINES} lines or 40KB in ${SOURCE_PREFIX}`,
  );
}

main();
