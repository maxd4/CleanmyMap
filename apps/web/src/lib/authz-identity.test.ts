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

import {
  buildActorNameOptions,
  getClerkUser,
  getCurrentUserIdentity,
  pickTraceableActorName,
  resolveActorNameFromClerk,
} from "./authz-identity";

function installSupabaseReads(options: {
  level?: { data: unknown; error: unknown };
  profile?: { data: unknown; error: unknown };
  throwsFor?: string;
} = {}) {
  mocks.getSupabaseServerClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (options.throwsFor === table) throw new Error(`${table} unavailable`);
      const result = table === "progression_profiles"
        ? options.level ?? { data: { current_level: 1 }, error: null }
        : options.profile ?? { data: null, error: null };
      const maybeSingle = vi.fn().mockResolvedValue(result);
      const eq = vi.fn(() => ({ maybeSingle }));
      return { select: vi.fn(() => ({ eq })) };
    }),
  });
}

function installSupabaseProfile(data: unknown = null, error: unknown = null) {
  installSupabaseReads({ profile: { data, error } });
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
    await expect(getCurrentUserIdentity({ userId: null })).resolves.toBeNull();
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("keeps the development bypass disabled when request headers cannot be read", async () => {
    mocks.headers.mockRejectedValue(new Error("request context unavailable"));
    await expect(getCurrentUserIdentity()).resolves.toBeNull();
    expect(mocks.shouldUseDevAuthBypass).toHaveBeenCalledWith({ hostname: null, clerkUserId: null });
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("normalizes traceable actor names and only accepts a preferred known name", async () => {
    expect(buildActorNameOptions(" Ada ", "ada", "user-1")).toEqual(["Ada", "ada", "user-1"]);
    expect(buildActorNameOptions(" ", "Ada", "Ada")).toEqual(["Ada"]);
    expect(resolveActorNameFromClerk([" Ada ", "ada", ""], " ada ")).toBe("ada");
    expect(resolveActorNameFromClerk([" Ada ", "ada"], "unknown")).toBe("Ada");
    expect(resolveActorNameFromClerk([" ", ""], "preferred")).toBe("unknown-user");
    expect(pickTraceableActorName(null, "Ada")).toBeUndefined();
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue(clerkUser()) } });
    const identity = await getCurrentUserIdentity();
    expect(pickTraceableActorName(identity, "Ada")).toBe("Ada");
  });

  it("wraps Clerk user lookup failures while preserving the cause", async () => {
    const failure = new Error("Clerk unavailable");
    const client = { users: { getUser: vi.fn().mockRejectedValue(failure) } } as never;
    await expect(getClerkUser(client, "user-1")).rejects.toMatchObject({
      message: "Clerk unavailable",
      cause: failure,
    });
    const nonErrorClient = { users: { getUser: vi.fn().mockRejectedValue({}) } } as never;
    await expect(getClerkUser(nonErrorClient, "user-2")).rejects.toThrow("Clerk getUser failed for user-2");
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

  it("does not resurrect a legacy territory after canonical preferences are cleared", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue(clerkUser({
          unsafeMetadata: { territoryPreferences: { residence: null, work: null } },
          publicMetadata: { territoryLabel: "Paris 11e", territoryLocationType: "residence", parisArrondissement: 11 },
          privateMetadata: {},
        })),
      },
    });

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({ locationPreference: null });
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

  it("rejects a Clerk identity that does not match the authenticated session", async () => {
    mocks.auth.mockResolvedValue({ userId: "session-user" });
    mocks.clerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(clerkUser({ id: "different-user", publicMetadata: { role: "admin" } })) },
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "session-user",
      role: "benevole",
      activeRole: "benevole",
      currentLevel: 1,
    });
    expect(mocks.syncClerkUserToSupabase).not.toHaveBeenCalled();
    expect(mocks.syncActiveRoleProjectionToSupabase).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      "Current user identity resolution failed",
      expect.objectContaining({ message: "Clerk returned a different user than the authenticated session." }),
    );
    error.mockRestore();
  });

  it("uses safe defaults when progression and stored profile reads fail independently", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue(clerkUser()) } });
    installSupabaseReads({
      level: { data: null, error: new Error("progression unavailable") },
      profile: { data: null, error: new Error("profile unavailable") },
    });
    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "user-1",
      currentLevel: 1,
      handle: "ada",
    });

    installSupabaseReads({ throwsFor: "profiles" });
    await expect(getCurrentUserIdentity()).resolves.toMatchObject({ userId: "user-1", handle: "ada" });
    installSupabaseReads({ throwsFor: "progression_profiles" });
    await expect(getCurrentUserIdentity()).resolves.toMatchObject({ userId: "user-1", currentLevel: 1 });
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

  it("keeps the explicit local max bypass as max without the production owner id", async () => {
    mocks.shouldUseDevAuthBypass.mockReturnValue(true);
    mocks.getDevAuthBypassRole.mockReturnValue("max");
    mocks.getDevAuthBypassUserId.mockReturnValue("dev-max");
    mocks.getDevAuthBypassDisplayName.mockReturnValue("Dev Max");
    mocks.getDevAuthBypassUsername.mockReturnValue("dev-max");

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      userId: "dev-max",
      role: "max",
      activeRole: "max",
      activeProfile: "max",
    });
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

  it("returns a safe fallback if the explicit active-role sync fails", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue(clerkUser()) } });
    mocks.syncActiveRoleProjectionToSupabase.mockRejectedValue(new Error("projection unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCurrentUserIdentity({ userId: "user-1", syncActiveRole: true })).resolves.toMatchObject({
      userId: "user-1",
      role: "benevole",
      activeRole: "benevole",
    });
    expect(mocks.syncClerkUserToSupabase).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("does not fail identity resolution when best-effort background sync rejects", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue(clerkUser()) } });
    mocks.syncClerkUserToSupabase.mockRejectedValue(new Error("sync unavailable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(getCurrentUserIdentity()).resolves.toMatchObject({ userId: "user-1", role: "admin" });
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Background sync skipped for user-1"));
    warn.mockRestore();
  });
});
