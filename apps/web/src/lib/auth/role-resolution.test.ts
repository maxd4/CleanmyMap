import { describe, expect, it } from "vitest";
import {
  extractRole,
  isCanonicalImuOwner,
  isAdminRole,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
  type ClerkUserForRole,
} from "./role-resolution";

function user(overrides: Partial<ClerkUserForRole> = {}): ClerkUserForRole {
  return {
    id: "user_1",
    primaryEmailAddress: {
      emailAddress: "user-at-example",
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

  it("resolves admin metadata without treating max metadata as IMU", () => {
    expect(isAdminRole({ publicMetadata: { role: "admin" } })).toBe(true);
    expect(isAdminRole({ privateMetadata: { profile: "max" } })).toBe(false);
    expect(isAdminRole({ publicMetadata: { role: "member" } })).toBe(false);
    expect(isAdminRole({ privateMetadata: { role: "admin" } })).toBe(true);
  });

  it("grants max only to the exact owner id and verified primary email", () => {
    expect(
      resolveClerkRole({
        user: user({
          id: "owner-prod",
          primaryEmailAddress: {
            emailAddress: "owner.prod-at-example",
            verification: { status: "verified" },
          },
          publicMetadata: { role: "max" },
        }),
        ownerUserId: "owner-prod",
        ownerEmail: "owner.prod-at-example",
      }),
    ).toBe("max");
  });

  it.each([
    ["wrong id", user({ id: "secondary" }), "owner-prod", "owner.prod-at-example"],
    [
      "wrong email",
      user({
        id: "owner-prod",
        primaryEmailAddress: {
          emailAddress: "other-at-example",
          verification: { status: "verified" },
        },
      }),
      "owner-prod",
      "owner.prod-at-example",
    ],
    [
      "unverified email",
      user({
        id: "owner-prod",
        primaryEmailAddress: {
          emailAddress: "owner.prod-at-example",
          verification: { status: "unverified" },
        },
      }),
      "owner-prod",
      "owner.prod-at-example",
    ],
  ])("does not grant max for %s", (_label, candidate, ownerUserId, ownerEmail) => {
    expect(
      resolveClerkRole({
        user: {
          ...candidate,
          publicMetadata: { role: "max" },
        },
        ownerUserId,
        ownerEmail,
      }),
    ).toBe("benevole");
  });

  it("fails closed when Clerk returns no verified owner email", () => {
    expect(
      isCanonicalImuOwner({
        userId: "owner",
        ownerUserId: "owner",
        ownerEmail: "owner-at-example",
        primaryEmailAddress: {
          emailAddress: "owner-at-example",
          verification: { status: "unverified" },
        },
      }),
    ).toBe(false);
  });

  it("does not promote a non-owner from max metadata", () => {
    expect(
      resolveClerkRole({
        user: user({
          id: "secondary",
          publicMetadata: { role: "max" },
        }),
        ownerUserId: "owner",
        ownerEmail: "owner-at-example",
      }),
    ).toBe("benevole");
  });

  it("keeps canonical admin metadata as the audited admin projection", () => {
    expect(
      resolveClerkRole({
        user: user({ publicMetadata: { role: "admin" } }),
        ownerUserId: "owner",
        ownerEmail: "owner-at-example",
      }),
    ).toBe("admin");
  });
});
