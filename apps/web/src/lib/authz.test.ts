import { describe, expect, it } from "vitest";
import { __authz_testables, isAdminRole } from "./authz";

describe("authz helpers", () => {
  it("parses admin user ids from csv", () => {
    const ids = __authz_testables.parseAdminUserIds(
      " user_1, user_2 ,,user_3 ",
    );
    expect(ids.has("user_1")).toBe(true);
    expect(ids.has("user_2")).toBe(true);
    expect(ids.has("user_3")).toBe(true);
    expect(ids.size).toBe(3);
  });

  it("extracts normalized role from metadata", () => {
    expect(__authz_testables.extractRole({ role: " Admin " })).toBe("admin");
    expect(__authz_testables.extractRole({ profile: " Admin " })).toBe("admin");
    expect(__authz_testables.extractRole({ role: " Max " })).toBe("max");
    expect(__authz_testables.extractRole({ role: "super_admin" })).toBe("max");
    expect(__authz_testables.extractRole({ role: 123 })).toBeNull();
    expect(__authz_testables.extractRole(undefined)).toBeNull();
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
