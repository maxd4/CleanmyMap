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
  isAnonymousSafeApiRequest,
  isClerkContextOnlyRoute,
  PROTECTED_APP_PAGE_ROUTE_PREFIXES,
  PROXY_MATCHER_PATTERNS,
} from "./proxy";

describe("proxy protected routes", () => {
  it("keeps critical business routes protected", () => {
    const required = [
      `${ADMIN_ROUTE}(.*)`,
      `${DASHBOARD_ROUTE}(.*)`,
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
      "/api/signalements(.*)",
      "/api/spots(.*)",
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
    expect(CLERK_CONTEXT_ROUTE_PREFIXES).toEqual([
      "/pilotage",
      "/reports",
      "/actions/new",
      "/signalement",
      "/partners/network",
      "/sections/annuaire",
      "/sections/rejoindre-un-formulaire",
      "/sections/community",
    ]);
    expect(isClerkContextOnlyRoute("/pilotage")).toBe(true);
    expect(isClerkContextOnlyRoute("/reports/exports")).toBe(true);
    expect(isClerkContextOnlyRoute("/sections/community")).toBe(true);
    expect(isClerkContextOnlyRoute("/sections/community?tab=partners")).toBe(false);
    expect(isClerkContextOnlyRoute("/api/reports/actions.json")).toBe(false);
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/learn(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/methodologie(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/map(.*)");
    expect(PROXY_MATCHER_PATTERNS).toContain("/actions/new(.*)");
    expect(PROXY_MATCHER_PATTERNS).toContain("/signalement(.*)");
    expect(PROXY_MATCHER_PATTERNS).toContain("/partners/network(.*)");
    expect(PROXY_MATCHER_PATTERNS).toContain("/sections/annuaire(.*)");
    expect(PROXY_MATCHER_PATTERNS).toContain("/sections/rejoindre-un-formulaire(.*)");
    expect(PROTECTED_APP_PAGE_ROUTE_PREFIXES).not.toContain("/actions/new");
    expect(PROTECTED_APP_PAGE_ROUTE_PREFIXES).not.toContain("/signalement");
    expect(PROTECTED_APP_PAGE_ROUTE_PREFIXES).not.toContain("/partners/network");
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
