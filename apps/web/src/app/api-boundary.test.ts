import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROUTE_FILE_PATTERN = /(^|[\\/])route\.(ts|tsx)$/;
const FORBIDDEN_CLIENT_HOOK_PATTERN =
  /\b(?:useSitePreferences|useRouter|useSearchParams|usePathname|useTranslation)\s*\(/;
const FORBIDDEN_CLIENT_HOOK_IMPORT_PATTERN =
  /import[\s\S]*\b(?:useSitePreferences|useRouter|useSearchParams|usePathname|useTranslation)\b[\s\S]*from\s+["'][^"']+["']/;

async function collectRouteFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(absolutePath)));
      continue;
    }

    if (ROUTE_FILE_PATTERN.test(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("api boundary", () => {
  it("keeps client hooks out of server app api route handlers", async () => {
    const files = await collectRouteFiles(APP_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (
        FORBIDDEN_CLIENT_HOOK_IMPORT_PATTERN.test(content) ||
        FORBIDDEN_CLIENT_HOOK_PATTERN.test(content)
      ) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });
});
