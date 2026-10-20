import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  getClerkUser: vi.fn(),
  getDevAuthBypassSession: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));

vi.mock("./env", () => ({
  env: { CLERK_IMU_OWNER_USER_ID: "owner" },
}));

vi.mock("./authz-identity", () => ({
  buildActorNameOptions: vi.fn(),
  getClerkUser: mocks.getClerkUser,
  getDevAuthBypassSession: mocks.getDevAuthBypassSession,
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
  resolveActorNameFromClerk: vi.fn(),
}));

import {
  getCurrentUserActiveRole,
  getCurrentUserEffectiveAccess,
  getCurrentUserRoleLabel,
  requireAdminAccess,
  requireAuthenticatedAccess,
  requireCreatorAccess,
} from "./authz";

function identity(activeRole: string) {
  return { activeRole };
}

describe("direct AuthN/AuthZ guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({});
    mocks.getClerkUser.mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "benevole" },
      privateMetadata: {},
    });
    mocks.getDevAuthBypassSession.mockResolvedValue(null);
    mocks.getCurrentUserIdentity.mockResolvedValue(identity("benevole"));
  });

  it.each([
    ["benevole", false],
    ["coordinateur", false],
    ["scientifique", false],
    ["entreprise", false],
    ["elu", false],
    ["admin", true],
    ["max", true],
  ] as const)("allows admin access only for %s active role", async (activeRole, allowed) => {
    mocks.getCurrentUserIdentity.mockResolvedValue(identity(activeRole));

    await expect(requireAdminAccess()).resolves.toEqual(
      allowed
        ? { ok: true, userId: "user-1" }
        : { ok: false, status: 403, error: "Forbidden" },
    );
  });

  it.each([
    ["benevole", false],
    ["coordinateur", false],
    ["admin", false],
    ["max", true],
  ] as const)("allows creator access only for the max active role", async (activeRole, allowed) => {
    mocks.getCurrentUserIdentity.mockResolvedValue(identity(activeRole));

    await expect(requireCreatorAccess()).resolves.toEqual(
      allowed
        ? { ok: true, userId: "user-1" }
        : { ok: false, status: 403, error: "Forbidden" },
    );
  });

  it("returns 401 before resolving privileged access for an anonymous request", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(requireAdminAccess()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    await expect(requireCreatorAccess()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(mocks.getCurrentUserIdentity).not.toHaveBeenCalled();
  });

  it("keeps the authenticated guard independent from role capabilities", async () => {
    await expect(requireAuthenticatedAccess()).resolves.toEqual({ ok: true, userId: "user-1" });

    mocks.auth.mockResolvedValue({ userId: null });
    await expect(requireAuthenticatedAccess()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("uses the explicit local bypass while keeping its canonical role restrictions", async () => {
    mocks.getDevAuthBypassSession.mockResolvedValue({ userId: "owner", role: "max" });

    await expect(requireAdminAccess()).resolves.toEqual({ ok: true, userId: "owner" });
    await expect(requireCreatorAccess()).resolves.toEqual({ ok: true, userId: "owner" });
    await expect(getCurrentUserActiveRole()).resolves.toBe("max");
    await expect(getCurrentUserEffectiveAccess()).resolves.toEqual({
      canAccessAdminPage: true,
      canAccessPilotage: false,
    });
    await expect(getCurrentUserRoleLabel()).resolves.toBe("max");
    expect(mocks.auth).not.toHaveBeenCalled();

    mocks.getDevAuthBypassSession.mockResolvedValue({ userId: "other", role: "max" });
    await expect(requireAdminAccess()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    await expect(requireCreatorAccess()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("does not turn a non-privileged bypass role into admin or creator access", async () => {
    mocks.getDevAuthBypassSession.mockResolvedValue({ userId: "local", role: "coordinateur" });

    await expect(requireAdminAccess()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    await expect(requireCreatorAccess()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("fails closed when active-role resolution is unavailable for creator access", async () => {
    mocks.getCurrentUserIdentity.mockRejectedValue(new Error("identity provider unavailable"));

    await expect(requireCreatorAccess()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("resolves current roles and effective access from the server identity", async () => {
    mocks.getCurrentUserIdentity.mockResolvedValue(identity("coordinateur"));
    await expect(getCurrentUserActiveRole()).resolves.toBe("coordinateur");
    await expect(getCurrentUserEffectiveAccess()).resolves.toEqual({
      canAccessAdminPage: false,
      canAccessPilotage: true,
    });

    mocks.auth.mockResolvedValue({ userId: null });
    mocks.getCurrentUserIdentity.mockResolvedValue(null);
    await expect(getCurrentUserActiveRole()).resolves.toBe("anonymous");
    await expect(getCurrentUserEffectiveAccess()).resolves.toEqual({
      canAccessAdminPage: false,
      canAccessPilotage: false,
    });
    await expect(getCurrentUserRoleLabel()).resolves.toBe("anonymous");
  });

  it.each([
    [{ role: "admin" }, "admin"],
    [{ role: "max" }, "benevole"],
    [{ role: "invalid" }, "benevole"],
  ] as const)("resolves the role label only from the canonical Clerk role (%j)", async (publicMetadata, expected) => {
    mocks.getClerkUser.mockResolvedValue({ id: "user-1", publicMetadata, privateMetadata: {} });

    await expect(getCurrentUserRoleLabel()).resolves.toBe(expected);
  });

  it("fails closed to the ordinary role when Clerk user resolution fails", async () => {
    mocks.getClerkUser.mockRejectedValue(new Error("Clerk unavailable"));

    await expect(getCurrentUserRoleLabel()).resolves.toBe("benevole");
  });
});
