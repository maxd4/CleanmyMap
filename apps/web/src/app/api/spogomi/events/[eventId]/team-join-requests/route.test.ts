import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserActiveRoleMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const listRequestsMock = vi.hoisted(() => vi.fn());
const transitionRequestMock = vi.hoisted(() => vi.fn());
const TeamJoinRequestErrorMock = vi.hoisted(() => class extends Error {
  kind: "unavailable" | "conflict" | "forbidden" | "invalid";

  constructor(message: string, kind: "unavailable" | "conflict" | "forbidden" | "invalid") {
    super(message);
    this.kind = kind;
  }
});

vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock, getCurrentUserActiveRole: getCurrentUserActiveRoleMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/team-join-requests", () => ({
  listSpogomiTeamJoinRequestsForAdmin: listRequestsMock,
  transitionSpogomiTeamJoinRequest: transitionRequestMock,
  SpogomiTeamJoinRequestError: TeamJoinRequestErrorMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: (access: { status: number }) => new Response(JSON.stringify({ error: "Forbidden" }), { status: access.status }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
  validationErrorResponse: () => new Response(JSON.stringify({ error: "Invalid" }), { status: 400 }),
}));

function requireResponse(response: Response | undefined): Response {
  if (!response) throw new Error("route did not return a response");
  return response;
}

describe("SPOGOMI team join admin queue", () => {
  const eventId = "00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getCurrentUserActiveRoleMock.mockResolvedValue("admin");
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    listRequestsMock.mockResolvedValue([{ id: "request-1", status: "pending", teamId: "team-1" }]);
    transitionRequestMock.mockResolvedValue({ id: "request-1", status: "approved" });
  });

  it("denies an organizer-only account before enumerating private requests", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const { GET } = await import("./route");
    const response = requireResponse(await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(403);
    expect(listRequestsMock).not.toHaveBeenCalled();
  });

  it("denies a non-admin active role even if a lower-level guard was mocked as successful", async () => {
    getCurrentUserActiveRoleMock.mockResolvedValueOnce("coordinateur");
    const { GET } = await import("./route");
    const response = requireResponse(await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(403);
    expect(listRequestsMock).not.toHaveBeenCalled();
  });

  it("stops a rate-limited admin before loading private requests", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const { GET } = await import("./route");
    const response = requireResponse(await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(429);
    expect(getCurrentUserActiveRoleMock).not.toHaveBeenCalled();
    expect(listRequestsMock).not.toHaveBeenCalled();
  });

  it("rejects malformed event parameters before listing or deciding", async () => {
    const { GET, PATCH } = await import("./route");
    const getResponse = requireResponse(await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "invalid" }) }));
    expect(getResponse.status).toBe(400);

    const patchResponse = requireResponse(await PATCH(new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ requestId: eventId, status: "rejected" }),
    }), { params: Promise.resolve({ eventId: "invalid" }) }));
    expect(patchResponse.status).toBe(400);
    expect(transitionRequestMock).not.toHaveBeenCalled();
  });

  it("rejects malformed PATCH JSON before applying a decision", async () => {
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", { method: "PATCH", body: "not-json" }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(400);
    expect(transitionRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", 404],
    ["conflict", 409],
    ["forbidden", 403],
    ["invalid", 400],
  ] as const)("maps team-join service %s failures to HTTP %s", async (kind, status) => {
    transitionRequestMock.mockRejectedValueOnce(new TeamJoinRequestErrorMock("decision failure", kind));
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ requestId: eventId, status: "rejected" }),
    }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(status);
  });

  it("keeps unexpected decision failures behind the generic API error", async () => {
    transitionRequestMock.mockRejectedValueOnce(new Error("database detail"));
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ requestId: eventId, status: "rejected" }),
    }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(500);
  });

  it("lets an active max decide only with a selected roster identity and proof", async () => {
    getCurrentUserActiveRoleMock.mockResolvedValueOnce("max");
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ requestId: "00000000-0000-4000-8000-000000000001", status: "approved", matchedParticipantId: "00000000-0000-4000-8000-000000000002", verificationNote: "Vérification indépendante documentée." }) }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(200);
    expect(transitionRequestMock).toHaveBeenCalledWith(expect.objectContaining({ actorKind: "admin", actorRole: "max", targetStatus: "approved" }));
  });

  it("requires an independent verification note before approval", async () => {
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ requestId: "00000000-0000-4000-8000-000000000001", status: "approved", matchedParticipantId: "00000000-0000-4000-8000-000000000002" }) }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(400);
    expect(transitionRequestMock).not.toHaveBeenCalled();
  });

  it("allows an active admin to reject without selecting a roster identity", async () => {
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ requestId: "00000000-0000-4000-8000-000000000001", status: "rejected" }),
    }), { params: Promise.resolve({ eventId }) }));
    expect(response.status).toBe(200);
    expect(transitionRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      targetStatus: "rejected",
      actorKind: "admin",
      matchedParticipantId: undefined,
      verificationNote: undefined,
    }));
  });
});
