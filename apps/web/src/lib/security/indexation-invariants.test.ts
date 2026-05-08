import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIVATE_APP_ROUTE_PREFIXES,
  PUBLIC_APP_SITEMAP_PATHS,
  getPrivateSectionRoutes,
} from "@/lib/seo/indexability";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("security indexation invariants", () => {
  it("keeps internal pages marked noindex", () => {
    expect(readSource("src/app/onboarding/page.tsx")).toContain("index: false");
    expect(readSource("src/app/reglages/page.tsx")).toContain("index: false");
    expect(readSource("src/app/form-comparison/page.tsx")).toContain("index: false");

    const sectionPage = readSource("src/app/(app)/sections/[sectionId]/page.tsx");
    expect(sectionPage).toContain("index: isIndexable");
    expect(sectionPage).toContain("follow: isIndexable");
  });

  it("keeps private routes outside the sitemap", () => {
    const publicSitemapPaths = [...PUBLIC_APP_SITEMAP_PATHS] as readonly string[];
    const privatePrefixes = [...PRIVATE_APP_ROUTE_PREFIXES] as readonly string[];
    const privateSectionRoutes = [...getPrivateSectionRoutes()] as readonly string[];

    for (const route of privatePrefixes) {
      expect(
        publicSitemapPaths.some(
          (pathname) => pathname === route || pathname.startsWith(`${route}/`),
        ),
      ).toBe(false);
    }

    expect(privateSectionRoutes.length).toBeGreaterThan(0);

    for (const route of privateSectionRoutes) {
      expect(publicSitemapPaths).not.toContain(route);
    }
  });
});
