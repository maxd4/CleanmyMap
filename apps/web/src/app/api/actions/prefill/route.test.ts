import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const fetchRecentActionsByUserMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/actions/store", () => ({
  fetchRecentActionsByUser: fetchRecentActionsByUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("GET /api/actions/prefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
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
        organizer_type: "association",
      },
    ]);
  });

  it("returns a short private prefill payload from recent actions", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = (await response.json()) as {
      status?: string;
      prefill?: {
        actorName?: string;
        locationLabel?: string | null;
        associationName?: string | null;
        organizerType?: string | null;
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
    expect(body.prefill?.organizerType).toBe("association");
    expect(body.basedOn?.recentDeclarations).toBe(1);
    expect(fetchRecentActionsByUserMock).toHaveBeenCalledTimes(1);
  }, 10000);

  it("fails closed before loading private history when the session is absent", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(fetchRecentActionsByUserMock).not.toHaveBeenCalled();
  });

  it("uses safe defaults when no recent declaration contains usable values", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce(null);
    fetchRecentActionsByUserMock.mockResolvedValueOnce([]);
    const { GET } = await import("./route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.prefill).toMatchObject({
      actorName: "user-1",
      associationName: "Action spontanée",
      organizerType: null,
      locationLabel: null,
      volunteersCount: 1,
      durationMinutes: 60,
    });
  });

  it("uses deterministic medians and ignores invalid samples while counting normalized labels", async () => {
    fetchRecentActionsByUserMock.mockResolvedValueOnce([
      { location_label: "  Place B ", notes: "association: Atelier", volunteers_count: 2, duration_minutes: 10, actor_name: "First", organizer_type: "association" },
      { location_label: "Place B", notes: "association: Atelier", volunteers_count: 8, duration_minutes: 30, actor_name: "Second", organizer_type: "association" },
      { location_label: "Place A", notes: "association: Autre", volunteers_count: Number.NaN, duration_minutes: -1, actor_name: "Third", organizer_type: "invalid" },
      { location_label: "", notes: null, volunteers_count: 0, duration_minutes: "bad", actor_name: null, organizer_type: "benevole" },
    ]);
    const { GET } = await import("./route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.prefill).toMatchObject({
      locationLabel: "Place B",
      associationName: "Action spontanée",
      organizerType: "association",
      volunteersCount: 5,
      durationMinutes: 20,
    });
    expect(body.basedOn.recentDeclarations).toBe(4);
  });

  it("maps a recent-history dependency failure to a safe server response", async () => {
    const providerDetail = "private recent action query";
    fetchRecentActionsByUserMock.mockRejectedValueOnce(new Error(providerDetail));
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain(providerDetail);
  });
});
