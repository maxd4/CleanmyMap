import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const claimSpogomiIdentityLinkMock = vi.hoisted(() => vi.fn());
const loadSpogomiIdentityStateMock = vi.hoisted(() => vi.fn());
const resumeSpogomiIdentityParticipationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/identity-link", () => ({
  claimSpogomiIdentityLink: claimSpogomiIdentityLinkMock,
  loadSpogomiIdentityState: loadSpogomiIdentityStateMock,
  resumeSpogomiIdentityParticipation: resumeSpogomiIdentityParticipationMock,
  SpogomiIdentityLinkError: class SpogomiIdentityLinkError extends Error {},
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
  validationErrorResponse: (details: unknown) => new Response(JSON.stringify({ error: details }), { status: 400 }),
}));

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
});
