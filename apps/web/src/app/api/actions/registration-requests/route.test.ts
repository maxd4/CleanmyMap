import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMock, resetApiRouteMocks, serverMock } from "@/__tests__/support/api-route-mocks";


describe("GET /api/actions/registration-requests", () => {
  beforeEach(() => {
    resetApiRouteMocks("reviewer-1");
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
