import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadSpogomiEventForOrganizerMock = vi.hoisted(() => vi.fn());
const issueInvitationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventForOrganizer: loadSpogomiEventForOrganizerMock }));
vi.mock("@/lib/spogomi/identity-assistance", () => ({ issueSpogomiIdentityAssistanceInvitation: issueInvitationMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
}));

const params = { eventId: "event-1" };

function request() {
  return new Request("https://cleanmymap.example/api/spogomi/events/event-1/identity-assistance/invitation", { method: "POST" });
}

describe("POST /api/spogomi/events/:eventId/identity-assistance/invitation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({ privileged: true });
    loadSpogomiEventForOrganizerMock.mockResolvedValue({ id: "event-1", action_id: "action-1" });
    issueInvitationMock.mockResolvedValue({ token: "fixture", expiresAt: "2026-10-16T10:00:00.000Z" });
  });

  it("refuses anonymous access before touching the private organizer services", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { POST } = await import("./route");

    const response = await POST(request(), { params: Promise.resolve(params) });

    expect(response.status).toBe(401);
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
    expect(loadSpogomiEventForOrganizerMock).not.toHaveBeenCalled();
    expect(issueInvitationMock).not.toHaveBeenCalled();
  });

  it("stops a rate-limited organizer before loading the event", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const { POST } = await import("./route");

    const response = await POST(request(), { params: Promise.resolve(params) });

    expect(response.status).toBe(429);
    expect(loadSpogomiEventForOrganizerMock).not.toHaveBeenCalled();
  });

  it("does not issue an invitation when the organizer scope is forbidden or missing", async () => {
    const { POST } = await import("./route");

    loadSpogomiEventForOrganizerMock.mockResolvedValueOnce(false);
    await expect(POST(request(), { params: Promise.resolve(params) })).resolves.toHaveProperty("status", 403);

    loadSpogomiEventForOrganizerMock.mockResolvedValueOnce(null);
    await expect(POST(request(), { params: Promise.resolve(params) })).resolves.toHaveProperty("status", 404);

    expect(issueInvitationMock).not.toHaveBeenCalled();
  });

  it("returns a manual private invitation URL without exposing organizer data", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(), { params: Promise.resolve(params) });
    const body = await response.json();

    expect(response.status).toBe(200);
    const expectedUrl = new URL("https://cleanmymap.example/spogomi/assistance");
    expectedUrl.searchParams.set("eventId", "event-1");
    expectedUrl.searchParams.set("token", "fixture");
    expect(body).toEqual({
      status: "issued",
      url: expectedUrl.toString(),
      expiresAt: "2026-10-16T10:00:00.000Z",
      delivery: "manual",
      warning: "Ce lien est privé et à remettre directement à la personne concernée.",
    });
    expect(issueInvitationMock).toHaveBeenCalledWith({ supabase: { privileged: true }, eventId: "event-1", organizerId: "organizer-1" });
    expect(body).not.toHaveProperty("organizerId");
  });

  it("converts invitation issuance failures to the bounded API error", async () => {
    issueInvitationMock.mockRejectedValueOnce(new Error("private provider detail"));
    const { POST } = await import("./route");

    const response = await POST(request(), { params: Promise.resolve(params) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal error" });
  });
});
