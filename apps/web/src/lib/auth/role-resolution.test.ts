import { describe, expect, it } from "vitest";
import {
  extractRole,
  isAdminRole,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "./role-resolution";

const emptyIds = new Set<string>();

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    primaryEmailAddress: {
      emailAddress: "user@example.test",
      verification: { status: "verified" },
    },
    publicMetadata: {},
    privateMetadata: {},
    ...overrides,
  };
}

describe("role resolution", () => {
  it("parses configured user ids and ignores empty entries", () => {
    const ids = parseAdminUserIds(" user_1, user_2 ,,user_3 ");

    expect(ids).toEqual(new Set(["user_1", "user_2", "user_3"]));
    expect(parseAdminUserIds(undefined)).toEqual(new Set());
  });

  it("keeps max ids independent from admin ids", () => {
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

  it("resolves admin metadata without treating max metadata as admin", () => {
    expect(isAdminRole({ publicMetadata: { role: "admin" } })).toBe(true);
    expect(isAdminRole({ privateMetadata: { profile: "max" } })).toBe(false);
    expect(isAdminRole({ publicMetadata: { role: "member" } })).toBe(false);
    expect(isAdminRole({ privateMetadata: { role: "admin" } })).toBe(true);
  });

  it("does not grant a privileged role from a privileged email alone", () => {
    expect(
      resolveClerkRole({
        user: user({
          primaryEmailAddress: { emailAddress: "creator@cleanmymap.fr" },
          secondaryEmailAddresses: [{ emailAddress: "owner@cleanmymap.fr" }],
        }),
        adminUserIds: emptyIds,
        maxUserIds: emptyIds,
      }),
    ).toBe("benevole");
  });

  it("resolves max from the max user id regardless of email", () => {
    expect(
      resolveClerkRole({
        user: user({ id: "max_user" }),
        adminUserIds: emptyIds,
        maxUserIds: new Set(["max_user"]),
      }),
    ).toBe("max");
  });

  it("resolves admin from the admin user id regardless of email", () => {
    expect(
      resolveClerkRole({
        user: user({ id: "admin_user" }),
        adminUserIds: new Set(["admin_user"]),
        maxUserIds: emptyIds,
      }),
    ).toBe("admin");
  });

  it("keeps the role unchanged when the email changes", () => {
    const adminUserIds = new Set(["admin_user"]);
    const maxUserIds = emptyIds;
    const before = resolveClerkRole({
      user: user({ id: "admin_user", primaryEmailAddress: { emailAddress: "old@example.test" } }),
      adminUserIds,
      maxUserIds,
    });
    const after = resolveClerkRole({
      user: user({ id: "admin_user", primaryEmailAddress: { emailAddress: "new@example.test" } }),
      adminUserIds,
      maxUserIds,
    });

    expect(before).toBe("admin");
    expect(after).toBe(before);
  });

  it("resolves max from canonical metadata", () => {
    expect(
      resolveClerkRole({
        user: user({ publicMetadata: { role: "max" } }),
        adminUserIds: emptyIds,
        maxUserIds: emptyIds,
      }),
    ).toBe("max");
  });
});
