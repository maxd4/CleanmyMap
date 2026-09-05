import { describe, expect, it } from "vitest";
import {
  extractRole,
  isAdminRole,
  isMaxRole,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
  type ClerkUserForRole,
} from "./role-resolution";

type TestUser = ClerkUserForRole & {
  primaryEmailAddress?: { emailAddress: string };
  emailAddresses?: Array<{ emailAddress: string }>;
};

function user(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "user_1",
    publicMetadata: {},
    privateMetadata: {},
    ...overrides,
  };
}

describe("role resolution", () => {
  it("parses configured user ids and ignores empty entries", () => {
    expect(parseAdminUserIds(" user_1, user_2 ,,user_3 ")).toEqual(
      new Set(["user_1", "user_2", "user_3"]),
    );
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

  it("recognizes only canonical max metadata", () => {
    expect(isMaxRole({ publicMetadata: { role: "max" } })).toBe(true);
    expect(isMaxRole({ privateMetadata: { role: "max" } })).toBe(true);
    expect(isMaxRole({ publicMetadata: { role: "admin" } })).toBe(false);
  });

  it.each([
    ["primary email", { primaryEmailAddress: { emailAddress: "creator@example" } }],
    [
      "secondary email",
      {
        primaryEmailAddress: { emailAddress: "user@example" },
        emailAddresses: [{ emailAddress: "creator@example" }],
      },
    ],
  ])("does not grant a privileged role from a %s", (_label, emailFields) => {
    expect(
      resolveClerkRole({
        user: user(emailFields),
        adminUserIds: new Set(),
        maxUserIds: new Set(),
      }),
    ).toBe("benevole");
  });

  it("grants max from the configured Clerk user id regardless of email", () => {
    expect(
      resolveClerkRole({
        user: user({
          id: "max-user",
          primaryEmailAddress: { emailAddress: "anyone@example" },
        }),
        adminUserIds: new Set(),
        maxUserIds: new Set(["max-user"]),
      }),
    ).toBe("max");
  });

  it("grants admin from the configured Clerk user id regardless of email", () => {
    expect(
      resolveClerkRole({
        user: user({
          id: "admin-user",
          primaryEmailAddress: { emailAddress: "anyone@example" },
        }),
        adminUserIds: new Set(["admin-user"]),
        maxUserIds: new Set(),
      }),
    ).toBe("admin");
  });

  it("keeps canonical server max metadata as the max role", () => {
    expect(
      resolveClerkRole({
        user: user({ publicMetadata: { role: "max" } }),
        adminUserIds: new Set(),
        maxUserIds: new Set(),
      }),
    ).toBe("max");
  });

  it("keeps canonical admin metadata as the admin role", () => {
    expect(
      resolveClerkRole({
        user: user({ publicMetadata: { role: "admin" } }),
        adminUserIds: new Set(),
        maxUserIds: new Set(),
      }),
    ).toBe("admin");
  });

  it("does not change role when the email changes", () => {
    const allowlists = {
      adminUserIds: new Set<string>(),
      maxUserIds: new Set(["stable-user"]),
    };

    expect(
      resolveClerkRole({
        user: user({
          id: "stable-user",
          primaryEmailAddress: { emailAddress: "before@example" },
        }),
        ...allowlists,
      }),
    ).toBe("max");
    expect(
      resolveClerkRole({
        user: user({
          id: "stable-user",
          primaryEmailAddress: { emailAddress: "after@example" },
        }),
        ...allowlists,
      }),
    ).toBe("max");
  });
});
