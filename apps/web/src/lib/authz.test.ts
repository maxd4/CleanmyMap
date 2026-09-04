import { describe, expect, it, vi } from "vitest";
import { __authz_testables, isAdminRole } from "./authz";
import { resolveIdentityActiveProfile } from "./authz-identity";

describe("authz helpers", () => {
  it.each([
    ["max", "benevole", "benevole"],
    ["admin", "scientifique", "scientifique"],
    ["admin", "max", "admin"],
    ["admin", undefined, "admin"],
    ["max", "invalid-profile", "max"],
  ] as const)(
    "resolves activeProfile independently from role (%s, %s)",
    (role, activeProfile, expected) => {
      expect(
        resolveIdentityActiveProfile(
          {
            publicMetadata: activeProfile === undefined ? {} : { activeProfile },
            privateMetadata: {},
          } as never,
          role,
        ),
      ).toBe(expected);
    },
  );

  it("falls back to the real role when the public activeProfile is invalid", () => {
    expect(
      resolveIdentityActiveProfile(
        {
          publicMetadata: { activeProfile: "not-a-profile" },
          privateMetadata: { activeProfile: "scientifique" },
        } as never,
        "admin",
      ),
    ).toBe("admin");
  });
  it("accepts admin role from public metadata", () => {
    expect(
      isAdminRole({ publicMetadata: { role: "admin" }, privateMetadata: {} }),
    ).toBe(true);
  });

  it("accepts admin role from private metadata", () => {
    expect(
      isAdminRole({ publicMetadata: {}, privateMetadata: { role: "admin" } }),
    ).toBe(true);
  });

  it("accepts admin role from profile metadata fallback", () => {
    expect(
      isAdminRole({
        publicMetadata: { profile: "admin" },
        privateMetadata: {},
      }),
    ).toBe(true);
  });

  it("accepts max role as admin-like", () => {
    expect(
      isAdminRole({
        publicMetadata: { role: "max" },
        privateMetadata: {},
      }),
    ).toBe(true);
  });

  it("accepts super admin aliases as max", () => {
    expect(
      isAdminRole({
        publicMetadata: { role: "super_admin" },
        privateMetadata: {},
      }),
    ).toBe(true);
  });

  it("rewrites legacy IMU metadata to canonical max storage", async () => {
    const updateUser = vi.fn().mockResolvedValue({ id: "user-1" });

    await __authz_testables.normalizeLegacyOwnerMetadata(
      { users: { updateUser } } as never,
      {
        id: "user-1",
        publicMetadata: { role: "super_admin", badge: "pioneer" },
        privateMetadata: { profile: "IMU" },
      } as never,
    );

    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: {
        role: "max",
        profile: "max",
        badge: "pioneer",
      },
      privateMetadata: { profile: "max", role: "max" },
    });
  });

  it("rejects non admin role", () => {
    expect(
      isAdminRole({
        publicMetadata: { role: "member" },
        privateMetadata: { role: "viewer" },
      }),
    ).toBe(false);
  });

  it("extracts badge ids from metadata arrays only", () => {
    expect(
      __authz_testables.extractBadgeIds({ badges: ["pioneer", "mentor"] }),
    ).toEqual(["pioneer", "mentor"]);
    expect(__authz_testables.extractBadgeIds({ badges: "pioneer" })).toEqual(
      [],
    );
  });

  it("maps badge ids to display badges with fallback", () => {
    const badges = __authz_testables.mapBadgeIdsToBadges([
      "admin",
      "custom_badge",
    ]);
    expect(badges.some((badge) => badge.id === "admin")).toBe(true);
    expect(badges.some((badge) => badge.id === "custom_badge")).toBe(true);
  });

  it("builds actor options from first name, username and user id", () => {
    const options = __authz_testables.buildActorNameOptions(
      "Max",
      "max.clean",
      "user_123",
    );
    expect(options).toEqual(["Max", "max.clean", "user_123"]);
  });

  it("resolves actor name from clerk options", () => {
    const selected = __authz_testables.resolveActorNameFromClerk(
      ["Max", "max.clean", "user_123"],
      "max.clean",
    );
    const fallback = __authz_testables.resolveActorNameFromClerk(
      ["Max", "max.clean", "user_123"],
      "unknown",
    );
    expect(selected).toBe("max.clean");
    expect(fallback).toBe("Max");
  });

  it("normalizes the account display name mode", () => {
    expect(__authz_testables.normalizeDisplayNameMode("pseudo")).toBe("pseudo");
    expect(__authz_testables.normalizeDisplayNameMode("full_name")).toBe("full_name");
    expect(__authz_testables.normalizeDisplayNameMode("unknown")).toBe("full_name");
  });

  it("resolves display names from the selected mode", () => {
    expect(
      __authz_testables.resolveAccountDisplayName({
        firstName: "Ada",
        lastName: "Admin",
        username: "ada_admin",
        userId: "user_1",
        mode: "full_name",
      }),
    ).toBe("Ada Admin");
    expect(
      __authz_testables.resolveAccountDisplayName({
        firstName: "Ada",
        lastName: "Admin",
        username: "ada_admin",
        userId: "user_1",
        mode: "pseudo",
      }),
    ).toBe("ada_admin");
    expect(
      __authz_testables.resolveAccountDisplayName({
        firstName: "",
        lastName: "",
        username: "",
        userId: "user_1",
        mode: "pseudo",
      }),
    ).toBe("user_1");
  });
});
