import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from(
    "local-dev.clerk.accounts.dev$",
  ).toString("base64")}`;
  process.env.CLERK_SECRET_KEY = "sk_test_local_dev_secret";
});

import {
  DASHBOARD_ROUTE,
} from "@/lib/accueil-pilotage-routes";
import {
  CLERK_CONTEXT_API_ROUTE_PREFIXES,
  CLERK_CONTEXT_ROUTE_PREFIXES,
  config,
  getSeoHttpRedirectResponse,
  isAnonymousSafeApiRequest,
  isClerkContextOnlyRoute,
  isProtectedAppPage,
  PROTECTED_APP_PAGE_ROUTE_PREFIXES,
  PROXY_MATCHER_PATTERNS,
  SEO_HTTP_REDIRECT_MATCHER_PATTERNS,
} from "./proxy";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import { SEO_HTTP_REDIRECT_SOURCES, SEO_REDIRECT_TARGETS } from "@/lib/seo/indexability";

describe("proxy route context", () => {
  it("keeps key page access semantics explicit", () => {
    expect(isProtectedAppPage("/actions/map")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/map")).toBe(false);

    expect(isProtectedAppPage("/actions/new")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/new")).toBe(true);

    for (const alias of ["/declaration", "/partners/network", "/partners/network/pepite"]) {
      expect(isProtectedAppPage(alias)).toBe(false);
      expect(isClerkContextOnlyRoute(alias)).toBe(false);
    }

    expect(isProtectedAppPage(DASHBOARD_ROUTE)).toBe(true);
    expect(isProtectedAppPage(`${DASHBOARD_ROUTE}/nested`)).toBe(true);
  });

  it("keeps the literal Next matcher synchronized with runtime prefix lists", () => {
    const expectedMatcher = [
      ...SEO_HTTP_REDIRECT_MATCHER_PATTERNS,
      ...PROTECTED_APP_PAGE_ROUTE_PREFIXES.map((prefix) => `${prefix}(.*)`),
      ...CLERK_CONTEXT_ROUTE_PREFIXES.map((prefix) => `${prefix}(.*)`),
      ...CLERK_CONTEXT_API_ROUTE_PREFIXES.map((prefix) => `${prefix}(.*)`),
    ];

    expect(PROXY_MATCHER_PATTERNS).toEqual(expectedMatcher);
    expect(config.matcher).toEqual(expectedMatcher);
  });

  it("serves every SEO alias as a permanent HTTP redirect before rendering", () => {
    for (const source of SEO_HTTP_REDIRECT_SOURCES) {
      const request = new NextRequest(
        `http://localhost${source}?source=legacy&tab=legacy&panel=legacy`,
      );
      const response = getSeoHttpRedirectResponse(request);

      expect(response, source).not.toBeNull();
      expect(response?.status, source).toBe(308);

      const location = new URL(response?.headers.get("location") ?? "http://invalid");
      expect(location.pathname, source).toBe(
        new URL(SEO_REDIRECT_TARGETS[source], "http://localhost").pathname,
      );
      expect(location.searchParams.get("source"), source).toBe("legacy");
    }
  });

  it("gives forced target parameters priority without duplicate keys", () => {
    const partners = getSeoHttpRedirectResponse(
      new NextRequest("http://localhost/partners/network?tab=legacy&tab=dm&source=legacy"),
    );
    const route = getSeoHttpRedirectResponse(
      new NextRequest("http://localhost/sections/route?panel=legacy&source=legacy"),
    );

    expect(new URL(partners?.headers.get("location") ?? "http://invalid").searchParams.getAll("tab"))
      .toEqual(["partners"]);
    expect(new URL(route?.headers.get("location") ?? "http://invalid").searchParams.getAll("panel"))
      .toEqual(["itineraire"]);
  });

  it("keeps context-only page semantics explicit", () => {
    for (const pathname of [
      "/pilotage",
      "/reports/exports",
      "/signalement",
      "/sections/annuaire",
      "/sections/rejoindre-une-action",
      "/sections/rejoindre-un-formulaire",
      "/sections/community",
    ]) {
      expect(isClerkContextOnlyRoute(pathname)).toBe(true);
      expect(isProtectedAppPage(pathname)).toBe(false);
    }

    expect(isClerkContextOnlyRoute("/api/reports/actions.json")).toBe(false);
  });

  it("covers Clerk context and the literal matcher for every soft-gated section without protecting it", () => {
    const softGatedSections = RUBRIQUE_REGISTRY.filter(
      (item) =>
        item.kind === "section" &&
        (item.anonymousPresentation === "blur" ||
          item.anonymousPresentation === "disabled"),
    );

    expect(softGatedSections.length).toBeGreaterThan(0);

    for (const section of softGatedSections) {
      const matcher = `${section.route}(.*)`;

      expect(isClerkContextOnlyRoute(section.route), section.route).toBe(true);
      expect(config.matcher, section.route).toContain(matcher);
      expect(isProtectedAppPage(section.route), section.route).toBe(false);
    }
  });

  it("keeps the public legal report API in the Clerk-context matcher scope", () => {
    const legalReportPrefix = CLERK_CONTEXT_API_ROUTE_PREFIXES.find(
      (prefix) => prefix === "/api/legal-content-reports",
    );
    expect(legalReportPrefix).toBeDefined();
    const expectedMatcher = `${legalReportPrefix}(.*)`;

    expect(PROXY_MATCHER_PATTERNS).toContain(expectedMatcher);
    expect(config.matcher).toContain(expectedMatcher);
  });

  it("skips Clerk for anonymous community event reads but not mutations", () => {
    const getRequest = new NextRequest("http://localhost/api/community/events", {
      method: "GET",
    });
    const postRequest = new NextRequest("http://localhost/api/community/events", {
      method: "POST",
    });

    expect(isAnonymousSafeApiRequest(getRequest)).toBe(true);
    expect(isAnonymousSafeApiRequest(postRequest)).toBe(false);
  });

});
