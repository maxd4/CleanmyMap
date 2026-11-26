import { describe, expect, it } from "vitest";
import { PROFILE_ORDER, getProfileActions } from "@/lib/profiles";
import { getDashboardRoleActions } from "./role-actions";

describe("dashboard shortcuts", () => {
  it("preserves every role's action count and never returns a dashboard self-link", () => {
    for (const role of PROFILE_ORDER) {
      expect(getDashboardRoleActions(role)).toHaveLength(getProfileActions(role).length);
      expect(getDashboardRoleActions(role).every((action) => action.href !== "/dashboard")).toBe(true);
    }
  });

  it("routes requests to notifications and collective metrics without changing the registry", () => {
    expect(getDashboardRoleActions("coordinateur").some((action) => action.href === "/dashboard?tab=notifications#notifications")).toBe(true);
    expect(getDashboardRoleActions("max").some((action) => action.href === "/dashboard?tab=collective")).toBe(true);
    expect(getProfileActions("coordinateur").some((action) => action.href === "/dashboard")).toBe(true);
  });
});
