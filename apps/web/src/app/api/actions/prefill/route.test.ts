import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const fetchRecentActionsByUserMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const unstableCacheMock = vi.hoisted(() => vi.fn((fn: () => Promise<unknown>) => fn));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/actions/store", () => ({
  fetchRecentActionsByUser: fetchRecentActionsByUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

describe("GET /api/actions/prefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      displayName: "Ada Admin",
    });
    getSupabaseServerClientMock.mockReturnValue({} as never);
    fetchRecentActionsByUserMock.mockResolvedValue([
      {
        location_label: "Place de la République",
        notes: "association: Mairie",
        volunteers_count: 8,
        duration_minutes: 90,
        actor_name: "Ada Admin",
      },
    ]);
  });

  it("returns a short cached prefill payload from recent actions", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = (await response.json()) as {
      status?: string;
      prefill?: {
        actorName?: string;
        locationLabel?: string | null;
        associationName?: string | null;
        volunteersCount?: number;
        durationMinutes?: number;
      };
      basedOn?: { recentDeclarations?: number };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(body.status).toBe("ok");
    expect(body.prefill?.actorName).toBe("Ada Admin");
    expect(body.prefill?.locationLabel).toBe("Place de la République");
    expect(body.prefill?.associationName).toBe("Action spontanée");
    expect(body.basedOn?.recentDeclarations).toBe(1);
    expect(fetchRecentActionsByUserMock).toHaveBeenCalledTimes(1);
  });
});
