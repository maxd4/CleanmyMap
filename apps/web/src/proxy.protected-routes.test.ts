import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";
import { config, PROXY_MATCHER_PATTERNS } from "../proxy";

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
      "/actions/history(.*)",
      "/actions/new(.*)",
    ];

    for (const pattern of required) {
      expect(PROXY_MATCHER_PATTERNS).toContain(pattern);
    }

    expect(PROXY_MATCHER_PATTERNS).toEqual(config.matcher);
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sections(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sign-in(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/sign-up(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/reports(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/learn(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/methodologie(.*)");
    expect(PROXY_MATCHER_PATTERNS).not.toContain("/actions/map(.*)");
    expect(PROXY_MATCHER_PATTERNS.every((pattern) => !pattern.startsWith("/api/"))).toBe(true);
  });
});
