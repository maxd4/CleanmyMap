import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const COMPONENTS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_FILE_PATTERN = /\.(tsx|ts)$/;
const IGNORED_FILE_PATTERN = /(\.test|\.spec|\.stories)\.[tj]sx?$/;
const SENSITIVE_CLIENT_HOOK_CALL_PATTERN =
  /\buse(?:SitePreferences|Router|SearchParams|Pathname)\s*\(/;
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

    if (COMPONENT_FILE_PATTERN.test(absolutePath) && !IGNORED_FILE_PATTERN.test(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("server component boundary", () => {
  it("keeps sensitive client hooks out of non-client components", async () => {
    const files = await collectFiles(COMPONENTS_ROOT);
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
  }, 10000);
});
