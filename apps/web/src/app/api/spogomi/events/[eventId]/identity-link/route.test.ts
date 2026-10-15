import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const claimSpogomiIdentityLinkMock = vi.hoisted(() => vi.fn());
const loadSpogomiIdentityStateMock = vi.hoisted(() => vi.fn());
const resumeSpogomiIdentityParticipationMock = vi.hoisted(() => vi.fn());
const loadSpogomiEventRecognitionForUserMock = vi.hoisted(() => vi.fn());
const loadAssistanceRequestMock = vi.hoisted(() => vi.fn());
const createAssistanceRequestMock = vi.hoisted(() => vi.fn());
const IdentityLinkErrorMock = vi.hoisted(() => class extends Error {
  kind: "already_linked" | "not_found" | "invalid";

  constructor(message: string, kind: "already_linked" | "not_found" | "invalid") {
    super(message);
    this.kind = kind;
  }
});
const IdentityAssistanceErrorMock = vi.hoisted(() => class extends Error {
  kind: "unavailable" | "conflict" | "invalid";

  constructor(message: string, kind: "unavailable" | "conflict" | "invalid") {
    super(message);
    this.kind = kind;
  }
});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/identity-link", () => ({
  claimSpogomiIdentityLink: claimSpogomiIdentityLinkMock,
  loadSpogomiIdentityState: loadSpogomiIdentityStateMock,
  resumeSpogomiIdentityParticipation: resumeSpogomiIdentityParticipationMock,
  SpogomiIdentityLinkError: IdentityLinkErrorMock,
}));
vi.mock("@/lib/spogomi/recognition-service", () => ({
  loadSpogomiEventRecognitionForUser: loadSpogomiEventRecognitionForUserMock,
}));
vi.mock("@/lib/spogomi/identity-assistance", () => ({
  loadSpogomiIdentityAssistanceRequestForRequester: loadAssistanceRequestMock,
  createSpogomiIdentityAssistanceRequest: createAssistanceRequestMock,
  SpogomiIdentityAssistanceError: IdentityAssistanceErrorMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
  validationErrorResponse: (details: unknown) => new Response(JSON.stringify({ error: details }), { status: 400 }),
}));

function requireResponse(response: Response | undefined): Response {
  if (!response) throw new Error("Expected a response");
  return response;
}

