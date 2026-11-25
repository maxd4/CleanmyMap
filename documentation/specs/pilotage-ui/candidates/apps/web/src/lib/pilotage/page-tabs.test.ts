import { describe, expect, it } from "vitest";
import { PILOTAGE_PAGE_TABS, pilotagePageTabHref, resolvePilotagePageTab, resolveLegacyPilotageAnchor } from "./page-tabs";
describe("scoped pilotage navigation", () => {
  it("accepts only supported views and keeps explicit operations compatible", () => {
    for (const tab of PILOTAGE_PAGE_TABS) expect(resolvePilotagePageTab(tab, undefined)).toBe(tab);
    expect(resolvePilotagePageTab(undefined, "1")).toBe("operations");
    expect(resolvePilotagePageTab(["summary", "operations"], undefined)).toBe("summary");
    expect(resolvePilotagePageTab("unknown", undefined)).toBe("summary");
    expect(pilotagePageTabHref("operations")).toBe("/pilotage?operations=1");
  });
  it("routes institutional anchors to tools", () => {
    expect(resolveLegacyPilotageAnchor("#decideurs", null, null)).toBe("tools");
    expect(resolveLegacyPilotageAnchor("#gouvernance", null, null)).toBe("tools");
    expect(resolveLegacyPilotageAnchor("#gouvernance", "analysis", null)).toBeNull();
  });
});
