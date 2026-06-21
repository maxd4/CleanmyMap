import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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
});
