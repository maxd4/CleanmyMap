import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIVATE_APP_ROUTE_PREFIXES,
  PUBLIC_APP_SITEMAP_PATHS,
  getPrivateSectionRoutes,
  getPublicNoindexSectionRoutes,
  getPublicSectionSitemapPaths,
} from "@/lib/seo/indexability";
import robots from "@/app/robots";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("security indexation invariants", () => {
  it("keeps internal pages marked noindex", () => {
    expect(readSource("src/app/onboarding/page.tsx")).toContain("index: false");
    expect(readSource("src/app/reglages/page.tsx")).toContain("index: false");
    expect(readSource("src/app/form-comparison/page.tsx")).toContain("index: false");

    const sectionPage = readSource("src/app/(app)/sections/[sectionId]/page.tsx");
    expect(sectionPage).toContain("PUBLIC_INDEXABLE_SECTION_IDS");
    expect(sectionPage).toContain("alternates: { canonical: `/sections/${section.id}` }");
  });

  it("keeps public hybrids indexable while their auth surfaces stay protected", () => {
    expect(readSource("src/app/(app)/actions/new/page.tsx")).toContain("index: true");
    expect(readSource("src/app/(app)/reports/page.tsx")).toContain("index: true");
    expect(readSource("src/app/(app)/signalement/page.tsx")).toContain("index: true");
    expect(readSource("src/app/sign-in/[[...sign-in]]/page.tsx")).toContain("index: false");
    expect(readSource("src/app/sign-up/[[...sign-up]]/page.tsx")).toContain("index: false");
    expect(readSource("src/app/error/429/page.tsx")).toContain("index: false");
    expect(readSource("src/app/docs/[...segments]/route.ts")).toContain(
      "markDocumentationNoindex",
    );
    expect(readSource("src/app/docs/[...segments]/route-seo.ts")).toContain(
      'response.headers.set("X-Robots-Tag", ROBOTS_NOINDEX_VALUE)',
    );
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

  it("keeps every sitemap route allowed by the global robots rule", () => {
    const publicSitemapPaths = [
      ...PUBLIC_APP_SITEMAP_PATHS,
      ...getPublicSectionSitemapPaths(),
    ];
    const rules = (Array.isArray(robots().rules)
      ? robots().rules
      : [robots().rules]) as Array<{
      userAgent?: string | string[];
      disallow?: string | string[];
    }>;
    const globalRule = rules.find(
      (rule) => !Array.isArray(rule.userAgent) && rule.userAgent === "*",
    );
    const disallowed = new Set(
      Array.isArray(globalRule?.disallow)
        ? globalRule.disallow
        : globalRule?.disallow
          ? [globalRule.disallow]
          : [],
    );

    for (const route of publicSitemapPaths) {
      expect(disallowed).not.toContain(route);
    }

    for (const route of getPublicNoindexSectionRoutes()) {
      expect(disallowed).not.toContain(route);
    }
  });
});
