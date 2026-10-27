import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseJsonSafely } from "@/lib/actions/http-errors";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());
const cancelFutureActionMock = vi.hoisted(() => vi.fn());
const refreshActionImpactProgressionDependentsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));
vi.mock("@/lib/actions/moderation-audit", () => ({ appendActionModerationAudit: appendActionModerationAuditMock }));
vi.mock("@/lib/actions/cancellation", () => ({ cancelFutureAction: cancelFutureActionMock }));
vi.mock("../../../admin/moderation/route.action-progression", () => ({
  refreshActionImpactProgressionDependents: refreshActionImpactProgressionDependentsMock,
}));

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
    refreshActionImpactProgressionDependentsMock.mockResolvedValue([]);
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
    const body = await parseJsonSafely(response);
    expect(response.status).toBe(409);
    expect(body).toMatchObject({ code: "confirmation_required" });
    expect(cancelFutureActionMock).not.toHaveBeenCalled();
  });

  it("distinguishes a CAS state conflict from missing confirmation", async () => {
    const { ActionCancellationError } = await import(
      "@/lib/actions/cancellation-contract"
    );
    cancelFutureActionMock.mockRejectedValueOnce(
      new ActionCancellationError(
        "conflict",
        "L'action a changé avant la confirmation de son annulation.",
      ),
    );
    const { POST } = await import("./route");
    const response = await POST(
      request({ confirmPhrase: "CONFIRMER ANNULATION", reason: "weather" }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ code: "state_conflict" });
    expect(body).not.toMatchObject({ code: "confirmation_required" });
  });

  it("cancels through the dedicated operation and audits the tombstone", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({ confirmPhrase: "confirmer annulation", reason: "weather" }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "cancelled" });
    expect(cancelFutureActionMock).toHaveBeenCalledWith(expect.anything(), {
      actionId: "action-1",
      actorUserId: "admin-1",
      reason: "weather",
    });
    expect(refreshActionImpactProgressionDependentsMock).toHaveBeenCalledWith(
      expect.anything(),
      { actionId: "action-1", creatorUserId: null },
    );
    const moderationAuditCall: unknown = appendActionModerationAuditMock.mock.calls[0]?.[0];
    expect(moderationAuditCall).toMatchObject({
      operation: "cancel_action",
      targetActionId: "action-1",
      previousValue: { status: "approved" },
      newValue: { status: "cancelled" },
    });
  });

  it("exposes no physical delete operation", async () => {
    const route = await import("./route");
    expect(route).not.toHaveProperty("DELETE");
  });

  it.each([
    ["invalid JSON", "{", "invalid_json"],
    ["unknown field", JSON.stringify({ confirmPhrase: "CONFIRMER ANNULATION", extra: true }), "invalid_payload"],
    ["missing confirmation", JSON.stringify({ reason: "weather" }), "invalid_payload"],
  ] as const)("rejects cancellation %s before touching persistence", async (_label, body, code) => {
    const { POST } = await import("./route");
    const response = await POST(requestBody(body), { params: Promise.resolve({ actionId: "action-1" }) });
    const payload = await parseJsonSafely(response);

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ code });
    expect(cancelFutureActionMock).not.toHaveBeenCalled();
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("returns not found and audits a failed cancellation without a success audit", async () => {
    const { ActionCancellationError } = await import("@/lib/actions/cancellation-contract");
    cancelFutureActionMock.mockRejectedValueOnce(new ActionCancellationError("not_found", "not found"));
    const { POST } = await import("./route");

    const response = await POST(request({ confirmPhrase: "CONFIRMER ANNULATION", reason: "weather" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ code: "not_found" });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
    expect(refreshActionImpactProgressionDependentsMock).not.toHaveBeenCalled();
  });

  it("keeps an ineligible cancellation distinct from a state conflict", async () => {
    const { ActionCancellationError } = await import("@/lib/actions/cancellation-contract");
    cancelFutureActionMock.mockRejectedValueOnce(new ActionCancellationError("not_eligible", "not eligible"));
    const { POST } = await import("./route");

    const response = await POST(request({ confirmPhrase: "CONFIRMER ANNULATION", reason: "weather" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    expect(response.status).toBe(422);
    expect(await parseJsonSafely(response)).toMatchObject({ code: "invalid_payload" });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
  });
});

function requestBody(body: string) {
  return new Request("http://localhost/api/actions/action-1/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
