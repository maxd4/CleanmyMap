import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LIB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(LIB_ROOT, "..");
const USE_CLIENT_PATTERN = /^\s*["']use client["'];/m;
const SERVER_ONLY_IMPORT_PATTERN = new RegExp(
  String.raw`^\s*(?:import|export)\b[^\n]*from\s*["'](?:@/lib/supabase/server|@/lib/supabase/clerk-rls|@clerk/nextjs/server|next/headers|server-only|node:(?:fs|fs/promises|path|crypto))["']`,
  "gm",
);
const COMPONENTS_IMPORT_PATTERN = /(?:\b(?:import|export)\b[\s\S]*?\bfrom\s*|\bimport\s*\()\s*["']@\/components\//;

const SOURCE_FILE_PATTERN = /\.(?:ts|tsx)$/;
const TEST_FILE_PATTERN = /\.(?:test|spec|stories)\.[tj]sx?$/;

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readDirectory(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
      continue;
    }

    if (SOURCE_FILE_PATTERN.test(entry.name) && !TEST_FILE_PATTERN.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readDirectory(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptFiles(absolutePath)));
      continue;
    }

    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function readDirectory(directory: string) {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory, { withFileTypes: true });
}

describe("Server/Client boundaries", () => {
  it("keeps server-only imports out of Client Components", async () => {
    const files = await collectSourceFiles(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (!USE_CLIENT_PATTERN.test(content)) {
        continue;
      }

      if (SERVER_ONLY_IMPORT_PATTERN.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  }, 30000);

  it("keeps geo and map Actions independent from components", async () => {
    const sourceRoots = [
      path.join(LIB_ROOT, "actions", "map"),
      path.join(LIB_ROOT, "geo"),
    ];
    const violations: string[] = [];

    for (const sourceRoot of sourceRoots) {
      const files = await collectTypeScriptFiles(sourceRoot);
      for (const file of files) {
        const content = await readFile(file, "utf8");
        if (COMPONENTS_IMPORT_PATTERN.test(content)) {
          violations.push(path.relative(process.cwd(), file));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps sign-in Clerk loading UI on the server/client boundary", async () => {
    const source = await readFile(
      path.join(SRC_ROOT, "app", "sign-in", "[[...sign-in]]", "page.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(USE_CLIENT_PATTERN);
    expect(source).toContain("ClerkLoading");
    expect(source).toContain("ClerkLoaded");
    expect(source.indexOf("<ClerkLoading>")).toBeLessThan(
      source.indexOf("<ClerkLoaded>"),
    );
    expect(source.indexOf("<SignIn")).toBeGreaterThan(
      source.indexOf("<ClerkLoaded>"),
    );
  });

  it("keeps the admin page server-rendered without callback props on its report boundary", async () => {
    const source = await readFile(
      path.join(SRC_ROOT, "app", "(app)", "admin", "page.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(USE_CLIENT_PATTERN);
    const reportUsage = source.match(/<ActionsReportPanel[\s\S]*?\/>/);
    expect(reportUsage?.[0]).toBeDefined();
    const reportAttributeNames = (reportUsage?.[0] ?? "")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s+([a-z][A-Za-z0-9]*)=\{/u)?.[1])
      .filter((name): name is string => Boolean(name));
    expect(reportAttributeNames).toEqual([
      "initialRecordTypeFilter",
      "initialStatus",
    ]);
    expect(reportUsage?.[0]).not.toMatch(/\bon[A-Z][A-Za-z]*\s*=/);
  });

  it("keeps Annuaire contracts on the neutral partners domain seam", async () => {
    const partnersFiles = await collectSourceFiles(
      path.join(SRC_ROOT, "lib", "partners"),
    );
    const violations: string[] = [];

    for (const file of partnersFiles) {
      const content = await readFile(file, "utf8");
      if (content.includes("annuaire-map-canvas")) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    const contractSource = await readFile(
      path.join(SRC_ROOT, "lib", "partners", "annuaire-types.ts"),
      "utf8",
    );
    const mapSource = await readFile(
      path.join(
        SRC_ROOT,
        "components",
        "sections",
        "rubriques",
        "annuaire",
        "annuaire-map-canvas.tsx",
      ),
      "utf8",
    );

    expect(violations).toEqual([]);
    expect(contractSource).not.toMatch(USE_CLIENT_PATTERN);
    expect(contractSource).not.toMatch(/(?:react-)?leaflet/);
    expect(mapSource).toContain('from "@/lib/partners/annuaire-types"');
  });
});
