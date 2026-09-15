import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());
const cancelFutureActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));
vi.mock("@/lib/actions/moderation-audit", () => ({ appendActionModerationAudit: appendActionModerationAuditMock }));
vi.mock("@/lib/actions/cancellation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/actions/cancellation")>("@/lib/actions/cancellation");
  return {
    ...actual,
    cancelFutureAction: cancelFutureActionMock,
  };
});

function request(payload: unknown) {
  return new Request("http://localhost/api/actions/action-1/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/actions/:actionId/cancel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getSupabaseAdminClientMock.mockReturnValue({});
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    cancelFutureActionMock.mockResolvedValue({
      id: "action-1",
      status: "cancelled",
      alreadyCancelled: false,
      cancelledAt: "2098-11-20T10:00:00.000Z",
      cancelledBy: "admin-1",
      cancellationReason: "weather",
      previousStatus: "approved",
    });
  });

  it("refuses a non-admin before touching the action", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    const { POST } = await import("./route");
    const response = await POST(request({ confirmPhrase: "CONFIRMER ANNULATION" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(response.status).toBe(403);
    expect(cancelFutureActionMock).not.toHaveBeenCalled();
  });

  it("requires the strong confirmation phrase", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ confirmPhrase: "oui", reason: "weather" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(response.status).toBe(409);
    expect(cancelFutureActionMock).not.toHaveBeenCalled();
  });

  it("cancels through the dedicated operation and audits the tombstone", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({ confirmPhrase: "confirmer annulation", reason: "weather" }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("cancelled");
    expect(cancelFutureActionMock).toHaveBeenCalledWith(expect.anything(), {
      actionId: "action-1",
      actorUserId: "admin-1",
      reason: "weather",
    });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      operation: "cancel_action",
      targetActionId: "action-1",
      previousValue: { status: "approved" },
      newValue: expect.objectContaining({ status: "cancelled" }),
    }));
  });

  it("exposes no physical delete operation", async () => {
    const route = await import("./route");
    expect(route).not.toHaveProperty("DELETE");
  });
});
