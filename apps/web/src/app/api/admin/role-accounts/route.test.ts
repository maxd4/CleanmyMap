import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const listManagedRoleAccountsMock = vi.hoisted(() => vi.fn());
const searchManagedRoleAccountsMock = vi.hoisted(() => vi.fn());
const getManagedRoleAccountByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>(
    "@/lib/authz",
  );
  return {
    ...actual,
    getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
    getCurrentUserIdentity: getCurrentUserIdentityMock,
  };
});

vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: syncClerkUserToSupabaseMock,
}));

vi.mock("@/lib/admin/role-management", () => ({
  listManagedRoleAccounts: listManagedRoleAccountsMock,
  searchManagedRoleAccounts: searchManagedRoleAccountsMock,
  getManagedRoleAccountById: getManagedRoleAccountByIdMock,
}));

describe("GET/POST /api/admin/role-accounts", () => {
  beforeEach(() => {
    getCurrentUserRoleLabelMock.mockResolvedValue("max");
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "owner-1",
      displayName: "Owner",
      role: "max",
    });
    syncClerkUserToSupabaseMock.mockResolvedValue(null);
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user-2",
          publicMetadata: { role: "benevole" },
          privateMetadata: {},
        }),
        updateUser: vi.fn().mockResolvedValue({
          id: "user-2",
          publicMetadata: { role: "admin", profile: "admin" },
          privateMetadata: { role: "admin", profile: "admin" },
        }),
      },
    });
    listManagedRoleAccountsMock.mockResolvedValue([
      {
        userId: "user-2",
        displayName: "Alice",
        handle: "alice",
        avatarUrl: null,
        roleLabel: "admin",
        parisArrondissement: 12,
        updatedAt: null,
      },
    ]);
    searchManagedRoleAccountsMock.mockResolvedValue([
      {
        userId: "user-3",
        displayName: "Bob",
        handle: "bob",
        avatarUrl: null,
        roleLabel: "benevole",
        parisArrondissement: null,
        updatedAt: null,
      },
    ]);
    getManagedRoleAccountByIdMock.mockResolvedValue({
      userId: "user-2",
      displayName: "Alice",
      handle: "alice",
      avatarUrl: null,
      roleLabel: "admin",
      parisArrondissement: 12,
      updatedAt: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists the managed admin/elected accounts", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/admin/role-accounts"));
    const body = (await response.json()) as { count?: number; accounts?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.accounts).toHaveLength(1);
    expect(listManagedRoleAccountsMock).toHaveBeenCalledTimes(1);
  });

  it("searches accounts by query", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/role-accounts?q=bob"),
    );
    const body = (await response.json()) as { count?: number; accounts?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.accounts).toHaveLength(1);
    expect(searchManagedRoleAccountsMock).toHaveBeenCalledWith("bob");
  });

  it("assigns a role and syncs Clerk and Supabase", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "admin",
        }),
      }),
    );
    const body = (await response.json()) as { status?: string; account?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.account?.roleLabel).toBe("admin");
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
    expect(getManagedRoleAccountByIdMock).toHaveBeenCalledWith("user-2");
  });
});
