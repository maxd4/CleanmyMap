import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const loadAuthorizedEventMock = vi.hoisted(() => vi.fn());
const issueCodeMock = vi.hoisted(() => vi.fn());
const IdentityLinkErrorMock = vi.hoisted(() => class extends Error {
  kind: "already_linked" | "not_found" | "validation";

  constructor(message: string, kind: "already_linked" | "not_found" | "validation") {
    super(message);
    this.kind = kind;
  }
});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: loadAuthorizedEventMock }));
vi.mock("@/lib/spogomi/identity-link", () => ({ issueSpogomiIdentityCode: issueCodeMock, SpogomiIdentityLinkError: IdentityLinkErrorMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
}));

const params = { eventId: "event-1", participantId: "participant-1" };

function request() {
  return new Request("https://cleanmymap.example/api/spogomi/events/event-1/participants/participant-1/identity-code", { method: "POST" });
}

describe("POST SPOGOMI identity-code", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    loadAuthorizedEventMock.mockResolvedValue({ supabase: { privileged: true }, authorized: { event: { id: "event-1" } } });
    issueCodeMock.mockResolvedValue({ code: "SPOGOMI-CODE-ONE-TIME", expiresAt: "2026-10-22T10:00:00.000Z" });
  });

  it("denies anonymous callers before rate limiting or private services", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(401);
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
    expect(loadAuthorizedEventMock).not.toHaveBeenCalled();
    expect(issueCodeMock).not.toHaveBeenCalled();
  });

  it("stops a rate-limited organizer before event or participant access", async () => {
    enforceRateLimitMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(429);
    expect(loadAuthorizedEventMock).not.toHaveBeenCalled();
    expect(issueCodeMock).not.toHaveBeenCalled();
  });

  it("does not issue a code for a foreign or unauthorized event", async () => {
    loadAuthorizedEventMock.mockResolvedValueOnce({ supabase: {}, authorized: { response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) } });
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(403);
    expect(issueCodeMock).not.toHaveBeenCalled();
  });

  it("returns only the one-time delivery contract and never organizer identity", async () => {
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "issued",
      code: "SPOGOMI-CODE-ONE-TIME",
      expiresAt: "2026-10-22T10:00:00.000Z",
      delivery: "manual",
      warning: "Ce code est affiché une seule fois. Remettez-le directement à la personne concernée.",
    });
    expect(body).not.toHaveProperty("organizerId");
    expect(body).not.toHaveProperty("participantId");
    expect(issueCodeMock).toHaveBeenCalledWith({ privileged: true }, { eventId: "event-1", participantId: "participant-1", organizerId: "organizer-1" });
  });

  it("maps an already-linked identity to a bounded conflict without retrying", async () => {
    issueCodeMock.mockRejectedValueOnce(new IdentityLinkErrorMock("already linked", "already_linked"));
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Cette identité est déjà liée." });
    expect(issueCodeMock).toHaveBeenCalledOnce();
  });

  it("hides provider details on unexpected issuance failures", async () => {
    issueCodeMock.mockRejectedValueOnce(new Error("private provider detail"));
    const { POST } = await import("./route");
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal" });
  });
});
