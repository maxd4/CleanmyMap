import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const loadOwnActionAccessibilitySupportRequestMock = vi.hoisted(() => vi.fn());
const loadActionAccessibilitySupportRequestsForOrganizerMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock, getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock }));
vi.mock("@/lib/actions/accessibility-support", () => ({
  deleteOwnActionAccessibilitySupportRequest: vi.fn(),
  loadActionAccessibilitySupportRequestsForOrganizer: loadActionAccessibilitySupportRequestsForOrganizerMock,
  loadOwnActionAccessibilitySupportRequest: loadOwnActionAccessibilitySupportRequestMock,
  saveActionAccessibilitySupportRequest: vi.fn(),
  updateActionAccessibilityCheckIn: vi.fn(),
}));

describe("/api/actions/[actionId]/accessibility-support", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "participant-1" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
    loadActionByIdMock.mockResolvedValue({ id: "action-1", created_by_clerk_id: "organizer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "member", activeRole: "member" });
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue(["organizer-1"]);
    loadOwnActionAccessibilitySupportRequestMock.mockResolvedValue({ requested_needs: ["rest_breaks"] });
    loadActionAccessibilitySupportRequestsForOrganizerMock.mockResolvedValue([]);
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
  });

  it("blocks anonymous reads before accessing private request data", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(loadActionByIdMock).not.toHaveBeenCalled();
  });

  it("returns only the requester's own record with private no-store caching", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(loadOwnActionAccessibilitySupportRequestMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "participant-1" });
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).not.toHaveBeenCalled();
  });

  it("returns organizer requests only after canonical action-management authorization", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(loadCanonicalActionOrganizerIdsForActionMock).toHaveBeenCalledWith(expect.anything(), "action-1");
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1" });
    expect(loadOwnActionAccessibilitySupportRequestMock).not.toHaveBeenCalled();
  });
});
