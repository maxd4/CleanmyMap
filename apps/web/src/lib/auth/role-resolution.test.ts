import { describe, expect, it } from "vitest";
import {
  extractRole,
  isCanonicalImuOwner,
  isAdminRole,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "./role-resolution";

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

  it("resolves admin metadata without treating max metadata as IMU", () => {
    expect(isAdminRole({ publicMetadata: { role: "admin" } })).toBe(true);
    expect(isAdminRole({ privateMetadata: { profile: "max" } })).toBe(false);
    expect(isAdminRole({ publicMetadata: { role: "member" } })).toBe(false);
    expect(isAdminRole({ privateMetadata: { role: "admin" } })).toBe(true);
  });

  it.each([
    ["owner-prod", "owner.prod@example.test"],
    ["owner-dev", "owner.dev@example.test"],
  ])("requires the exact %s owner id and verified primary email for IMU", (ownerId, ownerEmail) => {
    const owner = {
      id: ownerId,
      primaryEmailAddress: {
        emailAddress: ownerEmail,
        verification: { status: "verified" },
      },
      publicMetadata: { role: "max" },
      privateMetadata: {},
    };

    expect(
      resolveClerkRole({
        user: owner,
        ownerUserId: ownerId,
        ownerEmail,
      }),
    ).toBe("max");
    expect(
      resolveClerkRole({
        user: {
          ...owner,
          id: "secondary",
          publicMetadata: {},
          privateMetadata: {},
        },
        ownerUserId: ownerId,
        ownerEmail,
      }),
    ).toBe("benevole");
    expect(
      resolveClerkRole({
        user: owner,
        ownerUserId: ownerId,
        ownerEmail: "other@example.test",
      }),
    ).toBe("benevole");
  });

  it("fails closed when Clerk returns no verified owner email", () => {
    expect(
      isCanonicalImuOwner({
        userId: "owner",
        ownerUserId: "owner",
        ownerEmail: "owner@example.test",
        primaryEmailAddress: {
          emailAddress: "owner@example.test",
          verification: { status: "unverified" },
        },
      }),
    ).toBe(false);
  });

  it("does not let an admin allowlist grant a role", () => {
    const user = {
      id: "secondary",
      primaryEmailAddress: null,
      publicMetadata: {},
      privateMetadata: {},
    };

    expect(
      resolveClerkRole({
        user,
        ownerUserId: "owner",
        ownerEmail: "owner@example.test",
      }),
    ).toBe("benevole");
  });
});
