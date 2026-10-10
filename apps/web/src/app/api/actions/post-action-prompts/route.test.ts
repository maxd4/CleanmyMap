import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMock, resetApiRouteMocks, serverMock } from "@/__tests__/support/api-route-mocks";


describe("/api/actions/post-action-prompts", () => {
  beforeEach(() => {
    resetApiRouteMocks("recipient-1");
  });

  it("projects prompts through the authenticated recipient-bound RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ action_id: "action-1" }], error: null });
    serverMock.mockReturnValue({ rpc });
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/post-action-prompts"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledWith("list_pending_action_result_prompts_for_recipient", {
      p_recipient_id: "recipient-1",
    });
  });

  it("binds both explicit answers to the authenticated recipient", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ status: "claimed", action_id: "action-1" }], error: null });
    serverMock.mockReturnValue({ rpc });
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/actions/post-action-prompts", {
      method: "PATCH",
      body: JSON.stringify({ actionId: "11111111-1111-4111-8111-111111111111", decision: "claim" }),
    }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("respond_to_action_result_prompt", {
      p_action_id: "11111111-1111-4111-8111-111111111111",
      p_recipient_id: "recipient-1",
      p_decision: "claim",
    });
  });

  it("refuses unauthenticated responses before touching Supabase", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { PATCH } = await import("./route");

    expect((await PATCH(new Request("http://localhost/api/actions/post-action-prompts", {
      method: "PATCH",
      body: JSON.stringify({ actionId: "11111111-1111-4111-8111-111111111111", decision: "not_participated" }),
    }))).status).toBe(401);
    expect(serverMock).not.toHaveBeenCalled();
  });
});
