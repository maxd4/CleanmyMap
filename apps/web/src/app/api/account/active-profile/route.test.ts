import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const devBypassMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authzMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/authz-identity", () => ({ getDevAuthBypassSession: devBypassMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));

function setupClerk(initialPublicMetadata: Record<string, unknown>, userId = "user-1") {
  const getUser = vi.fn().mockResolvedValue({
    id: userId,
    publicMetadata: initialPublicMetadata,
    privateMetadata: { role: initialPublicMetadata.role },
  });
  const updateUser = vi.fn().mockImplementation(async (_id, patch) => ({
    id: userId,
    publicMetadata: patch.publicMetadata,
    privateMetadata: { role: initialPublicMetadata.role },
  }));
  clerkClientMock.mockResolvedValue({ users: { getUser, updateUser } });
  syncMock.mockResolvedValue(null);
  return { getUser, updateUser };
}

async function post(payload: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/account/active-profile", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

describe("POST /api/account/active-profile", () => {
  beforeEach(() => {
    authzMock.mockResolvedValue({ ok: true, userId: "user-1" });
    identityMock.mockResolvedValue({ role: "benevole", activeRole: "benevole" });
    devBypassMock.mockResolvedValue(null);
  });

  afterEach(() => vi.resetAllMocks());

  it("requires authentication", async () => {
    authzMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await post({ activeRole: "benevole" });
    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { activeRole: "not-a-role" },
    { activeRole: "admin", activeProfile: "admin" },
  ])("rejects invalid payload %j", async (payload) => {
    const response = await post(payload);
    expect(response.status).toBe(400);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("rejects standard -> elu/admin/max and never reaches Clerk", async () => {
    setupClerk({ role: "benevole" });
    const response = await post({ activeRole: "admin" });
    expect(response.status).toBe(403);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("changes only ACTIVE_ROLE for an open-role account", async () => {
    const { updateUser } = setupClerk({
      role: "benevole",
      profile: "benevole",
      activeProfile: "benevole",
      preserved: "metadata",
    });
    const response = await post({ activeRole: "scientifique" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      role: "benevole",
      activeRole: "scientifique",
      activeProfile: "scientifique",
      profilePath: "/profil/scientifique",
    });
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: {
        role: "benevole",
        profile: "benevole",
        preserved: "metadata",
        activeRole: "scientifique",
      },
    });
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["elu", "scientifique"],
    ["admin", "elu"],
    ["max", "admin"],
  ] as const)("allows granted %s to activate %s without changing GRANTED_ROLE", async (role, activeRole) => {
    identityMock.mockResolvedValue({ role, activeRole: role });
    const { updateUser } = setupClerk({ role, profile: role });
    const response = await post({ activeRole });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ role, activeRole });
    expect(updateUser).toHaveBeenCalledTimes(1);
    const [, patch] = updateUser.mock.calls[0];
    expect(patch.publicMetadata).toMatchObject({ role, profile: role, activeRole });
    expect(patch).not.toHaveProperty("privateMetadata");
  });

  it("rejects admin -> ACTIVE_ROLE=max", async () => {
    identityMock.mockResolvedValue({ role: "admin", activeRole: "admin" });
    const { updateUser } = setupClerk({ role: "admin" });
    const response = await post({ activeRole: "max" });
    expect(response.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("keeps the synthetic Codex identity local and does not call Clerk or Supabase", async () => {
    identityMock.mockResolvedValue({ role: "max", activeRole: "max" });
    devBypassMock.mockResolvedValue({ role: "max", userId: "dev-max" });
    const response = await post({ activeRole: "benevole" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ role: "max", activeRole: "benevole" });
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });
});
