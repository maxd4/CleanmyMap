import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const runSingleActionQueryMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const listAdminOperationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/query", () => ({
  runSingleActionQuery: runSingleActionQueryMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  listAdminOperationAudit: listAdminOperationAuditMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));

describe("GET /api/actions/:actionId/audit", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "benevole" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    listAdminOperationAuditMock.mockResolvedValue([
      {
        operationId: "op-1",
        at: "2026-06-21T10:00:00.000Z",
        actorUserId: "admin-1",
        actorLabel: "Maxence Deroome (@maxence_deroome)",
        operationType: "moderation",
        outcome: "success",
        targetId: "action-1",
        details: { editedFields: ["locationLabel"] },
      },
    ]);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns the audit journal for the action creator", async () => {
    runSingleActionQueryMock.mockResolvedValue({
      created_by_clerk_id: "user-1",
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/audit?limit=8"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as { status?: string; count?: number; items?: unknown[] };
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(1);
    expect(listAdminOperationAuditMock).toHaveBeenCalledWith(8, "action-1");
  });

  it("rejects users that do not own the action", async () => {
    runSingleActionQueryMock.mockResolvedValue({
      created_by_clerk_id: "user-2",
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/audit"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(403);
    expect(listAdminOperationAuditMock).not.toHaveBeenCalled();
  });
});
