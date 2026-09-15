import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const rlsMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());
const profileMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ getSupabaseClerkRlsClient: rlsMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("../route.data", () => ({ loadCurrentProfile: profileMock }));

describe("GET /api/chat/share-destinations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ userId: "user-1", activeRole: "benevole" });
    profileMock.mockResolvedValue({ id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "benevole", metadata: null });
    rlsMock.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) });
    serverMock.mockReturnValue({});
  });

  it("exposes the completed-result classification to the selector", async () => {
    loadActionMock.mockResolvedValue({
      action_date: "2020-01-01",
      event_start_time: null,
      action_phase: "post_action_complete",
      status: "approved",
      moderation_visibility: "visible",
      published_at: "2026-09-01T10:00:00.000Z",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/chat/share-destinations?actionId=action-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.shareKind).toBe("result");
  });
});
