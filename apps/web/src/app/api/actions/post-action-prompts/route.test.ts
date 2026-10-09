import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("Invalid", { status: 400 })),
}));

describe("/api/actions/post-action-prompts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "recipient-1" });
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0, source: "test" });
    createServerRateLimitResponseMock.mockReturnValue(null);
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
