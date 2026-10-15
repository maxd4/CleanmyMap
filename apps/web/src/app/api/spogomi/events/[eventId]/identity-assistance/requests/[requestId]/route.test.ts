import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadEventForOrganizerMock = vi.hoisted(() => vi.fn());
const transitionRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventForOrganizer: loadEventForOrganizerMock }));
vi.mock("@/lib/spogomi/identity-assistance", () => ({ transitionSpogomiIdentityAssistanceRequest: transitionRequestMock, SpogomiIdentityAssistanceError: class SpogomiIdentityAssistanceError extends Error {} }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
  validationErrorResponse: () => new Response(JSON.stringify({ error: "Invalid" }), { status: 400 }),
}));

describe("SPOGOMI identity assistance decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    loadEventForOrganizerMock.mockResolvedValue({ id: "event-1" });
    transitionRequestMock.mockResolvedValue({ id: "request-1", status: "treated", matchedParticipantId: "participant-1" });
  });

  it("requires a selected roster entry and independent verification note", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "treated" }) }), { params: Promise.resolve({ eventId: "event-1", requestId: "request-1" }) });
    expect(response.status).toBe(400);
    expect(transitionRequestMock).not.toHaveBeenCalled();
  });

  it("keeps refusal organizer-scoped and does not issue a code", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "rejected", resolutionNote: "Aucune vérification suffisante." }) }), { params: Promise.resolve({ eventId: "event-1", requestId: "request-1" }) });
    expect(response.status).toBe(200);
    expect(transitionRequestMock).toHaveBeenCalledWith(expect.objectContaining({ targetStatus: "rejected", actorKind: "organizer" }));
  });
});
