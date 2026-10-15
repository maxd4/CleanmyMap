import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const listRequesterMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const admissionRequestErrorMock = vi.hoisted(() => class extends Error {});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/admission-requests", () => ({
  listSpogomiAdmissionRequestsForRequester: listRequesterMock,
  createSpogomiAdmissionRequest: vi.fn(),
  cancelSpogomiAdmissionRequest: vi.fn(),
  SpogomiAdmissionRequestError: admissionRequestErrorMock,
}));

function request() {
  return new Request("http://localhost/api/spogomi/events/11111111-1111-4111-8111-111111111111/admission-requests");
}

describe("GET /api/spogomi/events/:eventId/admission-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "requester-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
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
    const response = await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) });
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
    const response = await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) });
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(401);
    expect(listRequesterMock).not.toHaveBeenCalled();
  });
});
