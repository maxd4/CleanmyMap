import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LIB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LIB_FILE_PATTERN = /\.(tsx|ts)$/;
const IGNORED_FILE_PATTERN = /(\.test|\.spec|\.stories)\.[tj]sx?$/;
const SENSITIVE_CLIENT_HOOK_CALL_PATTERN =
  /\buse(?:SitePreferences|Router|SearchParams|Pathname|Translation)\s*\(/;
const USE_CLIENT_PATTERN = /^\s*"use client";/m;

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (LIB_FILE_PATTERN.test(absolutePath) && !IGNORED_FILE_PATTERN.test(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("server lib boundary", () => {
  it("keeps sensitive client hooks out of non-client lib modules", async () => {
    const files = await collectFiles(LIB_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (USE_CLIENT_PATTERN.test(content)) {
        continue;
      }

      if (SENSITIVE_CLIENT_HOOK_CALL_PATTERN.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });
});
