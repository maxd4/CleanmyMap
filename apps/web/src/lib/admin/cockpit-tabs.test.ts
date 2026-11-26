import { describe, expect, it } from "vitest";
import { ADMIN_COCKPIT_TABS, adminCockpitHref, resolveAdminCockpitTab, resolveLegacyAdminAnchor } from "./cockpit-tabs";

describe("administrative cockpit navigation", () => {
  it("accepts explicit views only and keeps advanced reserved to max", () => {
    for (const tab of ADMIN_COCKPIT_TABS) expect(resolveAdminCockpitTab(tab, null, true)).toBe(tab);
    expect(resolveAdminCockpitTab("advanced", null, false)).toBe("summary");
    for (const value of [undefined, "unknown", ["audit", "tools"]]) expect(resolveAdminCockpitTab(value, null, true)).toBe("summary");
  });
  it("preserves the signalements preset and historical workflow anchor", () => {
    expect(resolveAdminCockpitTab(undefined, "signalements", false)).toBe("moderation");
    expect(resolveLegacyAdminAnchor("#workflow-administration", null, null)).toBe("moderation");
    expect(resolveLegacyAdminAnchor("#workflow-administration", "audit", null)).toBeNull();
    expect(resolveLegacyAdminAnchor("#moderation-par-bloc", null, null)).toBeNull();
    expect(adminCockpitHref("audit")).toBe("/admin?tab=audit");
  });
});
