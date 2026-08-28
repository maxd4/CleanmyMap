import { describe, expect, it } from "vitest";
import {
  isProtectedRoutePath,
  PROTECTED_ROUTE_PATTERNS,
} from "@/lib/auth/protected-routes";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";
import {
  CLERK_CONTEXT_API_ROUTE_PREFIXES,
  CLERK_CONTEXT_ROUTE_PREFIXES,
  config,
  isClerkContextOnlyRoute,
  PROTECTED_APP_PAGE_ROUTE_PREFIXES,
  PROXY_MATCHER_PATTERNS,
} from "./proxy";

describe("proxy protected routes", () => {
  it("keeps critical business routes protected", () => {
    const required = [
      `${ADMIN_ROUTE}(.*)`,
      `${DASHBOARD_ROUTE}(.*)`,
      "/actions(.*)",
      "/missions(.*)",
      "/prints(.*)",
      `${SPONSOR_PORTAL_ROUTE}(.*)`,
      "/api/community(.*)",
      "/api/analytics(.*)",
      "/api/account(.*)",
      "/api/pilotage(.*)",
      "/api/recycling(.*)",
      "/api/route(.*)",
      "/api/send(.*)",
      "/api/services(.*)",
      "/api/spots(.*)",
      "/sections(.*)",
      "/api/admin(.*)",
      "/api/actions(.*)",
      "/api/reports(.*)",
    ];

    for (const pattern of required) {
      expect(PROTECTED_ROUTE_PATTERNS).toContain(pattern);
    }
  });

  it("keeps the middleware matcher limited to protected and context surfaces", () => {
    const required = [
      `${ADMIN_ROUTE}(.*)`,
      `${DASHBOARD_ROUTE}(.*)`,
      "/missions(.*)",
      `${SPONSOR_PORTAL_ROUTE}(.*)`,
      "/actions/history(.*)",
      "/actions/new(.*)",
      "/pilotage(.*)",
      "/reports(.*)",
      ...CLERK_CONTEXT_API_ROUTE_PREFIXES.map((prefix) => `${prefix}(.*)`),
    ];

    for (const pattern of required) {
      expect(PROXY_MATCHER_PATTERNS).toContain(pattern);
    }

    expect(PROXY_MATCHER_PATTERNS).toEqual(config.matcher);
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sections(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sign-in(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sign-up(.*)");
    expect(PROTECTED_APP_PAGE_ROUTE_PREFIXES).not.toContain("/pilotage");
    expect(PROTECTED_APP_PAGE_ROUTE_PREFIXES).not.toContain("/reports");
    expect(CLERK_CONTEXT_ROUTE_PREFIXES).toEqual(["/pilotage", "/reports"]);
    expect(isClerkContextOnlyRoute("/pilotage")).toBe(true);
    expect(isClerkContextOnlyRoute("/reports/exports")).toBe(true);
    expect(isClerkContextOnlyRoute("/api/reports/actions.json")).toBe(false);
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/learn(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/methodologie(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/map(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/health(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/manifest(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/uptime(.*)");
  });

  it("provides Clerk context to the public legal report route without protecting it", () => {
    expect(CLERK_CONTEXT_API_ROUTE_PREFIXES).toContain("/api/legal-content-reports");
    expect(PROXY_MATCHER_PATTERNS).toContain("/api/legal-content-reports(.*)");
    expect(config.matcher).toContain("/api/legal-content-reports(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).not.toContain("/api/legal-content-reports(.*)");
    expect(isProtectedRoutePath("/api/legal-content-reports")).toBe(false);
  });
});
