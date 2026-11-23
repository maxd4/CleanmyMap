import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), identity: vi.fn(), action: vi.fn(), organizers: vi.fn(),
  editors: vi.fn(), clerkUser: vi.fn(), rpc: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.action }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadActionOrganizerRowsForAction: mocks.organizers }));
vi.mock("@/lib/actions/action-form-editors", () => ({ loadActionFormEditorIds: mocks.editors }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { getUser: mocks.clerkUser } }) }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }) }));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ actionId: "action-1" }) };
const request = (body?: unknown) => new Request("https://example.test", body === undefined ? {} : {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("action form editor boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ ok: true, userId: "primary-1" });
    mocks.identity.mockResolvedValue({ userId: "primary-1", role: "benevole", activeRole: "benevole" });
    mocks.action.mockResolvedValue({ id: "action-1", created_by_clerk_id: "creator-1", action_phase: "pre_action" });
    mocks.organizers.mockResolvedValue([{ organizer_clerk_id: "primary-1", is_primary: true }]);
    mocks.editors.mockResolvedValue(["editor-1"]);
    mocks.clerkUser.mockResolvedValue({ id: "user_editor" });
    mocks.rpc.mockResolvedValue({ data: { granted: true }, error: null });
  });

  it("lists editors only to the creator, primary organizer or active admin/max", async () => {
    const allowed = await GET(request(), context);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ actionId: "action-1", editorIds: ["editor-1"], actionPhase: "pre_action" });

    mocks.access.mockResolvedValueOnce({ ok: true, userId: "secondary-1" });
    mocks.identity.mockResolvedValueOnce({ userId: "secondary-1", role: "benevole", activeRole: "benevole" });
    expect((await GET(request(), context)).status).toBe(403);
    expect(mocks.editors).toHaveBeenCalledTimes(1);
  });

  it("verifies the Clerk account and delegates one atomic audited grant to the RPC", async () => {
    const response = await POST(request({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "grant", clerkUserId: "user_editor" }), context);
    expect(response.status).toBe(200);
    expect(mocks.clerkUser).toHaveBeenCalledWith("user_editor");
    expect(mocks.rpc).toHaveBeenCalledWith("mutate_action_form_editor", expect.objectContaining({
      p_action_id: "action-1", p_actor_clerk_id: "primary-1", p_target_clerk_id: "user_editor", p_operation: "grant",
    }));
  });

  it("rejects a non-existent Clerk account before any privilege mutation", async () => {
    mocks.clerkUser.mockRejectedValue(new Error("missing"));
    const response = await POST(request({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "grant", clerkUserId: "user_missing" }), context);
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
