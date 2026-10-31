import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const rejectActionBuddyProposalMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) => Response.json({ details }, { status: 422 }),
}));
vi.mock("@/lib/actions/action-buddy", () => ({ rejectActionBuddyProposal: rejectActionBuddyProposalMock }));

describe("POST /api/actions/[actionId]/buddy/proposals/[proposalId]/reject", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "requester-session" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({ client: "service" });
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
    rejectActionBuddyProposalMock.mockResolvedValue({
      proposal: {
        id: "proposal-1",
        request_id: "request-1",
        mentor_user_id: "mentor-private-id",
        status: "declined",
        created_at: "2998-12-03T10:00:00.000Z",
        resolved_at: "2998-12-04T10:00:00.000Z",
      },
      alreadyDeclined: false,
    });
  });

  it("rejects anonymous decisions before the service boundary", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", proposalId: "proposal-1" }) });
    expect(response.status).toBe(401);
    expect(rejectActionBuddyProposalMock).not.toHaveBeenCalled();
  });

  it("passes the session requester and action-scoped identifiers only", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ requesterUserId: "forged" }) }), { params: Promise.resolve({ actionId: " action-1 ", proposalId: " proposal-1 " }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(rejectActionBuddyProposalMock).toHaveBeenCalledWith({ client: "service" }, {
      actionId: "action-1",
      proposalId: "proposal-1",
      requesterUserId: "requester-session",
    });
  });

  it("projects the first rejection without third-party identity or internal proposal metadata", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", proposalId: "proposal-1" }) });
    const body = await response.json();

    expect(body).toEqual({ status: "ok", proposal: { id: "proposal-1", status: "declined" }, alreadyDeclined: false });
    expect(body.proposal).not.toHaveProperty("mentor_user_id");
    expect(body.proposal).not.toHaveProperty("request_id");
    expect(body.proposal).not.toHaveProperty("created_at");
    expect(body.proposal).not.toHaveProperty("resolved_at");
  });

  it("keeps the replay of a rejection on the same minimal projection", async () => {
    rejectActionBuddyProposalMock.mockResolvedValueOnce({
      proposal: {
        id: "proposal-1",
        request_id: "request-1",
        mentor_user_id: "mentor-private-id",
        status: "declined",
        created_at: "2998-12-03T10:00:00.000Z",
        resolved_at: "2998-12-04T10:00:00.000Z",
      },
      alreadyDeclined: true,
    });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", proposalId: "proposal-1" }) });
    const body = await response.json();

    expect(body).toEqual({ status: "ok", proposal: { id: "proposal-1", status: "declined" }, alreadyDeclined: true });
    expect(body.proposal).not.toHaveProperty("mentor_user_id");
    expect(body.proposal).not.toHaveProperty("request_id");
    expect(body.proposal).not.toHaveProperty("created_at");
    expect(body.proposal).not.toHaveProperty("resolved_at");
  });
});
