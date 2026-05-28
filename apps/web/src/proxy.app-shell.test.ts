import { describe, expect, it } from "vitest";
import { APP_SHELL_ROUTE_PREFIXES, isAppShellRoute } from "./proxy";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  EXPLORER_ROUTE,
  PARCOURS_ROUTE,
  PROFIL_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

describe("proxy app shell routes", () => {
  it("marks the application routes as shell routes", () => {
    const required = [
      "/actions",
      ADMIN_ROUTE,
      DASHBOARD_ROUTE,
      EXPLORER_ROUTE,
      "/learn",
      "/methodologie",
      "/observatoire",
      PARCOURS_ROUTE,
      "/partners",
      "/prints",
      PROFIL_ROUTE,
      "/reports",
      "/sections",
      "/signalement",
      SPONSOR_PORTAL_ROUTE,
    ];

    for (const route of required) {
      expect(APP_SHELL_ROUTE_PREFIXES).toContain(route);
      expect(isAppShellRoute(route)).toBe(true);
      expect(isAppShellRoute(`${route}/nested`)).toBe(true);
    }
  });

  it("keeps public routes outside the app shell", () => {
    expect(isAppShellRoute("/")).toBe(false);
    expect(isAppShellRoute("/sign-in")).toBe(false);
  });
});
