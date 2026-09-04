import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(LIB_DIR, "../..");

function parseTemplateKeys(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter((key): key is string => Boolean(key));
}

function parseSchemaKeys(source: string): string[] {
  const schemaSource = source.slice(
    source.indexOf("const envSchema"),
    source.indexOf("const candidate"),
  );
  return [...schemaSource.matchAll(/^\s*([A-Z][A-Z0-9_]*):/gm)].map(
    ([, key]) => key,
  );
}

function parseProcessEnvTypeKeys(source: string): string[] {
  return [...source.matchAll(/^\s*([A-Z][A-Z0-9_]*)(?:\?|):/gm)].map(
    ([, key]) => key,
  );
}

function listSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if ([".next", "node_modules", "coverage"].includes(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }
    if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) files.push(path);
  }
  return files;
}

function collectStaticProcessEnvKeys(): Set<string> {
  const keys = new Set<string>();
  const pattern = /process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;
  for (const file of listSourceFiles(APP_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      keys.add(match[1] ?? match[2]);
    }
  }
  return keys;
}

const EXECUTION_ENV_KEYS = new Set([
  "CI",
  "CLEANMYMAP_SHEET_URL",
  "DATABASE_URL",
  "GIT_COMMIT_SHA",
  "NODE_ENV",
  "PORT",
  "POSTGRES_URL_NON_POOLING",
  "SENTRY_CLI_BIN",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_URL",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_PREVIOUS_SHA",
]);

describe("env configuration", () => {
  it("does not embed production Supabase defaults", () => {
    const source = readFileSync(new URL("./env.ts", import.meta.url), "utf8");

    expect(source).not.toContain("https://mgvmuambbxmmkrjjlryo.supabase.co");
    expect(source).not.toContain("sb_publishable_2ZvYS31hhXeWkIGVaaPyMA_qzdutOI4");
  });

  it("does not embed a fallback Clerk publishable key", () => {
    const source = readFileSync(new URL("./env.ts", import.meta.url), "utf8");

    expect(source).not.toContain("LOCAL_DEV_CLERK_PUBLISHABLE_KEY");
    expect(source).not.toMatch(/pk_(?:test|live)_[A-Za-z0-9_-]{20,}/);
  });

  it("keeps the local template and runtime schema in lockstep", () => {
    const template = readFileSync(join(APP_DIR, ".env.local.example"), "utf8");
    const envSource = readFileSync(join(LIB_DIR, "env.ts"), "utf8");
    const typeSource = readFileSync(
      join(APP_DIR, "src", "types", "env.d.ts"),
      "utf8",
    );
    const templateKeys = new Set(parseTemplateKeys(template));
    const schemaKeys = new Set(parseSchemaKeys(envSource));
    const processEnvTypeKeys = new Set(parseProcessEnvTypeKeys(typeSource));

    expect([...templateKeys].sort()).toEqual([...schemaKeys].sort());
    expect([...schemaKeys].filter((key) => !processEnvTypeKeys.has(key))).toEqual(
      [],
    );
  });

  it("covers every static process.env key or classifies it as execution-only", () => {
    const envSource = readFileSync(join(LIB_DIR, "env.ts"), "utf8");
    const schemaKeys = new Set(parseSchemaKeys(envSource));
    const uncovered = [...collectStaticProcessEnvKeys()]
      .filter((key) => !schemaKeys.has(key) && !EXECUTION_ENV_KEYS.has(key))
      .sort();

    expect(uncovered).toEqual([]);
  });

  it("uses the local template for Vercel sync and keeps forbidden env files absent", () => {
    const syncSource = readFileSync(
      join(APP_DIR, "scripts", "vercel-sync-env.mjs"),
      "utf8",
    );

    expect(syncSource).toContain('resolve(cwd, ".env.local.example")');
    expect(syncSource).not.toContain('resolve(cwd, ".env.example")');
    for (const filename of [
      ".env.example",
      ".env.development",
      ".env.production",
      ".env.preview",
    ]) {
      expect(existsSync(join(APP_DIR, filename))).toBe(false);
    }
  });
});
