import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("Invalid", { status: 400 })),
}));

describe("/api/actions/invitations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "recipient-1" });
  });

  it("refuses unauthenticated reads", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(401);
    expect(serverMock).not.toHaveBeenCalled();
  });

  it("loads decisions for the authenticated recipient only", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ registration_id: "11111111-1111-4111-8111-111111111111", action_id: "action-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });
    const { GET } = await import("./route");
    const response = await GET();
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
