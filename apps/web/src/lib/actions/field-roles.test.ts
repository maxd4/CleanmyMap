import { describe, expect, it, vi } from "vitest";
import {
  ACTION_FIELD_ROLE_OPTIONS,
  isActionFieldRoleCode,
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
});
