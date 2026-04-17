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
});
