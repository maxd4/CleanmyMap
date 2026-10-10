import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiRouteMocks, serverMock } from "@/__tests__/support/api-route-mocks";


describe("GET /api/actions/post-action-claims", () => {
  beforeEach(() => {
    resetApiRouteMocks("reviewer-1");
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
