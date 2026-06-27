import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";
import { PROXY_MATCHER_PATTERNS } from "./proxy";

describe("proxy protected routes", () => {
  it("keeps critical business routes protected", () => {
    const required = [
      `${ADMIN_ROUTE}(.*)`,
      `${DASHBOARD_ROUTE}(.*)`,
      "/actions(.*)",
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

  it("keeps the middleware matcher limited to protected surfaces", () => {
    const required = [
      `${ADMIN_ROUTE}(.*)`,
      `${DASHBOARD_ROUTE}(.*)`,
      `${SPONSOR_PORTAL_ROUTE}(.*)`,
    ];

    for (const pattern of required) {
      expect(PROXY_MATCHER_PATTERNS).toContain(pattern);
    }

    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/actions(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/admin(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/reports(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/users(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/services(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/reports(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/learn(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/methodologie(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/map(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/history(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/new(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/form-comparison(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/prints/report(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/newsletter/subscribe(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/analytics/funnel(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/community/bug-reports(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/community/events(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/community/promotion-requests(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/partners/onboarding-requests(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/api/chat(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/__clerk/(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/(api|trpc)(.*)");
  });
});
