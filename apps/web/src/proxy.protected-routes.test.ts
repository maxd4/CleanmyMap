import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const clerkContextRequestMock = vi.hoisted(() => vi.fn());
const clerkMiddlewareFailure = vi.hoisted(() => ({ enabled: false }));
const devAuthBypassEnabledMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@clerk/nextjs/server", () => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("local-dev.clerk.accounts.dev$").toString("base64")}`;
  process.env.CLERK_SECRET_KEY = "sk_test_local_dev_secret";
  return {
    clerkMiddleware: (handler: (auth: unknown, req: NextRequest, evt: unknown) => unknown) =>
      async (req: NextRequest, evt: unknown) => {
        if (clerkMiddlewareFailure.enabled) {
          throw new Error("Clerk unavailable");
        }
        clerkContextRequestMock(req.nextUrl.pathname, req.headers.get("authorization"));
        return handler({ protect: vi.fn() }, req, evt);
      },
  };
});

vi.mock("@/lib/auth/dev-auth", () => ({
  isDevAuthBypassEnabled: devAuthBypassEnabledMock,
}));

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
  proxy,
  PROTECTED_APP_PAGE_ROUTE_PREFIXES,
  PROXY_MATCHER_PATTERNS,
  SEO_HTTP_REDIRECT_MATCHER_PATTERNS,
} from "./proxy";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import { SEO_HTTP_REDIRECT_SOURCES, SEO_REDIRECT_TARGETS } from "@/lib/seo/indexability";

