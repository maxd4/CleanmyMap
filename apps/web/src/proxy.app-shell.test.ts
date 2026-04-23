import { describe, expect, it } from "vitest";
import { APP_SHELL_ROUTE_PREFIXES, isAppShellRoute } from "./proxy";

describe("proxy app shell routes", () => {
  it("marks the application routes as shell routes", () => {
    const required = [
      "/actions",
      "/admin",
      "/dashboard",
      "/learn",
      "/methodologie",
      "/observatoire",
      "/parcours",
      "/partners",
      "/prints",
      "/profil",
      "/reports",
      "/sections",
      "/signalement",
      "/sponsor-portal",
    ];

    for (const route of required) {
      expect(APP_SHELL_ROUTE_PREFIXES).toContain(route);
      expect(isAppShellRoute(route)).toBe(true);
      expect(isAppShellRoute(`${route}/nested`)).toBe(true);
    }
  });

  it("keeps public routes outside the app shell", () => {
    expect(isAppShellRoute("/")).toBe(false);
    expect(isAppShellRoute("/explorer")).toBe(false);
    expect(isAppShellRoute("/sign-in")).toBe(false);
  });
});
