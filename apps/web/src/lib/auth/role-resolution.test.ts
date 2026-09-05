import { describe, expect, it } from "vitest";
import {
  extractRole,
  isAdminRole,
  isMaxRole,
  parseAdminUserIds,
  parseMaxUserIds,
} from "./role-resolution";

describe("role resolution", () => {
  it("parses configured user ids and ignores empty entries", () => {
    const ids = parseAdminUserIds(" user_1, user_2 ,,user_3 ");

    expect(ids).toEqual(new Set(["user_1", "user_2", "user_3"]));
    expect(parseAdminUserIds(undefined)).toEqual(new Set());
  });

  it("does not promote admin ids to max when the max allowlist is empty", () => {
    expect(parseMaxUserIds("")).toEqual(new Set());
    expect(parseMaxUserIds("max_1")).toEqual(new Set(["max_1"]));
  });

  it("extracts and normalizes Clerk role metadata", () => {
    expect(extractRole({ role: " Admin " })).toBe("admin");
    expect(extractRole({ profile: " Admin " })).toBe("admin");
    expect(extractRole({ role: " Max " })).toBe("max");
    expect(extractRole({ role: 123 })).toBeNull();
    expect(extractRole(undefined)).toBeNull();
  });

  it.each(["max", "imu", "IMU", "super-admin", "super_admin", "superadmin"])(
    "extracts %s as max",
    (alias) => {
      expect(extractRole({ role: alias })).toBe("max");
    },
  );

  it("resolves admin and max roles from public or private metadata", () => {
    expect(isAdminRole({ publicMetadata: { role: "admin" } })).toBe(true);
    expect(isAdminRole({ privateMetadata: { profile: "max" } })).toBe(true);
    expect(isAdminRole({ publicMetadata: { role: "member" } })).toBe(false);
    expect(isMaxRole({ publicMetadata: { role: "super_admin" } })).toBe(true);
    expect(isMaxRole({ privateMetadata: { role: "admin" } })).toBe(false);
  });
});
