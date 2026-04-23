import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";

describe("proxy protected routes", () => {
  it("keeps critical business routes protected", () => {
    const required = [
      "/admin(.*)",
      "/dashboard(.*)",
      "/actions(.*)",
      "/prints(.*)",
      "/sponsor-portal(.*)",
      "/api/community(.*)",
      "/api/account(.*)",
      "/api/pilotage(.*)",
      "/api/recycling(.*)",
      "/api/route(.*)",
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
