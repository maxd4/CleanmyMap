import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

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
});
