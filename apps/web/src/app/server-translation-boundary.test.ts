import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PAGE_FILE_PATTERN = /(^|[\\/])(page|layout)\.tsx$/;
const USE_TRANSLATION_IMPORT_PATTERN =
  /from\s+["']@\/lib\/i18n\/use-translation["']/;
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

    if (PAGE_FILE_PATTERN.test(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("server translation boundary", () => {
  it("keeps useTranslation out of server app pages and layouts", async () => {
    const files = await collectFiles(APP_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (USE_CLIENT_PATTERN.test(content)) {
        continue;
      }

      if (USE_TRANSLATION_IMPORT_PATTERN.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  }, 30000);

  it("keeps sensitive client hooks out of server app pages and layouts", async () => {
    const files = await collectFiles(APP_ROOT);
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
  }, 30000);
});
