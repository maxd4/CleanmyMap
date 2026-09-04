import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const roleMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authzMock,
  getCurrentUserRoleLabel: roleMock,
}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));

function setupClerk(initialPublicMetadata: Record<string, unknown>) {
  const getUser = vi.fn().mockResolvedValue({
    id: "user-1",
    publicMetadata: initialPublicMetadata,
    privateMetadata: { role: initialPublicMetadata.role },
  });
  const updateUser = vi.fn().mockImplementation(async (_id, patch) => ({
    id: "user-1",
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
    roleMock.mockResolvedValue("benevole");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("requires authentication", async () => {
    authzMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await post({ activeProfile: "benevole" });

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { activeProfile: "not-a-profile" },
    { role: "admin" },
    { activeProfile: "benevole", role: "admin" },
  ])("rejects invalid payload %j", async (payload) => {
    const response = await post(payload);

    expect(response.status).toBe(400);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("rejects a target outside the self-service profiles", async () => {
    roleMock.mockResolvedValue("benevole");
    const { updateUser } = setupClerk({ role: "benevole" });

    const response = await post({ activeProfile: "admin" });

    expect(response.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("allows a self-service persona change while preserving role and profile", async () => {
    roleMock.mockResolvedValue("benevole");
    const { updateUser } = setupClerk({
      role: "benevole",
      profile: "benevole",
      badges: ["pioneer"],
    });

    const response = await post({ activeProfile: "scientifique" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      role: "benevole",
      activeProfile: "scientifique",
      profilePath: "/profil/scientifique",
    });
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: {
        role: "benevole",
        profile: "benevole",
        badges: ["pioneer"],
        activeProfile: "scientifique",
      },
    });
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["max", "benevole"],
    ["admin", "scientifique"],
  ] as const)(
    "allows %s to change persona without changing its real role",
    async (role, activeProfile) => {
      roleMock.mockResolvedValue(role);
      const { updateUser } = setupClerk({
        role,
        profile: role,
        preserved: "metadata",
      });

      const response = await post({ activeProfile });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ role, activeProfile });
      expect(updateUser).toHaveBeenCalledTimes(1);
      const [, patch] = updateUser.mock.calls[0];
      expect(patch).toEqual({
        publicMetadata: {
          role,
          profile: role,
          preserved: "metadata",
          activeProfile,
        },
      });
      expect(patch).not.toHaveProperty("privateMetadata");
    },
  );

  it("rejects admin -> activeProfile=max before touching Clerk", async () => {
    roleMock.mockResolvedValue("admin");
    const { updateUser } = setupClerk({ role: "admin" });

    const response = await post({ activeProfile: "max" });

    expect(response.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });
});
