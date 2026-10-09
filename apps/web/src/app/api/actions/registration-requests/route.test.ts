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
}));

describe("GET /api/actions/registration-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "reviewer-1" });
  });

  it("projects only canonical pending requests for the authenticated reviewer", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ registration_id: "11111111-1111-4111-8111-111111111111", action_id: "action-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("list_pending_action_registration_requests_for_reviewer", {
      p_reviewer_id: "reviewer-1",
    });
  });

  it("refuses unauthenticated reads", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(401);
    expect(serverMock).not.toHaveBeenCalled();
  });
});
