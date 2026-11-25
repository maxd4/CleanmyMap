import { describe, expect, it } from "vitest";
import { PROFILE_DETAIL_TABS, resolveProfileDetailTab, profileDetailTabHref } from "./profile-tabs";
describe("profile detail navigation", () => {
  it("uses the active profile and valid view only", () => {
    for (const tab of PROFILE_DETAIL_TABS) expect(resolveProfileDetailTab(tab)).toBe(tab);
    expect(resolveProfileDetailTab(["account"])).toBe("summary");
    expect(resolveProfileDetailTab("unknown")).toBe("summary");
    expect(profileDetailTabHref("elu","referrals")).toBe("/profil/elu?tab=referrals#parrainage");
  });
});
