import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createRequestMock = vi.hoisted(() => vi.fn());
const loadRequestMock = vi.hoisted(() => vi.fn());
const transitionRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/team-join-requests", () => ({
  createSpogomiTeamJoinRequest: createRequestMock,
  loadSpogomiTeamJoinRequestForRequester: loadRequestMock,
  transitionSpogomiTeamJoinRequest: transitionRequestMock,
  SpogomiTeamJoinRequestError: class SpogomiTeamJoinRequestError extends Error { kind = "conflict" as const; },
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }) }));

function requireResponse(response: Response | undefined): Response {
  if (!response) throw new Error("route did not return a response");
  return response;
}

describe("SPOGOMI public team join request", () => {
  const params = { eventId: "00000000-0000-4000-8000-000000000001", teamId: "00000000-0000-4000-8000-000000000002" };

  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    createRequestMock.mockResolvedValue({ id: "request-1", status: "pending", teamId: "team-1" });
    loadRequestMock.mockResolvedValue(null);
    transitionRequestMock.mockResolvedValue({ id: "request-1", status: "cancelled", teamId: "team-1" });
  });

  it("refuses anonymous requests before the team service is reached", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { POST } = await import("./route");
    const response = requireResponse(await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) }));
    expect(response.status).toBe(401);
    expect(createRequestMock).not.toHaveBeenCalled();
  });

  it("allows an authenticated account to create an idempotent pending request", async () => {
    const { POST } = await import("./route");
    const response = requireResponse(await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) }));
    expect(response.status).toBe(201);
    expect(createRequestMock).toHaveBeenCalledWith({ supabase: {}, eventId: params.eventId, teamId: params.teamId, requesterClerkId: "user-1" });
  });

  it("cancels only the requester-owned pending request", async () => {
    loadRequestMock.mockResolvedValueOnce({ id: "request-1", status: "pending", teamId: "team-1" });
    const { DELETE } = await import("./route");
    const response = requireResponse(await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve(params) }));
    expect(response.status).toBe(200);
    expect(transitionRequestMock).toHaveBeenCalledWith(expect.objectContaining({ actorKind: "requester", actorClerkId: "user-1", targetStatus: "cancelled" }));
  });
});
