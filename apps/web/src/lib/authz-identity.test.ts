import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  headers: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  syncClerkUserToSupabase: vi.fn(),
  syncActiveRoleProjectionToSupabase: vi.fn(),
  getDisplayNameModeCookieOverride: vi.fn(),
  shouldUseDevAuthBypass: vi.fn(),
  getDevAuthBypassRole: vi.fn(),
  getDevAuthBypassUserId: vi.fn(),
  getDevAuthBypassDisplayName: vi.fn(),
  getDevAuthBypassUsername: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./env", () => ({ env: { CLERK_IMU_OWNER_USER_ID: "owner" } }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: mocks.syncClerkUserToSupabase,
}));
vi.mock("@/lib/auth/active-role-projection", () => ({
  syncActiveRoleProjectionToSupabase: mocks.syncActiveRoleProjectionToSupabase,
}));
vi.mock("@/lib/account/display-name-mode-store", () => ({
  getDisplayNameModeCookieOverride: mocks.getDisplayNameModeCookieOverride,
}));
vi.mock("@/lib/auth/dev-auth", () => ({
  getDevAuthBypassRole: mocks.getDevAuthBypassRole,
  getDevAuthBypassUserId: mocks.getDevAuthBypassUserId,
  getDevAuthBypassDisplayName: mocks.getDevAuthBypassDisplayName,
  getDevAuthBypassUsername: mocks.getDevAuthBypassUsername,
  shouldUseDevAuthBypass: mocks.shouldUseDevAuthBypass,
}));

import { getCurrentUserIdentity } from "./authz-identity";

function installSupabaseProfile(data: unknown = null, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  mocks.getSupabaseServerClient.mockReturnValue({ from: vi.fn(() => ({ select })) });
}

function clerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    primaryEmailAddress: { emailAddress: "ada-test-address" },
    publicMetadata: { role: "admin", activeRole: "admin" },
    privateMetadata: {},
    unsafeMetadata: {},
    ...overrides,
  };
}

describe("server identity resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    mocks.shouldUseDevAuthBypass.mockReturnValue(false);
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.getDisplayNameModeCookieOverride.mockResolvedValue(null);
    mocks.syncClerkUserToSupabase.mockResolvedValue(null);
    mocks.syncActiveRoleProjectionToSupabase.mockResolvedValue(null);
    installSupabaseProfile();
  });

  it("returns no identity when Clerk has no authenticated user", async () => {
    await expect(getCurrentUserIdentity()).resolves.toBeNull();
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("builds a complete identity from Clerk and keeps the granted role authoritative", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(clerkUser()) },
    });
    installSupabaseProfile({ display_name: "Ada L.", display_name_mode: "full_name", handle: "ada-l" });

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "user-1",
      role: "admin",
      activeRole: "admin",
      activeProfile: "admin",
      displayName: "Ada Lovelace",
      handle: "ada-l",
    });
    expect(mocks.syncClerkUserToSupabase).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      { allowServiceRoleFallback: false },
    );
  });

  it("keeps an incomplete Clerk/profile read fail-closed with a fallback identity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-incomplete" });
    mocks.clerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockRejectedValue(new Error("Clerk unavailable")) },
    });

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "user-incomplete",
      role: "benevole",
      activeRole: "benevole",
      activeProfile: "benevole",
      currentLevel: 1,
    });
    expect(mocks.syncClerkUserToSupabase).not.toHaveBeenCalled();
  });

  it("uses the explicit local bypass identity without consulting Clerk", async () => {
    mocks.shouldUseDevAuthBypass.mockReturnValue(true);
    mocks.getDevAuthBypassRole.mockReturnValue("admin");
    mocks.getDevAuthBypassUserId.mockReturnValue("dev-admin");
    mocks.getDevAuthBypassDisplayName.mockReturnValue("Local Admin");
    mocks.getDevAuthBypassUsername.mockReturnValue("local-admin");
    mocks.getDisplayNameModeCookieOverride.mockResolvedValue("pseudo");

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "dev-admin",
      role: "admin",
      activeRole: "admin",
      displayName: "local-admin",
      username: "local-admin",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("uses the active-role projection path only when explicitly requested", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(clerkUser()) },
    });

    await getCurrentUserIdentity({ userId: "user-1", syncActiveRole: true });

    expect(mocks.syncActiveRoleProjectionToSupabase).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
    );
    expect(mocks.syncClerkUserToSupabase).not.toHaveBeenCalled();
  });
});
