import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const listRequesterMock = vi.hoisted(() => vi.fn());
const createRequesterMock = vi.hoisted(() => vi.fn());
const cancelRequesterMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const AdmissionRequestErrorMock = vi.hoisted(() => class extends Error {
  kind: "unavailable" | "conflict" | "forbidden" | "invalid";

  constructor(message: string, kind: "unavailable" | "conflict" | "forbidden" | "invalid") {
    super(message);
    this.kind = kind;
  }
});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/admission-requests", () => ({
  listSpogomiAdmissionRequestsForRequester: listRequesterMock,
  createSpogomiAdmissionRequest: createRequesterMock,
  cancelSpogomiAdmissionRequest: cancelRequesterMock,
  SpogomiAdmissionRequestError: AdmissionRequestErrorMock,
}));

function request() {
  return new Request("http://localhost/api/spogomi/events/11111111-1111-4111-8111-111111111111/admission-requests");
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/spogomi/events/11111111-1111-4111-8111-111111111111/admission-requests", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requireResponse(response: Response | undefined): Response {
  if (!response) throw new Error("Expected a response");
  return response;
}

describe("GET /api/spogomi/events/:eventId/admission-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "requester-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    createRequesterMock.mockResolvedValue({
      id: "request-1", requestKind: "registration", divisionId: "division-1", teamId: null,
      providedContext: "Mon contexte", status: "pending", decisionMessage: null,
      decidedAt: null, createdAt: "2026-10-15T10:00:00.000Z",
    });
    cancelRequesterMock.mockResolvedValue({
      id: "request-1", requestKind: "registration", divisionId: "division-1", teamId: null,
      providedContext: "Mon contexte", status: "cancelled", decisionMessage: null,
      decidedAt: "2026-10-15T11:00:00.000Z", createdAt: "2026-10-15T10:00:00.000Z",
    });
    listRequesterMock.mockResolvedValue([{
      id: "request-1",
      requestKind: "registration",
      divisionId: "division-1",
      teamId: null,
      providedContext: "Mon contexte",
      status: "pending",
      decisionMessage: null,
      decidedAt: null,
      createdAt: "2026-10-15T10:00:00.000Z",
    }]);
  });

  it("keeps the personal read authenticated and requester-scoped", async () => {
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    if (!response) throw new Error("Expected a response");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listRequesterMock).toHaveBeenCalledWith(expect.anything(), {
      eventId: "11111111-1111-4111-8111-111111111111",
      requesterClerkId: "requester-1",
    });
    expect(JSON.stringify(body)).not.toContain("matchedParticipantId");
    expect(JSON.stringify(body)).not.toContain("verificationNote");
    expect(JSON.stringify(body)).not.toContain("resolutionNote");
  });

  it("rejects unauthenticated reads before touching the requester projection", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(401);
    expect(listRequesterMock).not.toHaveBeenCalled();
  });

  it("stops a rate-limited requester before any private service", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const { GET } = await import("./route");

    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));

    expect(response.status).toBe(429);
    expect(listRequesterMock).not.toHaveBeenCalled();
  });

  it("keeps POST responses requester-scoped and date-persistent", async () => {
    const { POST } = await import("./route");
    const response = await POST(jsonRequest("POST", {
      requestKind: "registration",
      divisionId: "22222222-2222-4222-8222-222222222222",
      providedContext: "Mon contexte",
    }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) });
    if (!response) throw new Error("Expected a response");
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createRequesterMock).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "11111111-1111-4111-8111-111111111111",
      requesterClerkId: "requester-1",
    }));
    expect(body.request.createdAt).toBe("2026-10-15T10:00:00.000Z");
    expect(JSON.stringify(body)).not.toContain("matchedParticipantId");
    expect(JSON.stringify(body)).not.toContain("verificationNote");
    expect(JSON.stringify(body)).not.toContain("resolutionNote");
  });

  it("keeps DELETE responses requester-scoped and idempotent at the route boundary", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(jsonRequest("DELETE", { requestId: "33333333-3333-4333-8333-333333333333" }), {
      params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }),
    });
    if (!response) throw new Error("Expected a response");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cancelRequesterMock).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "11111111-1111-4111-8111-111111111111",
      requestId: "33333333-3333-4333-8333-333333333333",
      requesterClerkId: "requester-1",
    }));
    expect(body.request.status).toBe("cancelled");
    expect(JSON.stringify(body)).not.toContain("matchedParticipantId");
    expect(JSON.stringify(body)).not.toContain("verificationNote");
    expect(JSON.stringify(body)).not.toContain("resolutionNote");
  });

  it("rejects malformed params and bodies before creating or cancelling a request", async () => {
    const { POST, DELETE } = await import("./route");
    const invalidParams = requireResponse(await POST(jsonRequest("POST", { requestKind: "registration", divisionId: "22222222-2222-4222-8222-222222222222" }), { params: Promise.resolve({ eventId: "invalid" }) }));
    expect(invalidParams.status).toBe(422);

    const invalidBody = requireResponse(await POST(new Request(request().url, { method: "POST", body: "not-json" }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(invalidBody.status).toBe(422);

    const invalidCancel = requireResponse(await DELETE(new Request(request().url, { method: "DELETE", body: JSON.stringify({}) }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(invalidCancel.status).toBe(422);
    expect(createRequesterMock).not.toHaveBeenCalled();
    expect(cancelRequesterMock).not.toHaveBeenCalled();
  });

  it("keeps an already effective creation at HTTP 200", async () => {
    createRequesterMock.mockResolvedValueOnce({
      id: "request-1", requestKind: "presence_regularization", divisionId: "division-1", teamId: "team-1",
      providedContext: undefined, status: "approved", decisionMessage: "Présence confirmée.",
      decidedAt: "2026-10-15T11:00:00.000Z", createdAt: "2026-10-15T10:00:00.000Z",
    });
    const { POST } = await import("./route");
    const response = requireResponse(await POST(jsonRequest("POST", {
      requestKind: "presence_regularization",
      divisionId: "22222222-2222-4222-8222-222222222222",
      teamId: "33333333-3333-4333-8333-333333333333",
    }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));

    expect(response.status).toBe(200);
  });

  it.each([
    ["unavailable", 404],
    ["conflict", 409],
    ["forbidden", 403],
    ["invalid", 400],
  ] as const)("maps requester service %s failures to HTTP %s", async (kind, status) => {
    listRequesterMock.mockRejectedValueOnce(new AdmissionRequestErrorMock("request failure", kind));
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(status);
  });

  it("keeps unexpected requester failures behind the generic API error", async () => {
    listRequesterMock.mockRejectedValueOnce(new Error("database detail"));
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(500);
  });
});
