import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadRequestMock = vi.hoisted(() => vi.fn());
const transitionRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/identity-assistance", () => ({
  loadSpogomiIdentityAssistanceRequestForRequester: loadRequestMock,
  transitionSpogomiIdentityAssistanceRequest: transitionRequestMock,
  projectSpogomiIdentityAssistanceForRequester: (request: {
    id: string;
    providedContext: string;
    status: string;
    createdAt: string;
  }) => ({
    id: request.id,
    providedContext: request.providedContext,
    status: request.status,
    createdAt: request.createdAt,
  }),
  SpogomiIdentityAssistanceError: class SpogomiIdentityAssistanceError extends Error {},
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
}));

describe("SPOGOMI identity assistance requester route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    loadRequestMock.mockResolvedValue({
      id: "request-1",
      providedContext: "Contexte fourni par le demandeur.",
      status: "pending",
      createdAt: "2026-10-15T09:00:00.000Z",
    });
    transitionRequestMock.mockResolvedValue({
      id: "request-1",
      eventId: "event-1",
      providedContext: "Contexte fourni par le demandeur.",
      status: "cancelled",
      matchedParticipantId: "participant-internal",
      verificationNote: "Note interne.",
      resolutionNote: "Décision interne.",
      handledAt: "2026-10-15T10:00:00.000Z",
      createdAt: "2026-10-15T09:00:00.000Z",
    });
  });

  it("returns only the pending requester view", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      status: "ok",
      request: {
        id: "request-1",
        providedContext: "Contexte fourni par le demandeur.",
        status: "pending",
        createdAt: "2026-10-15T09:00:00.000Z",
      },
    });
    expect(body.request).not.toHaveProperty("matchedParticipantId");
    expect(body.request).not.toHaveProperty("verificationNote");
    expect(body.request).not.toHaveProperty("resolutionNote");
  });

  it("projects the cancellation response instead of returning organizer fields", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      status: "ok",
      request: {
        id: "request-1",
        providedContext: "Contexte fourni par le demandeur.",
        status: "cancelled",
        createdAt: "2026-10-15T09:00:00.000Z",
      },
    });
    expect(transitionRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      requestId: "request-1",
      actorKind: "requester",
      actorClerkId: "user-1",
      targetStatus: "cancelled",
    }));
    expect(body.request).not.toHaveProperty("matchedParticipantId");
    expect(body.request).not.toHaveProperty("verificationNote");
    expect(body.request).not.toHaveProperty("resolutionNote");
  });

  it("denies anonymous reads before loading the requester record", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(401);
    expect(loadRequestMock).not.toHaveBeenCalled();
  });
});
