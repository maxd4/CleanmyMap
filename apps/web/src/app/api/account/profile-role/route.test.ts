import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>(
    "@/lib/authz",
  );
  return {
    ...actual,
    getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
  };
});

vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: syncClerkUserToSupabaseMock,
}));

describe("POST /api/account/profile-role", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserRoleLabelMock.mockResolvedValue("benevole");
    syncClerkUserToSupabaseMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("updates a safe role and syncs the server state", async () => {
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "benevole", badge: "pioneer" },
      privateMetadata: {},
    });
    const updateUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "coordinateur", badge: "pioneer" },
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser, updateUser },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/profile-role", {
        method: "POST",
        body: JSON.stringify({ profile: "coordinateur" }),
      }),
    );

    const body = (await response.json()) as {
      role?: string;
      profilePath?: string;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.role).toBe("coordinateur");
    expect(body.profilePath).toBe("/profil/coordinateur");
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: {
        role: "coordinateur",
        profile: "coordinateur",
        badge: "pioneer",
      },
      privateMetadata: { role: "coordinateur", profile: "coordinateur" },
    });
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
  });

  it("allows self-service users to switch to the enterprise role", async () => {
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "benevole", badge: "pioneer" },
      privateMetadata: {},
    });
    const updateUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "entreprise", badge: "pioneer" },
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser, updateUser },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/profile-role", {
        method: "POST",
        body: JSON.stringify({ profile: "entreprise" }),
      }),
    );

    const body = (await response.json()) as {
      role?: string;
      profilePath?: string;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.role).toBe("entreprise");
    expect(body.profilePath).toBe("/profil/entreprise");
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: {
        role: "entreprise",
        profile: "entreprise",
        badge: "pioneer",
      },
      privateMetadata: { role: "entreprise", profile: "entreprise" },
    });
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
  });

  it("stores IMU in Clerk metadata while keeping the internal owner role", async () => {
    getCurrentUserRoleLabelMock.mockResolvedValue("admin");
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "max", badge: "pioneer" },
      privateMetadata: {},
    });
    const updateUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "imu", profile: "imu", badge: "pioneer" },
      privateMetadata: { role: "imu", profile: "imu" },
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser, updateUser },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/profile-role", {
        method: "POST",
        body: JSON.stringify({ profile: "imu" }),
      }),
    );

    const body = (await response.json()) as {
      role?: string;
      profilePath?: string;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.role).toBe("max");
    expect(body.profilePath).toBe("/profil/max");
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      publicMetadata: { role: "imu", profile: "imu", badge: "pioneer" },
      privateMetadata: { role: "imu", profile: "imu" },
    });
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects admin target roles before touching Clerk", async () => {
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "benevole", badge: "pioneer" },
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser,
        updateUser: vi.fn(),
      },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/profile-role", {
        method: "POST",
        body: JSON.stringify({ profile: "admin" }),
      }),
    );

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(403);
    expect(body.error).toContain("Rôle cible interdit");
  });

  it("blocks accounts whose current role is not self-service", async () => {
    getCurrentUserRoleLabelMock.mockResolvedValue("admin");
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      publicMetadata: { role: "coordinateur", badge: "pioneer" },
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser,
        updateUser: vi.fn(),
      },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/profile-role", {
        method: "POST",
        body: JSON.stringify({ profile: "benevole" }),
      }),
    );

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(403);
    expect(body.error).toContain("ne peut pas modifier");
  });
});
