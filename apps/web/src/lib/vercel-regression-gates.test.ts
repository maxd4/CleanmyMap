import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createFilesystemRepositoryView } from "../../../../scripts/checks/repository-view.mjs";
import {
  hasNearbyJustificationComment,
  scanVercelSurface,
} from "../../../../scripts/vercel-audit-core.mjs";

type DynamicPageEntry = {
  path: string;
  signals: string[];
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../../..");
const baselinePath = path.join(repoRoot, "scripts", "vercel-api-routes-baseline.json");

function readBaselineApiRoutes(): string[] {
  const raw = fs.readFileSync(baselinePath, "utf8");
  const parsed = JSON.parse(raw) as { apiRoutes?: string[] };
  return parsed.apiRoutes ?? [];
}

function scanFixture(files: Record<string, string>) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-vercel-audit-"));

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(fixtureRoot, ...relativePath.split("/"));
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content, "utf8");
    }

    return scanVercelSurface({ view: createFilesystemRepositoryView(fixtureRoot) });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function assertJustifiedEntries(
  entries: string[],
  markerRegex: RegExp,
  label: string,
) {
  for (const relPath of entries) {
    const absPath = path.join(repoRoot, relPath);
    expect(
      hasNearbyJustificationComment(absPath, markerRegex),
      `${label} lacks a justification comment: ${relPath}`,
    ).toBe(true);
  }
}

describe("vercel regression gates", () => {
  const surface = scanVercelSurface();

  it("keeps the API route count stable until a change is justified", () => {
    const baselineRoutes = readBaselineApiRoutes();
    expect(surface.apiRoutes).toEqual(baselineRoutes);
    expect(surface.apiRoutes.length).toBe(baselineRoutes.length);
  });

  it("requires a justification comment for force-dynamic pages", () => {
    assertJustifiedEntries(
      surface.forceDynamicPages,
      /export const dynamic\s*=\s*["']force-dynamic["']/,
      "force-dynamic page",
    );
  });

  it("requires a justification comment for API routes using no-store", () => {
    assertJustifiedEntries(surface.noStoreRoutes, /no-store/, "no-store route");
  });

  it("requires a justification comment for polling files", () => {
    assertJustifiedEntries(
      surface.pollingFiles,
      /(?:setInterval|refetchInterval)\s*\(/,
      "polling file",
    );
  });

  it("detects dynamic pages that inherit auth helpers through imports", () => {
    const onboardingPage = (surface.dynamicPages as DynamicPageEntry[]).find(
      (entry) => entry.path === "apps/web/src/app/onboarding/page.tsx",
    );

    expect(onboardingPage, "onboarding page should be classified as dynamic").toBeDefined();
    expect(onboardingPage?.signals).toEqual(
      expect.arrayContaining(["auth", "headers"]),
    );
  });

  it("does not propagate runtime signals through type-only imports and re-exports", () => {
    const fixture = scanFixture({
      "apps/web/src/app/type-import-space/page.tsx":
        'import type { AuthMarker } from "@/lib/auth-runtime";\n',
      "apps/web/src/app/type-import-tab/page.tsx":
        'import\ttype { AuthMarker } from "@/lib/auth-runtime";\n',
      "apps/web/src/app/type-export-space/page.tsx":
        'export type { AuthMarker } from "@/lib/auth-runtime";\n',
      "apps/web/src/app/type-export-tab/page.tsx":
        'export\ttype { AuthMarker } from "@/lib/auth-runtime";\n',
      "apps/web/src/lib/auth-runtime.ts":
        "export function auth() { return null; }\n",
    });

    expect(fixture.dynamicPages).toEqual([]);
  });

  it("keeps runtime static and dynamic imports in the dependency graph", () => {
    const fixture = scanFixture({
      "apps/web/src/app/runtime-static/page.tsx":
        'import\t{ auth }\tfrom "@/lib/auth-runtime";\n',
      "apps/web/src/app/runtime-export/page.tsx":
        'export\t{ auth }\tfrom "@/lib/auth-runtime";\n',
      "apps/web/src/app/runtime-dynamic/page.tsx":
        'const authModule = import\t("@/lib/auth-runtime");\nvoid authModule;\n',
      "apps/web/src/lib/auth-runtime.ts":
        "export function auth() { return null; }\n",
    });

    expect(fixture.dynamicPages).toEqual([
      { path: "apps/web/src/app/runtime-dynamic/page.tsx", signals: ["auth"] },
      { path: "apps/web/src/app/runtime-export/page.tsx", signals: ["auth"] },
      { path: "apps/web/src/app/runtime-static/page.tsx", signals: ["auth"] },
    ]);
  });
});
