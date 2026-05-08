import { describe, expect, it } from "vitest";
import {
  PRIVATE_APP_ROUTE_PREFIXES,
  PUBLIC_APP_SITEMAP_PATHS,
  getPublicSectionSitemapPaths,
  getPrivateSectionRoutes,
  isPrivateAppPath,
} from "./indexability";

describe("indexability helpers", () => {
  it("keeps private and unfinished routes out of the public sitemap list", () => {
    const publicSitemapPaths = [...PUBLIC_APP_SITEMAP_PATHS] as readonly string[];
    const privatePrefixes = [...PRIVATE_APP_ROUTE_PREFIXES] as readonly string[];

    expect(publicSitemapPaths).not.toContain("/dashboard");
    expect(publicSitemapPaths).not.toContain("/profil");
    expect(publicSitemapPaths).not.toContain("/form-comparison");
    expect(publicSitemapPaths).not.toContain("/sign-in");
    expect(publicSitemapPaths).not.toContain("/sign-up");
    expect(publicSitemapPaths).toContain("/actions/map");
    expect(publicSitemapPaths).toContain("/explorer");

    for (const prefix of privatePrefixes) {
      expect(
        publicSitemapPaths.some(
          (pathname) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        ),
      ).toBe(false);
    }
  });

  it("marks internal and unfinished routes as private", () => {
    expect(isPrivateAppPath("/form-comparison")).toBe(true);
    expect(isPrivateAppPath("/onboarding")).toBe(true);
    expect(isPrivateAppPath("/reglages")).toBe(true);
    expect(isPrivateAppPath("/actions/new")).toBe(true);
    expect(isPrivateAppPath("/partners/dashboard")).toBe(true);
    expect(isPrivateAppPath("/dashboard")).toBe(false);
    expect(isPrivateAppPath("/actions/map")).toBe(false);
    expect(isPrivateAppPath("/learn")).toBe(false);
  });

  it("only emits public visible section routes for the sitemap", () => {
    const publicSectionRoutes = getPublicSectionSitemapPaths();
    const privateSectionRoutes = getPrivateSectionRoutes();
    const publicVisibleRoutes = [...publicSectionRoutes] as readonly string[];
    const privateRoutes = [...privateSectionRoutes] as readonly string[];

    expect(publicVisibleRoutes.length).toBeGreaterThan(0);
    for (const route of publicVisibleRoutes) {
      expect(route.startsWith("/sections/")).toBe(true);
      expect(isPrivateAppPath(route)).toBe(false);
      expect(privateRoutes).not.toContain(route);
    }

    for (const route of privateRoutes) {
      expect(publicVisibleRoutes).not.toContain(route);
    }
  });
});
