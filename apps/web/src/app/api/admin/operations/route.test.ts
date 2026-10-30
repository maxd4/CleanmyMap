import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const listAdminOperationAuditPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/audit/operation-audit")>("@/lib/admin/audit/operation-audit");
  return {
    ...actual,
    listAdminOperationAuditPage: listAdminOperationAuditPageMock,
  };
});
vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: vi.fn((_access, operationId) =>
    new Response(JSON.stringify({ error: "Forbidden", operationId }), { status: 403, headers: { "content-type": "application/json" } }),
  ),
}));

describe("GET /api/admin/operations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-a" });
    listAdminOperationAuditPageMock.mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
  });

  it.each(["admin", "max"])("allows %s access through the server guard and applies filters before pagination", async (role) => {
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: `${role}-1`, role });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/admin/operations?limit=2&actorUserId=admin-b&operation=feedback_state_changed&outcome=error&targetId=feedback-1&from=2026-10-01T00:00:00.000Z&to=2026-10-30T23:59:59.999Z"));

    expect(response.status).toBe(200);
    expect(listAdminOperationAuditPageMock).toHaveBeenCalledWith(2, expect.objectContaining({
      actorUserId: "admin-b",
      operation: "feedback_state_changed",
      outcome: "error",
      targetId: "feedback-1",
    }));
  });

  it("projects sensitive details out of the administrative response", async () => {
    listAdminOperationAuditPageMock.mockResolvedValueOnce({
      hasMore: false,
      nextCursor: null,
      items: [{
        operationId: "op-1",
        at: "2026-10-30T10:00:00.000Z",
        actorUserId: "admin-a",
        operationType: "admin_operation",
        outcome: "success",
        targetId: "feedback-1",
        details: {
          operation: "feedback_state_changed",
          reason: "Traitement validé",
          previousValue: { status: "open", description: "private payload" },
          newValue: { status: "treated", token: "secret" },
          rawPayload: "must not escape",
        },
      }],
    });
    const { GET } = await import("./route");
    const payload = await (await GET(new Request("http://localhost/api/admin/operations"))).json();
    expect(payload.items[0].details).toEqual({
      operation: "feedback_state_changed",
      reason: "Traitement validé",
      previousValue: { status: "open" },
      newValue: { status: "treated" },
    });
    expect(JSON.stringify(payload)).not.toContain("private payload");
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("denies non-admin access before reading the audit", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, code: "forbidden" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/admin/operations"));
    expect(response.status).toBe(403);
    expect(listAdminOperationAuditPageMock).not.toHaveBeenCalled();
  });
});
