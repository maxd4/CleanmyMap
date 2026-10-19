import { describe, expect, it, vi } from "vitest";
import {
  ACTION_FIELD_ROLE_OPTIONS,
  isActionFieldRoleCode,
  loadActionFieldRoleState,
  normalizeActionFieldRoleCodes,
  replaceActionFieldRoles,
} from "./field-roles";

describe("action field roles contract", () => {
  it("keeps the five per-action role codes explicit and rejects unknown codes", () => {
    expect(ACTION_FIELD_ROLE_OPTIONS).toHaveLength(5);
    expect(isActionFieldRoleCode("group_lead")).toBe(true);
    expect(isActionFieldRoleCode("admin")).toBe(false);
    expect(normalizeActionFieldRoleCodes(["group_lead", "group_lead", "admin"])).toEqual(["group_lead"]);
  });

  it("reads only active assignments and the pending transfer projection", async () => {
    const assignmentOrder = { order: vi.fn().mockResolvedValue({ data: [{ id: "a1", user_id: "user-1", role_code: "group_lead", assignment_status: "active" }], error: null }) };
    const assignmentQuery = { select: vi.fn(() => assignmentQuery), eq: vi.fn(() => assignmentQuery), order: vi.fn().mockImplementationOnce(() => assignmentOrder).mockImplementationOnce(() => assignmentOrder) };
    const transferQuery = { select: vi.fn(() => transferQuery), eq: vi.fn(() => transferQuery), order: vi.fn(() => transferQuery), limit: vi.fn().mockResolvedValue({ data: [{ id: "t1", status: "pending" }], error: null }) };
    const supabase = { from: vi.fn((table: string) => table === "action_field_role_assignments" ? assignmentQuery : transferQuery) } as never;
    await expect(loadActionFieldRoleState(supabase, "action-1")).resolves.toMatchObject({ assignments: [{ user_id: "user-1" }], pendingTransfer: { id: "t1" } });
  });

  it("delegates replacement to the transactional server RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "a1" }], error: null });
    await expect(replaceActionFieldRoles({ rpc } as never, { actionId: "action-1", userId: "user-1", roleCodes: ["group_lead"], actorId: "user-1" })).resolves.toEqual([{ id: "a1" }]);
    expect(rpc).toHaveBeenCalledWith("assign_action_field_roles", expect.objectContaining({ p_action_id: "action-1", p_user_id: "user-1", p_role_codes: ["group_lead"] }));
  });
});