describe("proxy route context", () => {
  beforeEach(() => {
    clerkMiddlewareFailure.enabled = false;
    clerkContextRequestMock.mockClear();
    devAuthBypassEnabledMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps key page access semantics explicit", () => {
    expect(isProtectedAppPage("/actions/map")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/map")).toBe(false);

    expect(isProtectedAppPage("/actions/new")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/new")).toBe(true);

    for (const alias of ["/partners/network", "/partners/network/pepite"]) {
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
    const weather = getSeoHttpRedirectResponse(
      new NextRequest("http://localhost/sections/weather?panel=legacy&source=legacy"),
    );
    const directMessage = getSeoHttpRedirectResponse(
      new NextRequest("http://localhost/sections/dm?tab=legacy&source=legacy"),
    );

    expect(new URL(partners?.headers.get("location") ?? "http://invalid").searchParams.getAll("tab"))
      .toEqual(["partners"]);
    expect(new URL(route?.headers.get("location") ?? "http://invalid").searchParams.getAll("panel"))
      .toEqual(["itineraire"]);
    expect(new URL(weather?.headers.get("location") ?? "http://invalid").searchParams.getAll("panel"))
      .toEqual(["meteo"]);
    expect(new URL(directMessage?.headers.get("location") ?? "http://invalid").searchParams.getAll("tab"))
      .toEqual(["dm"]);
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

  it("covers SPOGOMI server auth context without protecting public or team-session endpoints", () => {
    expect(CLERK_CONTEXT_API_ROUTE_PREFIXES).toContain("/api/spogomi");
    expect(config.matcher).toContain("/api/spogomi(.*)");
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/spogomi/public/events/paris"))).toBe(true);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/spogomi/team-access"))).toBe(true);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/spogomi/team-form"))).toBe(true);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/spogomi/events", { method: "POST" }))).toBe(false);
  });

  it("sends a bearer-authenticated mission request through Clerk context", async () => {
    clerkContextRequestMock.mockClear();

    const response = await proxy(
      new NextRequest("http://localhost/api/missions", {
        method: "POST",
        headers: { authorization: "Bearer clerk-session-token" },
      }),
      {} as never,
    );

    if (!response) throw new Error("Clerk context response is missing");
    expect(response.status).toBe(200);
    expect(clerkContextRequestMock).toHaveBeenCalledWith(
      "/api/missions",
      "Bearer clerk-session-token",
    );
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

  it("allows only the public shared-report GET route through without Clerk", () => {
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/shared/" + "a".repeat(43)))).toBe(true);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/shared/invalid-token"))).toBe(true);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/shared/a/b"))).toBe(false);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/shared/" + "a".repeat(43), { method: "POST" }))).toBe(false);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/generations/11111111-1111-4111-8111-111111111111"))).toBe(false);
  });

  it("allows only the three public report-library GET routes through without Clerk", () => {
    for (const pathname of [
      "/api/reports/library",
      "/api/reports/library/publication-1",
      "/api/reports/library/publication-1/pdf",
    ]) {
      expect(isAnonymousSafeApiRequest(new NextRequest(`http://localhost${pathname}`)), pathname).toBe(true);
    }

    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/library/publication-1/pdf/extra"))).toBe(false);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/library", { method: "POST" }))).toBe(false);
    expect(isAnonymousSafeApiRequest(new NextRequest("http://localhost/api/reports/generations/11111111-1111-4111-8111-111111111111"))).toBe(false);
  });

  it("does not make a valid shared bearer depend on Clerk or an expired cookie", async () => {
    clerkMiddlewareFailure.enabled = true;

    const response = await proxy(
      new NextRequest("http://localhost/api/reports/shared/" + "a".repeat(43), {
        headers: { cookie: "__session=expired" },
      }),
      {} as never,
    );

    if (!response) throw new Error("shared report proxy response is missing");
    expect(response.status).toBe(200);
    expect(clerkContextRequestMock).not.toHaveBeenCalled();
  });

  it("does not make public library reads depend on Clerk or an expired cookie", async () => {
    clerkMiddlewareFailure.enabled = true;

    for (const pathname of [
      "/api/reports/library",
      "/api/reports/library/publication-1",
      "/api/reports/library/publication-1/pdf",
    ]) {
      const response = await proxy(
        new NextRequest(`http://localhost${pathname}`, {
          headers: { cookie: "__session=expired" },
        }),
        {} as never,
      );

      expect(response?.status, pathname).toBe(200);
    }

    expect(clerkContextRequestMock).not.toHaveBeenCalled();
  });

  it("applies SEO redirects before the Clerk middleware", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/en?source=legacy"),
      {} as never,
    );

    if (!response) throw new Error("SEO proxy response is missing");

    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location") ?? "http://invalid").pathname).toBe("/");
  });

  it("keeps anonymous public map reads on the normal Next response path", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/api/actions/map"),
      {} as never,
    );

    if (!response) throw new Error("public map proxy response is missing");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("fails closed for protected requests when Clerk is unavailable", async () => {
    clerkMiddlewareFailure.enabled = true;

    const apiResponse = await proxy(
      new NextRequest("http://localhost/api/admin/roles", {
        headers: { cookie: "__session=expired" },
      }),
      {} as never,
    );
    expect(apiResponse?.status).toBe(401);
    expect(await apiResponse?.json()).toMatchObject({ kind: "permission" });

    const pageResponse = await proxy(
      new NextRequest("http://localhost/dashboard", {
        headers: { cookie: "__session=expired" },
      }),
      {} as never,
    );
    expect(pageResponse?.status).toBe(307);
    expect(new URL(pageResponse?.headers.get("location") ?? "http://invalid").pathname).toBe("/sign-in");
  });

  it("keeps context-only and anonymous-safe requests available during a Clerk outage", async () => {
    clerkMiddlewareFailure.enabled = true;

    const contextResponse = await proxy(
      new NextRequest("http://localhost/reports", {
        headers: { cookie: "__session=expired" },
      }),
      {} as never,
    );
    expect(contextResponse?.status).toBe(200);
    expect(contextResponse?.headers.get("location")).toBeNull();

    const publicApiResponse = await proxy(
      new NextRequest("http://localhost/api/community/events", {
        headers: { cookie: "__session=expired" },
      }),
      {} as never,
    );
    expect(publicApiResponse?.status).toBe(200);
    expect(publicApiResponse?.headers.get("x-robots-tag")).toBeNull();
  });

  it("keeps the explicitly enabled local bypass on the Next path during a Clerk outage", async () => {
    devAuthBypassEnabledMock.mockReturnValue(true);
    clerkMiddlewareFailure.enabled = true;

    const response = await proxy(
      new NextRequest("http://localhost/dashboard"),
      {} as never,
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("location")).toBeNull();
  });

});
