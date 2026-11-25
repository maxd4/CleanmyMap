import { describe, expect, it } from "vitest";
import { DASHBOARD_TABS, dashboardTabHref, resolveDashboardTab, resolveLegacyDashboardAnchor } from "./tabs";

describe("dashboard navigation contract", () => {
  it("accepts exactly the five views and falls back for ambiguous input", () => {
    for (const tab of DASHBOARD_TABS) expect(resolveDashboardTab(tab)).toBe(tab);
    for (const invalid of [undefined, "admin", "", ["today", "account"]]) expect(resolveDashboardTab(invalid)).toBe("today");
  });

  it("provides explicit notification deep links and legacy hash compatibility", () => {
    expect(dashboardTabHref("today")).toBe("/dashboard");
    expect(dashboardTabHref("notifications")).toBe("/dashboard?tab=notifications#notifications");
    expect(resolveLegacyDashboardAnchor("#notifications", null)).toBe("notifications");
    expect(resolveLegacyDashboardAnchor("#parrainage", null)).toBe("engagement");
    expect(resolveLegacyDashboardAnchor("#notifications", "account")).toBeNull();
    expect(resolveLegacyDashboardAnchor("#unrelated", null)).toBeNull();
  });
});
