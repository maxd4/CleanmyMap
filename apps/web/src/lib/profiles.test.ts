import { describe, expect, it } from "vitest";
import { getProfileActions, getProfileLabel, normalizeProfileRole, resolveProfile, PROFILE_ORDER, type AppProfile } from "./profiles";
import {
  ADMIN_GODMODE_ROUTE,
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

const EXPECTED_PROFILE_ACTIONS: Record<AppProfile, readonly string[]> = {
  benevole: ["/actions/new", "/sections/community", "/actions/map", "/learn/comprendre"],
  coordinateur: ["/sections/community", DASHBOARD_ROUTE, "/sections/messagerie", "/reports"],
  scientifique: ["/reports", "/sections/open-data", "/methodologie", "/prints/report"],
  entreprise: [SPONSOR_PORTAL_ROUTE, "/sections/community?tab=partners", "/sections/funding", "/reports"],
  elu: [SPONSOR_PORTAL_ROUTE, "/reports", "/actions/map", "/prints/report"],
  admin: [ADMIN_ROUTE, "/reports", ADMIN_GODMODE_ROUTE, DASHBOARD_ROUTE],
  max: [ADMIN_GODMODE_ROUTE, ADMIN_ROUTE, DASHBOARD_ROUTE, "/prints/report"],
};

describe("profile aliases", () => {
  it("keeps IMU as the displayed label for the top profile", () => {
    expect(getProfileLabel("max", "fr")).toBe("IMU");
    expect(getProfileLabel("max", "en")).toBe("IMU");
  });

  it("maps IMU metadata back to the internal top profile", () => {
    expect(normalizeProfileRole("IMU")).toBe("max");
    expect(normalizeProfileRole("super_admin")).toBe("max");
    expect(
      resolveProfile({
        metadataRole: "imu",
        isAdmin: false,
        isMax: false,
      }),
    ).toBe("max");
  });

  it("labels the enterprise profile consistently", () => {
    expect(getProfileLabel("entreprise", "fr")).toBe("Entreprise");
    expect(getProfileLabel("entreprise", "en")).toBe("Business");
  });
});

describe("profile quick access", () => {
  PROFILE_ORDER.forEach((profile) => {
    it(`exposes four distinct actions for ${profile}`, () => {
      const actions = getProfileActions(profile);
      const hrefs = actions.map((action) => action.href);

      expect(actions).toHaveLength(4);
      expect(hrefs).toEqual(EXPECTED_PROFILE_ACTIONS[profile]);
      expect(new Set(hrefs).size).toBe(4);
    });
  });
});
