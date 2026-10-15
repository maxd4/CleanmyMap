import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadEventForOrganizerMock = vi.hoisted(() => vi.fn());
const listRequestsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventForOrganizer: loadEventForOrganizerMock }));
vi.mock("@/lib/spogomi/identity-assistance", () => ({ listSpogomiIdentityAssistanceRequests: listRequestsMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }) }));

describe("SPOGOMI identity assistance organizer list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    loadEventForOrganizerMock.mockResolvedValue({ id: "event-1" });
    listRequestsMock.mockResolvedValue([{ id: "request-1", status: "pending" }]);
  });

  it("denies anonymous access before reading requests", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(401);
    expect(listRequestsMock).not.toHaveBeenCalled();
  });

  it("denies a non-owner without enumerating requests", async () => {
    loadEventForOrganizerMock.mockResolvedValueOnce(false);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(403);
    expect(listRequestsMock).not.toHaveBeenCalled();
  });

  it("returns only the organizer-scoped request projection", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(200);
    expect(listRequestsMock).toHaveBeenCalledWith({}, "event-1");
  });
});
