import { describe, expect, it } from "vitest";
import {
  extractRole,
  isAdminRole,
  isConfiguredImuOwnerUserId,
  isMaxRole,
  resolveClerkRole,
  type ClerkUserForRole,
} from "./role-resolution";

function user(overrides: Partial<ClerkUserForRole> = {}): ClerkUserForRole {
  return {
    id: "user_1",
    publicMetadata: {},
    privateMetadata: {},
    ...overrides,
  };
}

describe("canonical Clerk role resolution", () => {
  it("reads only publicMetadata.role and normalizes canonical values", () => {
    expect(extractRole({ role: " Admin " })).toBe("admin");
    expect(extractRole({ profile: "admin" })).toBeNull();
    expect(extractRole({ role: "imu" })).toBeNull();
    expect(extractRole({ role: "super_admin" })).toBeNull();
    expect(extractRole({ role: 123 })).toBeNull();
    expect(extractRole(undefined)).toBeNull();
  });

  it("never grants admin or max from private metadata or aliases", () => {
    expect(isAdminRole({ privateMetadata: { role: "admin" } })).toBe(false);
    expect(isAdminRole({ publicMetadata: { profile: "admin" } })).toBe(false);
    expect(isMaxRole({
      user: user({ id: "owner", privateMetadata: { role: "max" } }),
      imuOwnerUserId: "owner",
    })).toBe(false);
  });

  it("requires the exact configured owner and canonical max role", () => {
    expect(isConfiguredImuOwnerUserId("owner", "owner")).toBe(true);
    expect(isConfiguredImuOwnerUserId("owner", " owner ")).toBe(true);
    expect(isConfiguredImuOwnerUserId("owner", undefined)).toBe(false);
    expect(isConfiguredImuOwnerUserId("other", "owner")).toBe(false);
    expect(resolveClerkRole({
      user: user({ id: "owner", publicMetadata: { role: "max" } }),
      imuOwnerUserId: "owner",
    })).toBe("max");
    expect(resolveClerkRole({
      user: user({ id: "other", publicMetadata: { role: "max" } }),
      imuOwnerUserId: "owner",
    })).toBe("benevole");
    expect(resolveClerkRole({
      user: user({ id: "owner", publicMetadata: { role: "max" } }),
      imuOwnerUserId: undefined,
    })).toBe("benevole");
  });

  it("resolves admin and elu only from canonical public metadata", () => {
    expect(resolveClerkRole({
      user: user({ publicMetadata: { role: "admin" }, privateMetadata: { role: "benevole" } }),
      imuOwnerUserId: "owner",
    })).toBe("admin");
    expect(resolveClerkRole({
      user: user({ publicMetadata: { role: "elu" }, privateMetadata: { role: "admin" } }),
      imuOwnerUserId: "owner",
    })).toBe("elu");
    expect(resolveClerkRole({
      user: user({ publicMetadata: { profile: "admin" }, privateMetadata: { role: "admin" } }),
      imuOwnerUserId: "owner",
    })).toBe("benevole");
  });

  it("does not use emails or old allowlist-shaped inputs", () => {
    expect(resolveClerkRole({
      user: user({
        id: "any-user",
        publicMetadata: {},
      }),
      imuOwnerUserId: "owner",
    })).toBe("benevole");
  });
});
