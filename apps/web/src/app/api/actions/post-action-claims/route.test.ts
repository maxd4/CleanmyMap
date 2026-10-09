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
}));

describe("GET /api/actions/post-action-claims", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "reviewer-1" });
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0, source: "test" });
    createServerRateLimitResponseMock.mockReturnValue(null);
  });

  it("projects only current reviewer-scoped pending claims", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ participation_id: "claim-1", action_id: "action-1" }], error: null });
    serverMock.mockReturnValue({ rpc });
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/post-action-claims"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledWith("list_pending_post_action_claims_for_reviewer", {
      p_reviewer_id: "reviewer-1",
    });
  });
});
