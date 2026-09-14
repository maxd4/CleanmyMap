import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
}));

function createUpdateClient(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return { from: vi.fn(() => chain) };
}

describe("POST /api/actions/:actionId/publish", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "owner-1", role: null, activeRole: null });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    loadActionByIdMock.mockResolvedValue({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: null,
    });
  });

  it("publishes a private pre-action without changing moderation status", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createUpdateClient({ data: { id: "action-1", published_at: "2026-09-14T10:00:00.000Z" }, error: null }),
    );
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("published");
    expect(body.alreadyPublished).toBe(false);
    expect(getSupabaseServerClientMock().from).not.toHaveBeenCalledWith("action_participants");
  });

  it("refuses publication by a third party", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "intruder-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "intruder-1", role: null, activeRole: null });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
  });

  it("is idempotent when the action is already published", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: "2026-09-14T10:00:00.000Z",
    });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.alreadyPublished).toBe(true);
  });
});
