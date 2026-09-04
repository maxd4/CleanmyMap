import { describe, expect, it } from "vitest";
import {
  getProfileActions,
  getProfileLabel,
  normalizeProfileRole,
  resolveProfile,
  PROFILE_ORDER,
  isAppProfile,
  resolveActiveRole,
  getSwitchableProfiles,
  MAX_ROLE_STORAGE_VALUES,
  type AppProfile,
} from "./profiles";
import { getEffectiveAccessForSessionRole } from "./domain-language";
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

  it.each([
    "max",
    "imu",
    "IMU",
    "super-admin",
    "super_admin",
    "superadmin",
    "owner",
    "godmode",
    "creator",
  ])("normalizes %s to the canonical top profile", (alias) => {
    expect(normalizeProfileRole(alias)).toBe("max");
  });

  it("keeps legacy top-profile values out of the runtime profile union", () => {
    expect(isAppProfile("imu")).toBe(false);
    expect(isAppProfile("super_admin")).toBe(false);
    expect(PROFILE_ORDER).toContain("max");
    expect(MAX_ROLE_STORAGE_VALUES).toContain("max");
    expect(MAX_ROLE_STORAGE_VALUES).toContain("imu");
    expect(
      MAX_ROLE_STORAGE_VALUES.every(
        (storageValue) => normalizeProfileRole(storageValue) === "max",
      ),
    ).toBe(true);
  });

  it("keeps local authority compatible with the elu role", () => {
    expect(normalizeProfileRole("local_authority")).toBe("elu");
    expect(normalizeProfileRole("local_authority")).not.toBe("max");
    expect(MAX_ROLE_STORAGE_VALUES).not.toContain("local_authority");
  });

  it("does not grant IMU from metadata alone", () => {
    expect(
      resolveProfile({
        metadataRole: "imu",
        isAdmin: false,
        isMax: false,
      }),
    ).toBe("benevole");
  });

  it("labels the enterprise profile consistently", () => {
    expect(getProfileLabel("entreprise", "fr")).toBe("Entreprise");
    expect(getProfileLabel("entreprise", "en")).toBe("Business");
  });

  it("uses the canonical French labels for role and profile selectors", () => {
    expect(getProfileLabel("coordinateur", "fr")).toBe("Association");
    expect(getProfileLabel("elu", "fr")).toBe("Élu·e");
    expect(getProfileLabel("admin", "fr")).toBe("Administrateur");
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

describe("active profile separation", () => {
  it("falls back to the granted role when activeRole is absent or invalid", () => {
    expect(
      resolveActiveRole({ metadataActiveRole: null, grantedRole: "admin" }),
    ).toBe("admin");
    expect(
      resolveActiveRole({ metadataActiveRole: "not-a-profile", grantedRole: "max" }),
    ).toBe("max");
    expect(
      resolveActiveRole({ metadataActiveRole: "max", grantedRole: "admin" }),
    ).toBe("admin");
  });

  it("lets max switch persona while preserving the role boundary", () => {
    expect(getSwitchableProfiles("max")).toEqual([
      "benevole",
      "coordinateur",
      "scientifique",
      "entreprise",
      "elu",
      "admin",
      "max",
    ]);
    expect(getSwitchableProfiles("admin")).toEqual([
      "benevole",
      "coordinateur",
      "scientifique",
      "entreprise",
      "elu",
      "admin",
    ]);
  });

  it("exposes only open roles to standard accounts", () => {
    expect(getSwitchableProfiles("benevole")).toEqual([
      "benevole",
      "coordinateur",
      "scientifique",
      "entreprise",
    ]);
    expect(getSwitchableProfiles("elu")).toContain("elu");
    expect(getSwitchableProfiles("elu")).not.toContain("admin");
    expect(getSwitchableProfiles("benevole")).not.toContain("max");
  });

  it.each([
    ["benevole", "elu"],
    ["benevole", "admin"],
    ["benevole", "max"],
    ["elu", "admin"],
    ["elu", "max"],
    ["admin", "max"],
  ] as const)("rejects %s -> %s privilege escalation", (grantedRole, targetRole) => {
    expect(
      resolveActiveRole({ metadataActiveRole: targetRole, grantedRole }),
    ).toBe(grantedRole);
  });

  it.each([
    ["elu", "scientifique"],
    ["admin", "benevole"],
    ["max", "admin"],
  ] as const)("allows %s to activate %s and later reactivate the obtained role", (grantedRole, targetRole) => {
    expect(
      resolveActiveRole({ metadataActiveRole: targetRole, grantedRole }),
    ).toBe(targetRole);
    expect(
      resolveActiveRole({ metadataActiveRole: grantedRole, grantedRole }),
    ).toBe(grantedRole);
  });

  it.each([
    ["benevole", false, false],
    ["elu", false, true],
    ["admin", true, true],
    ["max", true, true],
  ] as const)(
    "derives effective capabilities from ACTIVE_ROLE=%s",
    (activeRole, canAccessAdminPage, canModerate) => {
      const access = getEffectiveAccessForSessionRole(activeRole);
      expect(access.canAccessAdminPage).toBe(canAccessAdminPage);
      expect(access.canModerate).toBe(canModerate);
    },
  );

  it("removes privileged capabilities while an obtained admin or elu account is active as open role", () => {
    const adminAsVolunteer = getEffectiveAccessForSessionRole("benevole");
    const electedAsScientist = getEffectiveAccessForSessionRole("scientifique");

    expect(adminAsVolunteer.canAccessAdminPage).toBe(false);
    expect(adminAsVolunteer.canModerate).toBe(false);
    expect(electedAsScientist.canModerate).toBe(false);
    expect(getEffectiveAccessForSessionRole("admin").canAccessAdminPage).toBe(true);
    expect(getEffectiveAccessForSessionRole("elu").canModerate).toBe(true);
  });
});
