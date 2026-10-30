import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const acceptActionBuddyProposalMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) => Response.json({ details }, { status: 422 }),
}));
vi.mock("@/lib/actions/action-buddy", () => ({ acceptActionBuddyProposal: acceptActionBuddyProposalMock }));

describe("POST /api/actions/[actionId]/buddy/proposals/[proposalId]/accept", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "requester-session" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({ client: "service" });
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
    acceptActionBuddyProposalMock.mockResolvedValue({ status: "matched", request_id: "request-1", proposal_id: "proposal-1" });
  });

  it("requires authentication before invoking the matching service", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", proposalId: "proposal-1" }) });
    expect(response.status).toBe(401);
    expect(acceptActionBuddyProposalMock).not.toHaveBeenCalled();
  });

  it("passes only the session requester to the transactional service", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ requesterUserId: "forged" }) }), { params: Promise.resolve({ actionId: " action-1 ", proposalId: " proposal-1 " }) });
    expect(response.status).toBe(200);
    expect(acceptActionBuddyProposalMock).toHaveBeenCalledWith({ client: "service" }, {
      actionId: "action-1",
      proposalId: "proposal-1",
      requesterUserId: "requester-session",
    });
  });

  it("delegates a transactional conflict to the generic API boundary", async () => {
    const error = new Error("Action buddy conflict: mentor already matched.");
    acceptActionBuddyProposalMock.mockRejectedValue(error);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", proposalId: "proposal-1" }) });
    expect(response.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledWith(error, "POST /api/actions/[actionId]/buddy/proposals/[proposalId]/accept");
  });
});