describe("SPOGOMI identity-link recovery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    loadSpogomiIdentityStateMock.mockResolvedValue({
      state: "identity_verified",
      participantId: "participant-1",
      actionId: "action-1",
      attendanceStatus: "present",
      participation: { status: "not_requested", store: "action_registrations" },
    });
    claimSpogomiIdentityLinkMock.mockResolvedValue({
      linkStatus: "linked",
      participantId: "participant-1",
      actionId: "action-1",
      attendanceStatus: "present",
    });
    resumeSpogomiIdentityParticipationMock.mockResolvedValue({
      state: "participation_pending",
      participantId: "participant-1",
      actionId: "action-1",
      attendanceStatus: "present",
      participation: { status: "pending", store: "action_registrations" },
    });
    loadSpogomiEventRecognitionForUserMock.mockResolvedValue({ status: "available", awards: [] });
    loadAssistanceRequestMock.mockResolvedValue(null);
    createAssistanceRequestMock.mockResolvedValue({ id: "request-1", status: "pending" });
  });

  it("links with the one-time code without requesting participation in the same call", async () => {
    const { POST } = await import("./route");
    if (!POST) throw new Error("POST route handler is missing");
    const response = await POST(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link", {
        method: "POST",
        body: JSON.stringify({ code: "SPOGOMI-1234567890123456" }),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!response) throw new Error("POST route did not return a response");

    expect(response.status).toBe(200);
    expect(claimSpogomiIdentityLinkMock).toHaveBeenCalledWith(expect.anything(), {
      eventId: "event-1",
      code: "SPOGOMI-1234567890123456",
      clerkId: "user-1",
    });
    expect(resumeSpogomiIdentityParticipationMock).not.toHaveBeenCalled();
  });

  it("resumes from the verified server-side identity without asking for the old code", async () => {
    const { POST } = await import("./route");
    if (!POST) throw new Error("POST route handler is missing");
    const response = await POST(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!response) throw new Error("POST route did not return a response");

    expect(response.status).toBe(200);
    expect(resumeSpogomiIdentityParticipationMock).toHaveBeenCalledWith(expect.anything(), {
      eventId: "event-1",
      clerkId: "user-1",
    });
    expect(claimSpogomiIdentityLinkMock).not.toHaveBeenCalled();
  });

  it("returns the private current state for an authenticated account and denies anonymous access", async () => {
    const { GET } = await import("./route");
    if (!GET) throw new Error("GET route handler is missing");
    const stateResponse = await GET(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link"),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!stateResponse) throw new Error("GET route did not return a response");
    expect(stateResponse.status).toBe(200);
    expect(loadSpogomiIdentityStateMock).toHaveBeenCalledWith(expect.anything(), {
      eventId: "event-1",
      clerkId: "user-1",
    });

    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const denied = await GET(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link"),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!denied) throw new Error("GET route did not return a response");
    expect(denied.status).toBe(401);
    expect(loadSpogomiIdentityStateMock).toHaveBeenCalledTimes(1);
  });

  it("returns only the requester assistance projection in the identity-link state", async () => {
    loadAssistanceRequestMock.mockResolvedValueOnce({
      id: "request-1",
      providedContext: "Contexte fourni par le demandeur.",
      status: "treated",
      createdAt: "2026-10-15T09:00:00.000Z",
    });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link"),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!response) throw new Error("GET route did not return a response");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.assistance).toEqual({
      id: "request-1",
      providedContext: "Contexte fourni par le demandeur.",
      status: "treated",
      createdAt: "2026-10-15T09:00:00.000Z",
    });
    expect(body.assistance).not.toHaveProperty("matchedParticipantId");
    expect(body.assistance).not.toHaveProperty("verificationNote");
    expect(body.assistance).not.toHaveProperty("resolutionNote");
  });

  it("submits assistance without claiming identity or resuming participation", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spogomi/events/event-1/identity-link", {
        method: "POST",
        body: JSON.stringify({ assistance: true, context: "Je peux confirmer ma présence hors bande." }),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );
    if (!response) throw new Error("POST route did not return a response");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assistance: { id: "request-1", status: "pending" } });
    expect(createAssistanceRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "event-1",
      requesterClerkId: "user-1",
      providedContext: "Je peux confirmer ma présence hors bande.",
      invitationToken: undefined,
    }));
    expect(claimSpogomiIdentityLinkMock).not.toHaveBeenCalled();
    expect(resumeSpogomiIdentityParticipationMock).not.toHaveBeenCalled();
  });

  it("stops a rate-limited account and malformed bodies before identity services", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const { POST } = await import("./route");
    const limited = requireResponse(await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(limited.status).toBe(429);
    expect(resumeSpogomiIdentityParticipationMock).not.toHaveBeenCalled();

    const malformed = requireResponse(await POST(new Request("http://localhost", { method: "POST", body: "not-json" }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(malformed.status).toBe(400);
    expect(claimSpogomiIdentityLinkMock).not.toHaveBeenCalled();

    const conflicting = requireResponse(await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "SPOGOMI-1234567890123456", assistance: true }) }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(conflicting.status).toBe(400);
    expect(createAssistanceRequestMock).not.toHaveBeenCalled();
  });

  it("does not query recognition when the identity has no participant", async () => {
    loadSpogomiIdentityStateMock.mockResolvedValueOnce({
      state: "unmatched",
      participantId: null,
      actionId: null,
      attendanceStatus: null,
      participation: { status: "not_requested", store: "action_registrations" },
    });
    const { GET } = await import("./route");
    const response = requireResponse(await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(response.status).toBe(200);
    expect(loadSpogomiEventRecognitionForUserMock).not.toHaveBeenCalled();
  });

  it.each([
    ["already_linked", 409],
    ["not_found", 404],
    ["invalid", 400],
  ] as const)("maps identity-link %s failures to HTTP %s", async (kind, status) => {
    claimSpogomiIdentityLinkMock.mockRejectedValueOnce(new IdentityLinkErrorMock("link failure", kind));
    const { POST } = await import("./route");
    const response = requireResponse(await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ code: "SPOGOMI-1234567890123456" }),
    }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(response.status).toBe(status);
  });

  it.each([
    ["unavailable", 404],
    ["conflict", 409],
    ["invalid", 400],
  ] as const)("maps assistance %s failures to HTTP %s", async (kind, status) => {
    createAssistanceRequestMock.mockRejectedValueOnce(new IdentityAssistanceErrorMock("assistance failure", kind));
    const { POST } = await import("./route");
    const response = requireResponse(await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ assistance: true }),
    }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(response.status).toBe(status);
  });

  it("keeps unexpected identity failures behind the generic API error", async () => {
    resumeSpogomiIdentityParticipationMock.mockRejectedValueOnce(new Error("database detail"));
    const { POST } = await import("./route");
    const response = requireResponse(await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ eventId: "event-1" }) }));
    expect(response.status).toBe(500);
  });
});
