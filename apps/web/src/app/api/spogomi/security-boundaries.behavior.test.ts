import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const event = {
    id: "event-a",
    action_id: "action-a",
    event_slug: "paris-2026",
    name: "SPOGOMI Paris",
    state: "draft",
  };
  return {
    event,
    requireAuthenticatedAccess: vi.fn(),
    getSupabaseServerClient: vi.fn(),
    enforceServerRateLimit: vi.fn(),
    enforceServerRateLimitForAuthenticatedUser: vi.fn(),
    loadSpogomiEventForOrganizer: vi.fn(),
    updateSpogomiEvent: vi.fn(),
    loadSpogomiManagementProjection: vi.fn(),
    loadAuthorizedSpogomiEvent: vi.fn(),
    issueSpogomiTeamAccessGrant: vi.fn(),
    revokeSpogomiTeamAccessGrant: vi.fn(),
    consumeSpogomiTeamAccessToken: vi.fn(),
    loadSpogomiTeamResultForm: vi.fn(),
    saveSpogomiTeamSubmission: vi.fn(),
    assignSpogomiObserver: vi.fn(),
    assignSpogomiReferee: vi.fn(),
    assignSpogomiCheckin: vi.fn(),
    revokeSpogomiObserver: vi.fn(),
    revokeSpogomiReferee: vi.fn(),
    revokeSpogomiCheckin: vi.fn(),
    setSpogomiOperationalAccess: vi.fn(),
    loadSpogomiEventResultReviews: vi.fn(),
    resolveSpogomiReviewerRole: vi.fn(),
    reviewSpogomiTeamSubmission: vi.fn(),
    loadSpogomiFieldOperationsAccess: vi.fn(),
    loadSpogomiFieldOperationsDashboard: vi.fn(),
    callSpogomiFieldOperation: vi.fn(),
    issueSpogomiIdentityAssistanceInvitation: vi.fn(),
    handleApiError: vi.fn((error: unknown) => new Response(JSON.stringify({ error: String(error) }), { status: 500 })),
    validationErrorResponse: vi.fn(() => new Response(JSON.stringify({ error: "invalid" }), { status: 422 })),
  };
});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimit: mocks.enforceServerRateLimit,
  enforceServerRateLimitForAuthenticatedUser: mocks.enforceServerRateLimitForAuthenticatedUser,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: mocks.handleApiError,
  validationErrorResponse: mocks.validationErrorResponse,
}));
vi.mock("@/lib/spogomi/preparation-service", () => ({
  loadSpogomiEventForOrganizer: mocks.loadSpogomiEventForOrganizer,
  updateSpogomiEvent: mocks.updateSpogomiEvent,
}));
vi.mock("@/lib/spogomi/management-projection", () => ({ loadSpogomiManagementProjection: mocks.loadSpogomiManagementProjection }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/team-access", () => ({
  consumeSpogomiTeamAccessToken: mocks.consumeSpogomiTeamAccessToken,
  issueSpogomiTeamAccessGrant: mocks.issueSpogomiTeamAccessGrant,
  revokeSpogomiTeamAccessGrant: mocks.revokeSpogomiTeamAccessGrant,
  SPOGOMI_TEAM_SESSION_COOKIE: "spogomi_team_session",
}));
vi.mock("@/lib/spogomi/result-service", () => ({
  loadSpogomiTeamResultForm: mocks.loadSpogomiTeamResultForm,
  saveSpogomiTeamSubmission: mocks.saveSpogomiTeamSubmission,
  assignSpogomiObserver: mocks.assignSpogomiObserver,
  assignSpogomiReferee: mocks.assignSpogomiReferee,
  assignSpogomiCheckin: mocks.assignSpogomiCheckin,
  revokeSpogomiObserver: mocks.revokeSpogomiObserver,
  revokeSpogomiReferee: mocks.revokeSpogomiReferee,
  revokeSpogomiCheckin: mocks.revokeSpogomiCheckin,
  loadSpogomiEventResultReviews: mocks.loadSpogomiEventResultReviews,
  resolveSpogomiReviewerRole: mocks.resolveSpogomiReviewerRole,
  reviewSpogomiTeamSubmission: mocks.reviewSpogomiTeamSubmission,
}));
vi.mock("@/lib/spogomi/field-operations-service", () => ({
  setSpogomiOperationalAccess: mocks.setSpogomiOperationalAccess,
  loadSpogomiFieldOperationsAccess: mocks.loadSpogomiFieldOperationsAccess,
  loadSpogomiFieldOperationsDashboard: mocks.loadSpogomiFieldOperationsDashboard,
  callSpogomiFieldOperation: mocks.callSpogomiFieldOperation,
  assertSpogomiFieldCapability: (access: { capabilities: Set<string> } | null, capability: string) => {
    if (!access?.capabilities.has(capability)) throw new Error("SPOGOMI field operation is forbidden.");
  },
}));
vi.mock("@/lib/spogomi/identity-assistance", () => ({
  issueSpogomiIdentityAssistanceInvitation: mocks.issueSpogomiIdentityAssistanceInvitation,
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => ({ value: "opaque-session" })) })),
}));

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const eventContext = { params: Promise.resolve({ eventId: "event-a" }) };
const teamContext = { params: Promise.resolve({ eventId: "event-a", teamId: "team-a" }) };
const uuidEventContext = { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) };

