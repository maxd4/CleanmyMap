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
  isAnonymousSafeApiRequest,
  isClerkContextOnlyRoute,
  isProtectedAppPage,
  PROTECTED_APP_PAGE_ROUTE_PREFIXES,
  PROXY_MATCHER_PATTERNS,
} from "./proxy";

describe("proxy route context", () => {
  it("keeps key page access semantics explicit", () => {
    expect(isProtectedAppPage("/actions/map")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/map")).toBe(false);

    expect(isProtectedAppPage("/actions/new")).toBe(false);
    expect(isClerkContextOnlyRoute("/actions/new")).toBe(true);

    expect(isProtectedAppPage(DASHBOARD_ROUTE)).toBe(true);
    expect(isProtectedAppPage(`${DASHBOARD_ROUTE}/nested`)).toBe(true);
  });

  it("keeps the literal Next matcher synchronized with runtime prefix lists", () => {
    const expectedMatcher = [
      ...PROTECTED_APP_PAGE_ROUTE_PREFIXES,
      ...CLERK_CONTEXT_ROUTE_PREFIXES,
      ...CLERK_CONTEXT_API_ROUTE_PREFIXES,
    ].map((prefix) => `${prefix}(.*)`);

    expect(PROXY_MATCHER_PATTERNS).toEqual(expectedMatcher);
    expect(config.matcher).toEqual(expectedMatcher);
  });

  it("keeps context-only page semantics explicit", () => {
    for (const pathname of [
      "/pilotage",
      "/reports/exports",
      "/signalement",
      "/partners/network",
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
