import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserActiveRoleMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const listAdminMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const admissionRequestErrorMock = vi.hoisted(() => class extends Error {});

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
  getCurrentUserActiveRole: getCurrentUserActiveRoleMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/admission-requests", () => ({
  listSpogomiAdmissionRequestsForAdmin: listAdminMock,
  transitionSpogomiAdmissionRequest: vi.fn(),
  SpogomiAdmissionRequestError: admissionRequestErrorMock,
}));

function request() {
  return new Request("http://localhost/api/spogomi/events/11111111-1111-4111-8111-111111111111/admission-requests/review");
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
});
