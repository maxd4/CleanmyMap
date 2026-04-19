#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const SENSITIVE_PREFIXES = [
  "apps/web/src/",
  "documentation/",
];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
]);

function isSensitiveTextFile(path) {
  if (!SENSITIVE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  const lastDot = path.lastIndexOf(".");
  if (lastDot < 0) {
    return false;
  }
  const ext = path.slice(lastDot).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => isSensitiveTextFile(path));
}

function validateUtf8Buffer(buffer, relativePath) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  decoder.decode(buffer);
}

function hasUtf8Bom(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  );
}

function main() {
  const files = listTrackedFiles();
  const failures = [];
  const bomFiles = [];

  for (const relativePath of files) {
    try {
      const absolutePath = resolve(ROOT, relativePath);
      const buffer = readFileSync(absolutePath);
      validateUtf8Buffer(buffer, relativePath);
      if (hasUtf8Bom(buffer)) {
        bomFiles.push(relativePath);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown UTF-8 error";
      failures.push(message);
    }
  }

  if (failures.length > 0) {
    console.error(`[utf8-fr] ${failures.length} file(s) failed UTF-8 checks:`);
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log(`[utf8-fr] OK: ${files.length} sensitive French text file(s) validated.`);
  if (bomFiles.length > 0) {
    console.log(
      `[utf8-fr] warning: ${bomFiles.length} file(s) contain UTF-8 BOM (non-blocking).`,
    );
  }
}

main();
