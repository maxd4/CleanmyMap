import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireCreatorAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const listManagedRoleAccountsMock = vi.hoisted(() => vi.fn());
const searchManagedRoleAccountsMock = vi.hoisted(() => vi.fn());
const getManagedRoleAccountByIdMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    CLERK_ADMIN_USER_IDS: "",
    CLERK_MAX_USER_IDS: "owner-1",
  },
}));

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>(
    "@/lib/authz",
  );
  return {
    ...actual,
    requireCreatorAccess: requireCreatorAccessMock,
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

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

describe("GET/POST /api/admin/role-accounts", () => {
  beforeEach(() => {
    requireCreatorAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "owner-1",
      displayName: "Owner",
      role: "max",
      activeRole: "max",
      activeProfile: "max",
    });
    syncClerkUserToSupabaseMock.mockResolvedValue({ id: "user-2", role_label: "admin" });
    appendAdminOperationAuditMock.mockResolvedValue(null);
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

  it("rejects an active admin from direct role management", async () => {
    requireCreatorAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "admin",
          reason: "Admin manages an assigned role",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(syncClerkUserToSupabaseMock).not.toHaveBeenCalled();
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("rejects an active elected role from direct role management", async () => {
    requireCreatorAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "admin",
          reason: "Elected role denial",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(syncClerkUserToSupabaseMock).not.toHaveBeenCalled();
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("allows only an active IMU to reach direct role management", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "admin",
          reason: "IMU direct assignment",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
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
          reason: "Validated admin assignment",
        }),
      }),
    );
    const body = (await response.json()) as { status?: string; account?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.account?.["roleLabel"]).toBe("admin");
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "owner-1",
        targetId: "user-2",
        operationType: "role_management",
        outcome: "success",
        details: expect.objectContaining({
          operation: "assign_role",
          reason: "Validated admin assignment",
          targetUserId: "user-2",
          previousValue: { role: "benevole" },
          newValue: { role: "admin" },
        }),
      }),
    );
    const successAudit = appendAdminOperationAuditMock.mock.calls[0]?.[0] as {
      details: Record<string, unknown>;
    };
    expect(Object.keys(successAudit.details).sort()).toEqual([
      "newValue",
      "operation",
      "previousValue",
      "reason",
      "targetUserId",
    ]);
    expect(getManagedRoleAccountByIdMock).toHaveBeenCalledWith("user-2");
  });

  it.each([
    ["assign", "admin"],
    ["assign", "elu"],
    ["revoke", undefined],
  ])("audits %s role changes with one success entry", async (action, role) => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action,
          ...(role ? { role } : {}),
          reason: "Reviewed role change",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        outcome: "success",
        details: expect.objectContaining({
          operation: action === "assign" ? "assign_role" : "revoke_role",
          newValue: { role: action === "assign" ? role : "benevole" },
        }),
      }),
    );
  });

  it("rejects max as an assignable target", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "max",
          reason: "The owner role is never assigned here",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it.each([undefined, "nope"]) (
    "rejects an absent or short reason before any mutation (%s)",
    async (reason) => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/admin/role-accounts", {
          method: "POST",
          body: JSON.stringify({
            userId: "user-2",
            action: "assign",
            role: "admin",
            ...(reason === undefined ? {} : { reason }),
          }),
        }),
      );

      expect(response.status).toBe(400);
      expect(clerkClientMock).not.toHaveBeenCalled();
      expect(syncClerkUserToSupabaseMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it("audits a Clerk failure without syncing Supabase", async () => {
    clerkClientMock.mockResolvedValueOnce({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user-2",
          publicMetadata: { role: "benevole" },
          privateMetadata: {},
        }),
        updateUser: vi.fn().mockRejectedValue(new Error("Clerk unavailable")),
      },
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "admin",
          reason: "Clerk failure test",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(syncClerkUserToSupabaseMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({
          stage: "clerk_update",
          previousValue: { role: "benevole" },
          newValue: { role: "admin" },
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Clerk unavailable",
    );
  });

  it("audits a Supabase synchronization failure", async () => {
    syncClerkUserToSupabaseMock.mockResolvedValueOnce(null);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/role-accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          action: "assign",
          role: "elu",
          reason: "Sync failure test",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({
          stage: "supabase_sync",
          newValue: { role: "elu" },
        }),
      }),
    );
  });
});
