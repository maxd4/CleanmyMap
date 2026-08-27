import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const listMyObservationsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/actions/signalement/my-observations", () => ({
  clampMyObservationsLimit: (value: number | undefined) =>
    value === undefined ? 20 : Math.min(50, Math.max(1, Math.trunc(value))),
  listMyObservations: listMyObservationsMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

const { GET } = await import("./route");

describe("GET /api/signalements/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    listMyObservationsMock.mockResolvedValue([]);
  });

  it("returns 401 for an anonymous request without querying the owner service", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await GET(new Request("https://cleanmymap.test/api/signalements/me"));

    expect(response.status).toBe(401);
    expect(listMyObservationsMock).not.toHaveBeenCalled();
  });

  it("uses the server owner id and ignores any client owner parameter", async () => {
    listMyObservationsMock.mockResolvedValue([
      {
        id: "spot-1",
        createdAt: "2026-08-26T10:00:00Z",
        type: "spot",
        label: "Quai de Seine",
        status: "new",
        latitude: 48.85,
        longitude: 2.35,
        validatedAt: null,
        cleanedAt: null,
      },
    ]);

    const response = await GET(
      new Request(
        "https://cleanmymap.test/api/signalements/me?ownerId=other-user&limit=20",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].status).toBe("new");
    expect(listMyObservationsMock).toHaveBeenCalledWith(
      {},
      { userId: "owner-1", limit: 20 },
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("caps the only client-controlled pagination value at 50", async () => {
    await GET(
      new Request("https://cleanmymap.test/api/signalements/me?limit=500&userId=other-user"),
    );

    expect(listMyObservationsMock).toHaveBeenCalledWith(
      {},
      { userId: "owner-1", limit: 50 },
    );
  });
});