describe("SPOGOMI HTTP security boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({ id: "controlled-supabase" });
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-a" });
    mocks.enforceServerRateLimit.mockResolvedValue(null);
    mocks.enforceServerRateLimitForAuthenticatedUser.mockResolvedValue(null);
    mocks.loadSpogomiEventForOrganizer.mockResolvedValue(mocks.event);
    mocks.updateSpogomiEvent.mockResolvedValue(mocks.event);
    mocks.loadSpogomiManagementProjection.mockResolvedValue({ event: mocks.event, participants: [], teams: [] });
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: { id: "controlled-supabase" }, authorized: { event: mocks.event } });
    mocks.issueSpogomiTeamAccessGrant.mockResolvedValue({ token: "opaque-grant", expiresAt: "2026-11-01T00:00:00.000Z" });
    mocks.consumeSpogomiTeamAccessToken.mockResolvedValue({ eventSlug: "paris-2026", sessionToken: "opaque-session" });
    mocks.loadSpogomiTeamResultForm.mockResolvedValue({ event: mocks.event, team: { id: "team-a" }, items: [] });
    mocks.saveSpogomiTeamSubmission.mockResolvedValue({ status: "saved" });
    mocks.assignSpogomiObserver.mockResolvedValue({ clerkId: "observer-a", role: "observer" });
    mocks.assignSpogomiReferee.mockResolvedValue({ clerkId: "referee-a", role: "referee" });
    mocks.assignSpogomiCheckin.mockResolvedValue({ clerkId: "checkin-a", role: "checkin" });
    mocks.resolveSpogomiReviewerRole.mockResolvedValue("referee");
    mocks.reviewSpogomiTeamSubmission.mockResolvedValue({ status: "certified" });
    mocks.loadSpogomiEventResultReviews.mockResolvedValue([]);
    mocks.loadSpogomiFieldOperationsAccess.mockResolvedValue({ isOrganizer: true, capabilities: new Set(["timing", "arrival", "weighing", "measurement_entry", "arbitration", "certification"]) });
    mocks.loadSpogomiFieldOperationsDashboard.mockResolvedValue({ operations: [], returns: [], incidents: [], measurements: [], divisions: [], teams: [], categories: [] });
    mocks.callSpogomiFieldOperation.mockResolvedValue({ changed: true });
    mocks.issueSpogomiIdentityAssistanceInvitation.mockResolvedValue({ token: "opaque-invitation", expiresAt: "2026-11-01T00:00:00.000Z" });
  });

  it("refuses anonymous and cross-event management access before the roster projection", async () => {
    const route = await import("./events/[eventId]/route");

    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await route.GET(new Request("http://localhost"), eventContext)).status).toBe(401);
    expect(mocks.loadSpogomiEventForOrganizer).not.toHaveBeenCalled();

    mocks.loadSpogomiEventForOrganizer.mockResolvedValueOnce(false);
    expect((await route.GET(new Request("http://localhost"), uuidEventContext)).status).toBe(403);
    expect(mocks.loadSpogomiManagementProjection).not.toHaveBeenCalled();
  });

  it("uses the authenticated identity and ignores client role or actor fields", async () => {
    const route = await import("./events/[eventId]/route");
    const response = await route.PATCH(jsonRequest("http://localhost", {
      name: "SPOGOMI Paris",
      activeRole: "admin",
      actorClerkId: "attacker",
    }, "PATCH"), eventContext);
    expect(response.status).toBe(200);
    expect(mocks.updateSpogomiEvent).toHaveBeenCalledWith(expect.objectContaining({ actorClerkId: "organizer-a" }));
    expect(mocks.updateSpogomiEvent.mock.calls[0]?.[0].input).not.toHaveProperty("activeRole");
    expect(mocks.updateSpogomiEvent.mock.calls[0]?.[0].input).not.toHaveProperty("actorClerkId");
  });

  it("rate-limits team credential issuance before touching the grant secret", async () => {
    const route = await import("./events/[eventId]/teams/[teamId]/access/route");
    mocks.enforceServerRateLimitForAuthenticatedUser.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    expect((await route.POST(new Request("http://localhost"), teamContext)).status).toBe(429);
    expect(mocks.loadAuthorizedSpogomiEvent).not.toHaveBeenCalled();
    expect(mocks.issueSpogomiTeamAccessGrant).not.toHaveBeenCalled();

    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({
      supabase: { id: "controlled-supabase" },
      authorized: { response: new Response("forbidden", { status: 403 }) },
    });
    expect((await route.POST(new Request("http://localhost"), teamContext)).status).toBe(403);
    expect(mocks.issueSpogomiTeamAccessGrant).not.toHaveBeenCalled();
  });

  it("does not consume a team token when rate-limited and never redirects with the token", async () => {
    const route = await import("./team-access/route");
    mocks.enforceServerRateLimit.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    const teamToken = "a".repeat(40);
    const limitedUrl = new URL("http://localhost/api/spogomi/team-access?eventSlug=paris-2026");
    limitedUrl.searchParams.set("token", teamToken);
    expect((await route.GET(new Request(limitedUrl))).status).toBe(429);
    expect(mocks.consumeSpogomiTeamAccessToken).not.toHaveBeenCalled();

    const response = await route.GET(new Request(limitedUrl));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/spogomi/paris-2026/equipe");
    expect(response.headers.get("location")).not.toContain(teamToken);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("returns no team data for an expired or revoked session and never calls the save service on invalid input", async () => {
    const route = await import("./team-form/route");
    mocks.loadSpogomiTeamResultForm.mockResolvedValueOnce(null);
    expect((await route.GET(new Request("http://localhost"))).status).toBe(401);

    const invalid = await route.POST(jsonRequest("http://localhost", { status: "submitted" }));
    expect(invalid.status).toBe(422);
    expect(mocks.saveSpogomiTeamSubmission).not.toHaveBeenCalled();
  });

  it("rejects reviewer role escalation in the handler and binds review to the authenticated user", async () => {
    const reviewers = await import("./events/[eventId]/reviewers/route");
    const escalated = await reviewers.POST(jsonRequest("http://localhost", {
      clerkId: "observer-a",
      role: "observer",
      actorClerkId: "attacker",
    }), uuidEventContext);
    expect(escalated.status).toBe(422);
    expect(mocks.assignSpogomiObserver).not.toHaveBeenCalled();

    const results = await import("./events/[eventId]/results/route");
    const response = await results.POST(jsonRequest("http://localhost", {
      teamId: "11111111-1111-4111-8111-111111111111",
      submissionId: "22222222-2222-4222-8222-222222222222",
      decision: "certified",
      reason: null,
    }), eventContext);
    expect(response.status).toBe(200);
    expect(mocks.reviewSpogomiTeamSubmission).toHaveBeenCalledWith(expect.objectContaining({ reviewerClerkId: "organizer-a", actorKind: "referee" }));
  });

  it("fails closed for a field-role without the required capability before the dashboard or RPC", async () => {
    const route = await import("./events/[eventId]/field-operations/route");
    mocks.loadSpogomiFieldOperationsAccess.mockResolvedValueOnce(null);
    expect((await route.GET(new Request("http://localhost"), uuidEventContext)).status).toBe(403);
    expect(mocks.loadSpogomiFieldOperationsDashboard).not.toHaveBeenCalled();

    mocks.loadSpogomiFieldOperationsAccess.mockResolvedValueOnce({ isOrganizer: false, capabilities: new Set(["timing"]) });
    const response = await route.POST(jsonRequest("http://localhost", {
      action: "measurement",
      divisionId: "11111111-1111-4111-8111-111111111111",
      teamId: "22222222-2222-4222-8222-222222222222",
      categoryRuleId: "33333333-3333-4333-8333-333333333333",
      measurementKind: "mass",
      unit: "g",
      quantity: 10,
      measurementMethod: "balance",
      provenance: "field",
      reason: "test",
    }), uuidEventContext);
    expect(response.status).toBe(403);
    expect(mocks.callSpogomiFieldOperation).not.toHaveBeenCalled();
  });

  it("rate-limits private invitation issuance before generating a secret", async () => {
    const route = await import("./events/[eventId]/identity-assistance/invitation/route");
    mocks.enforceServerRateLimitForAuthenticatedUser.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    expect((await route.POST(new Request("http://localhost"), eventContext)).status).toBe(429);
    expect(mocks.loadSpogomiEventForOrganizer).not.toHaveBeenCalled();
    expect(mocks.issueSpogomiIdentityAssistanceInvitation).not.toHaveBeenCalled();

    mocks.loadSpogomiEventForOrganizer.mockResolvedValueOnce(false);
    expect((await route.POST(new Request("http://localhost"), eventContext)).status).toBe(403);
    expect(mocks.issueSpogomiIdentityAssistanceInvitation).not.toHaveBeenCalled();
  });
});
