import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserActiveRoleMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const listAdminMock = vi.hoisted(() => vi.fn());
const transitionAdminMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const AdmissionRequestErrorMock = vi.hoisted(() => class extends Error {
  kind: "unavailable" | "conflict" | "forbidden" | "invalid";

  constructor(message: string, kind: "unavailable" | "conflict" | "forbidden" | "invalid") {
    super(message);
    this.kind = kind;
  }
});

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
  getCurrentUserActiveRole: getCurrentUserActiveRoleMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/admission-requests", () => ({
  listSpogomiAdmissionRequestsForAdmin: listAdminMock,
  transitionSpogomiAdmissionRequest: transitionAdminMock,
  SpogomiAdmissionRequestError: AdmissionRequestErrorMock,
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
  validationErrorResponse: (details: unknown) => new Response(JSON.stringify({ error: details }), { status: 400 }),
}));

function request() {
  return new Request("http://localhost/api/spogomi/events/11111111-1111-4111-8111-111111111111/admission-requests/review");
}

function requireResponse(response: Response | undefined): Response {
  if (!response) throw new Error("Expected a response");
  return response;
}

describe("GET /api/spogomi/events/:eventId/admission-requests/review", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    getCurrentUserActiveRoleMock.mockResolvedValue("admin");
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    listAdminMock.mockResolvedValue([]);
    transitionAdminMock.mockResolvedValue({ id: "request-1", status: "approved" });
  });

  it("denies an organizer or coorganizer without active admin|max", async () => {
    getCurrentUserActiveRoleMock.mockResolvedValue("organizer");
    const { GET } = await import("./route");
    const response = await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) });
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(403);
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("keeps the admin queue available to an active admin", async () => {
    const { GET } = await import("./route");
    const response = await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) });
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(200);
    expect(listAdminMock).toHaveBeenCalledWith(expect.anything(), "11111111-1111-4111-8111-111111111111");
  });

  it("refuses anonymous access and rate-limited admin access before the queue service", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const { GET } = await import("./route");
    const anonymous = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(anonymous.status).toBe(401);
    expect(listAdminMock).not.toHaveBeenCalled();

    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const limited = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(limited.status).toBe(429);
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid event identifier before reading the admin queue", async () => {
    const { GET } = await import("./route");

    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "not-a-uuid" }) }));

    expect(response.status).toBe(400);
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", 404],
    ["conflict", 409],
    ["forbidden", 403],
    ["invalid", 400],
  ] as const)("maps the admission service %s error to HTTP %s", async (kind, status) => {
    listAdminMock.mockRejectedValueOnce(new AdmissionRequestErrorMock("admission failure", kind));
    const { GET } = await import("./route");

    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));

    expect(response.status).toBe(status);
    expect(listAdminMock).toHaveBeenCalledTimes(1);
  });

  it("keeps unexpected admission service failures behind the generic API error", async () => {
    listAdminMock.mockRejectedValueOnce(new Error("database detail"));
    const { GET } = await import("./route");

    const response = requireResponse(await GET(request(), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal error" });
  });

  it("validates PATCH input and requires internal evidence for approval", async () => {
    const { PATCH } = await import("./route");
    const base = { method: "PATCH", headers: { "content-type": "application/json" } };

    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const anonymous = requireResponse(await PATCH(new Request(request().url, { ...base, body: JSON.stringify({}) }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(anonymous.status).toBe(401);

    const invalidBody = requireResponse(await PATCH(new Request(request().url, { ...base, body: "not-json" }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(invalidBody.status).toBe(400);
    expect(transitionAdminMock).not.toHaveBeenCalled();

    const missingEvidence = requireResponse(await PATCH(new Request(request().url, {
      ...base,
      body: JSON.stringify({ requestId: "11111111-1111-4111-8111-111111111112", status: "approved" }),
    }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(missingEvidence.status).toBe(400);
    expect(transitionAdminMock).not.toHaveBeenCalled();

    const invalidParams = requireResponse(await PATCH(new Request(request().url, { ...base, body: JSON.stringify({}) }), { params: Promise.resolve({ eventId: "not-a-uuid" }) }));
    expect(invalidParams.status).toBe(400);
    expect(transitionAdminMock).not.toHaveBeenCalled();
  });

  it("transitions a rejected request with the active admin identity and notes", async () => {
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(new Request(request().url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "11111111-1111-4111-8111-111111111112",
        status: "rejected",
        resolutionNote: "La demande ne respecte pas le règlement.",
        decisionMessage: "Merci de vérifier les informations fournies.",
      }),
    }), { params: Promise.resolve({ eventId: "11111111-1111-4111-8111-111111111111" }) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", request: { id: "request-1", status: "approved" } });
    expect(transitionAdminMock).toHaveBeenCalledWith({
      supabase: {},
      requestId: "11111111-1111-4111-8111-111111111112",
      eventId: "11111111-1111-4111-8111-111111111111",
      targetStatus: "rejected",
      actorClerkId: "organizer-1",
      actorRole: "admin",
      verificationNote: undefined,
      resolutionNote: "La demande ne respecte pas le règlement.",
      decisionMessage: "Merci de vérifier les informations fournies.",
    });
  });
});
