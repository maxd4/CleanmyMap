import { describe, expect, it, vi } from "vitest";
import {
  ACTION_FIELD_ROLE_OPTIONS,
  isActionFieldRoleCode,
  loadActiveActionFieldRoleAssignments,
  loadActionFieldRoleState,
  normalizeActionFieldRoleCodes,
  replaceActionFieldRoles,
  respondToActionFieldRoleTransfer,
} from "./field-roles";

describe("action field roles contract", () => {
  it("keeps the current per-action role codes explicit and rejects unknown codes", () => {
    expect(ACTION_FIELD_ROLE_OPTIONS.map(({ code }) => code)).toEqual([
      "organizer_primary",
      "coorganizer",
      "group_lead",
      "cigarette_bag_lead",
      "recyclable_bag_lead",
      "household_waste_bag_lead",
      "glass_bag_lead",
    ]);
    expect(isActionFieldRoleCode("group_lead")).toBe(true);
    expect(isActionFieldRoleCode("admin")).toBe(false);
    expect(normalizeActionFieldRoleCodes(["group_lead", "group_lead", "admin"])).toEqual(["group_lead"]);
  });

  it("reads only active assignments and the pending transfer projection", async () => {
    const assignmentOrder = { order: vi.fn().mockResolvedValue({ data: [{ id: "a1", user_id: "user-1", role_code: "group_lead", assignment_status: "active" }], error: null }) };
    const assignmentQuery = { select: vi.fn(() => assignmentQuery), eq: vi.fn(() => assignmentQuery), order: vi.fn().mockImplementationOnce(() => assignmentOrder).mockImplementationOnce(() => assignmentOrder) };
    const transferQuery = { select: vi.fn(() => transferQuery), eq: vi.fn(() => transferQuery), order: vi.fn(() => transferQuery), limit: vi.fn().mockResolvedValue({ data: [{ id: "t1", status: "pending" }], error: null }) };
    const supabase = { from: vi.fn((table: string) => table === "action_field_role_assignments" ? assignmentQuery : transferQuery) } as never;
    await expect(loadActionFieldRoleState(supabase, "action-1")).resolves.toMatchObject({ assignments: [{ user_id: "user-1" }], pendingTransfer: { id: "t1" }, transferProposals: [{ id: "t1" }] });
  });

  it("propagates active assignment query failures from the shared loader", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
    };
    query.order.mockImplementationOnce(() => query).mockImplementationOnce(() => Promise.resolve({ data: null, error: new Error("assignment read failed") }) as never);
    const supabase = { from: vi.fn(() => query) } as never;

    await expect(loadActiveActionFieldRoleAssignments(supabase, "action-1")).rejects.toThrow("assignment read failed");
  });

  it("delegates replacement to the transactional server RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "a1" }], error: null });
    await expect(replaceActionFieldRoles({ rpc } as never, { actionId: "action-1", userId: "user-1", roleCodes: ["group_lead"], actorId: "user-1" })).resolves.toEqual([{ id: "a1" }]);
    expect(rpc).toHaveBeenCalledWith("assign_action_field_roles", expect.objectContaining({ p_action_id: "action-1", p_user_id: "user-1", p_role_codes: ["group_lead"] }));
  });

  it("passes the action scope to the response RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "t1", status: "accepted" }], error: null });
    await expect(respondToActionFieldRoleTransfer({ rpc } as never, { actionId: "action-1", proposalId: "t1", actorId: "user-2", decision: "accept", actorIsGlobalAdmin: false })).resolves.toEqual({ id: "t1", status: "accepted" });
    expect(rpc).toHaveBeenCalledWith("respond_action_field_role_transfer", expect.objectContaining({ p_action_id: "action-1", p_proposal_id: "t1", p_decision: "accept" }));
  });

  it.each([
    [[" group_lead ", "coorganizer", "group_lead"], ["group_lead", "coorganizer"]],
    [["unknown", "admin", ""], []],
    [["glass_bag_lead", "glass_bag_lead"], ["glass_bag_lead"]],
    [["organizer_primary", "coorganizer", "recyclable_bag_lead"], ["organizer_primary", "coorganizer", "recyclable_bag_lead"]],
    [[" household_waste_bag_lead "], ["household_waste_bag_lead"]],
  ] as const)("normalizes role input case %j without granting unknown capabilities", (input, expected) => {
    expect(normalizeActionFieldRoleCodes(input)).toEqual(expected);
  });

  it("propagates a transactional assignment failure instead of returning a partial list", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "assignment conflict" } });

    await expect(replaceActionFieldRoles({ rpc } as never, {
      actionId: "action-1",
      userId: "user-1",
      roleCodes: ["group_lead"],
      actorId: "admin-1",
    })).rejects.toThrow("assignment conflict");
  });

  it("sends a null reason when a transfer is accepted without a justification", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "t1", status: "accepted" }], error: null });

    await respondToActionFieldRoleTransfer({ rpc } as never, {
      actionId: "action-1",
      proposalId: "t1",
      actorId: "user-2",
      decision: "accept",
      actorIsGlobalAdmin: false,
    });

    expect(rpc).toHaveBeenCalledWith("respond_action_field_role_transfer", expect.objectContaining({ p_reason: null }));
  });

  it("passes a rejection reason and actor scope to the transfer RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: "t1", status: "rejected" }, error: null });

    await expect(respondToActionFieldRoleTransfer({ rpc } as never, {
      actionId: "action-1",
      proposalId: "t1",
      actorId: "admin-1",
      decision: "reject",
      actorIsGlobalAdmin: true,
      reason: "Remplacement indisponible",
    })).resolves.toMatchObject({ status: "rejected" });
    expect(rpc).toHaveBeenCalledWith("respond_action_field_role_transfer", expect.objectContaining({
      p_actor_is_global_admin: true,
      p_reason: "Remplacement indisponible",
    }));
  });

  it("propagates transfer proposal RPC failures", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "proposal conflict" } });
    const { proposeActionFieldRoleTransfer } = await import("./field-roles");

    await expect(proposeActionFieldRoleTransfer({ rpc } as never, {
      actionId: "action-1",
      successorUserId: "user-2",
      actorId: "user-1",
      actorIsGlobalAdmin: false,
    })).rejects.toThrow("proposal conflict");
  });
});
