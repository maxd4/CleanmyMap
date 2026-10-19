import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const resolveActionFieldRoleAccessMock = vi.hoisted(() => vi.fn());
const proposeActionFieldRoleTransferMock = vi.hoisted(() => vi.fn());
const respondToActionFieldRoleTransferMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/actions/field-roles-http", () => ({ resolveActionFieldRoleAccess: resolveActionFieldRoleAccessMock }));
vi.mock("@/lib/actions/field-roles", () => ({ proposeActionFieldRoleTransfer: proposeActionFieldRoleTransferMock, respondToActionFieldRoleTransfer: respondToActionFieldRoleTransferMock }));

const baseAccess = {
  ok: true as const,
  action: { id: "action-1", action_phase: "pre_action", status: "approved" },
  supabase: {},
  isGlobalAdmin: false,
  isCreator: false,
  isPrimary: true,
};

describe("/api/actions/[actionId]/field-roles/transfer", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "primary-1" });
    resolveActionFieldRoleAccessMock.mockResolvedValue(baseAccess);
    proposeActionFieldRoleTransferMock.mockResolvedValue({ id: "proposal-1", status: "pending" });
    respondToActionFieldRoleTransferMock.mockResolvedValue({ id: "proposal-1", status: "accepted" });
  });

  it("allows only the primary/creator/global path to propose and delegates atomically", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ successorUserId: "coorganizer-1" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(proposeActionFieldRoleTransferMock).toHaveBeenCalledWith({}, expect.objectContaining({ actionId: "action-1", successorUserId: "coorganizer-1", actorId: "primary-1" }));
  });

  it("rejects a coorganizer who is not the primary from proposing a transfer", async () => {
    resolveActionFieldRoleAccessMock.mockResolvedValue({ ...baseAccess, isPrimary: false });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ successorUserId: "coorganizer-2" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(proposeActionFieldRoleTransferMock).not.toHaveBeenCalled();
  });

  it("delegates successor acceptance/rejection to the transactional response RPC", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ proposalId: "00000000-0000-4000-8000-000000000001", decision: "accept" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(respondToActionFieldRoleTransferMock).toHaveBeenCalledWith({}, expect.objectContaining({ actionId: "action-1", proposalId: "00000000-0000-4000-8000-000000000001", decision: "accept", actorId: "primary-1" }));
  });

  it("returns a conflict when the transactional response invalidates an expired proposal", async () => {
    respondToActionFieldRoleTransferMock.mockResolvedValue({ id: "proposal-1", status: "expired" });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ proposalId: "00000000-0000-4000-8000-000000000001", decision: "accept" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(409);
  });
});
