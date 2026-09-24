import { describe, expect, it } from "vitest";
import {
  PRIVATE_APP_ROUTE_PREFIXES,
  PUBLIC_APP_SITEMAP_PATHS,
  getPublicSectionSitemapPaths,
  getPrivateSectionRoutes,
  isPrivateAppPath,
  isPublicNoindexPath,
  SEO_REDIRECT_TARGETS,
} from "./indexability";
import {
  DASHBOARD_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";

type SectionDefinition = Extract<
  (typeof RUBRIQUE_REGISTRY)[number],
  { kind: "section" }
>;

describe("indexability helpers", () => {
  it("keeps private and unfinished routes out of the public sitemap list", () => {
    const publicSitemapPaths = [...PUBLIC_APP_SITEMAP_PATHS] as readonly string[];
    const privatePrefixes = [...PRIVATE_APP_ROUTE_PREFIXES] as readonly string[];

    expect(publicSitemapPaths).not.toContain(DASHBOARD_ROUTE);
    expect(publicSitemapPaths).not.toContain(PROFIL_ROUTE);
    expect(publicSitemapPaths).not.toContain("/form-comparison");
    expect(publicSitemapPaths).not.toContain("/sign-in");
    expect(publicSitemapPaths).not.toContain("/sign-up");

    expect(publicSitemapPaths).toContain("/actions/map");
    expect(publicSitemapPaths).toContain("/actions/new");
    expect(publicSitemapPaths).toContain("/signalement");
    expect(publicSitemapPaths).toContain("/contact");
    expect(publicSitemapPaths).toContain("/learn/ecole");
    expect(publicSitemapPaths).not.toContain("/explorer");
    expect(publicSitemapPaths).not.toContain("/en");
    expect(publicSitemapPaths).not.toContain("/conditions-utilisation");

    // Aucun page.tsx canonique /learn n'existe dans l'état audité.
    expect(publicSitemapPaths).not.toContain("/learn");

    for (const prefix of privatePrefixes) {
      expect(
        publicSitemapPaths.some(
          (pathname) =>
            pathname === prefix || pathname.startsWith(`${prefix}/`),
        ),
      ).toBe(false);
    }
  });

  it("marks internal and unfinished routes as private", () => {
    expect(isPrivateAppPath("/form-comparison")).toBe(true);
    expect(isPrivateAppPath("/onboarding")).toBe(true);
    expect(isPrivateAppPath("/reglages")).toBe(true);
    expect(isPrivateAppPath("/actions/new")).toBe(false);
    expect(isPrivateAppPath("/partners/dashboard")).toBe(true);
    expect(isPrivateAppPath(DASHBOARD_ROUTE)).toBe(true);

    expect(isPrivateAppPath("/actions/map")).toBe(false);
    expect(isPrivateAppPath("/learn/ecole")).toBe(false);
    expect(isPublicNoindexPath("/sign-in")).toBe(true);
    expect(isPublicNoindexPath("/docs/seo/README.md")).toBe(true);
  });

  it("keeps legacy aliases explicit and out of the page sitemap contract", () => {
    expect(SEO_REDIRECT_TARGETS["/en"]).toBe("/");
    expect(SEO_REDIRECT_TARGETS["/sections/route"]).toContain("/actions/new");
    expect(SEO_REDIRECT_TARGETS["/sections/weather"]).toContain("/actions/new");
    for (const alias of Object.keys(SEO_REDIRECT_TARGETS)) {
      expect(PUBLIC_APP_SITEMAP_PATHS).not.toContain(alias);
    }
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

    const finalizedSections = RUBRIQUE_REGISTRY.filter(
      (item): item is SectionDefinition =>
        item.kind === "section" &&
        item.availability === "available" &&
        item.implementation === "finalized",
    );
    const expectedPublicSectionIds = [
        "actors",
        "annuaire",
        "climate",
        "community",
        "compost",
        "funding",
        "open-data",
        "recycling",
        "rejoindre-une-action",
      ];
    const expectedPublicRoutes = finalizedSections
      .filter((item) => expectedPublicSectionIds.includes(item.id))
      .map((item) => item.route)
      .sort((a, b) => a.localeCompare(b, "fr"));
    const expectedPrivateRoutes = RUBRIQUE_REGISTRY.filter(
      (item): item is SectionDefinition =>
        item.kind === "section" &&
        (!expectedPublicSectionIds.includes(item.id) ||
          item.availability !== "available" ||
          item.implementation !== "finalized"),
    )
      .map((item) => item.route)
      .sort((a, b) => a.localeCompare(b, "fr"));

    expect(publicVisibleRoutes).toEqual(expectedPublicRoutes);
    expect(privateRoutes).toEqual(expectedPrivateRoutes);
    expect(publicVisibleRoutes).toContain("/sections/community");
    expect(publicVisibleRoutes).toContain("/sections/annuaire");
    expect(privateRoutes).toContain("/sections/feedback");
    expect(privateRoutes).toContain("/sections/route");
    expect(privateRoutes).toContain("/sections/gamification");
  });
});
