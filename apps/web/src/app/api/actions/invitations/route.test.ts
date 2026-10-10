import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMock, createServerRateLimitResponseMock, resetApiRouteMocks, serverMock, verifyRateLimitMock } from "@/__tests__/support/api-route-mocks";


describe("/api/actions/invitations", () => {
  beforeEach(() => {
    resetApiRouteMocks("recipient-1");
  });

  it("refuses unauthenticated reads", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { GET } = await import("./route");
    expect((await GET(new Request("http://localhost/api/actions/invitations"))).status).toBe(401);
    expect(serverMock).not.toHaveBeenCalled();
  });

  it("loads decisions for the authenticated recipient only", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ registration_id: "11111111-1111-4111-8111-111111111111", action_id: "action-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/invitations"));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("list_pending_action_invitations_for_recipient", {
      p_recipient_id: "recipient-1",
    });
  });

  it("passes the recipient-bound decision to the atomic RPC", async () => {
    const registrationId = "11111111-1111-4111-8111-111111111111";
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: "accepted", registration_id: registrationId, action_id: "action-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/actions/invitations", {
      method: "PATCH",
      body: JSON.stringify({ registrationId, decision: "accept" }),
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("respond_to_action_invitation", {
      p_registration_id: registrationId,
      p_recipient_id: "recipient-1",
      p_decision: "accept",
    });
  });

  it("stops repeated reads through the canonical rate limiter", async () => {
    verifyRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 17, source: "distributed" });
    createServerRateLimitResponseMock.mockReturnValueOnce(new Response("Too many requests", { status: 429 }));
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/invitations"));

    expect(response.status).toBe(429);
    expect(authMock).not.toHaveBeenCalled();
    expect(serverMock).not.toHaveBeenCalled();
    expect(verifyRateLimitMock).toHaveBeenCalledWith(expect.any(Request), { limit: 30, window: 60 });
  });

  it("passes a recipient-bound rejection to the atomic RPC", async () => {
    const registrationId = "22222222-2222-4222-8222-222222222222";
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: "rejected", registration_id: registrationId, action_id: "action-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/actions/invitations", {
      method: "PATCH",
      body: JSON.stringify({ registrationId, decision: "reject" }),
    }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("respond_to_action_invitation", {
      p_registration_id: registrationId,
      p_recipient_id: "recipient-1",
      p_decision: "reject",
    });
  });
});
