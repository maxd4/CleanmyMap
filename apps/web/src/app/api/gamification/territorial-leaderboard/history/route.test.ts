import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const loadHistoryMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/gamification/territorial-legends/award-facts", () => ({
  loadTerritorialLegendAwardHistory: loadHistoryMock,
}));

import { GET } from "./route";

describe("GET /api/gamification/territorial-leaderboard/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
  });

  it("requires the authenticated owner and returns invalidated proofs for one campaign", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    loadHistoryMock.mockResolvedValue([
      {
        proofId: "user-1:commune:2025:*:conquest:0",
        userId: "user-1",
        campaignYear: 2025,
        level: "commune",
        territoryCode: "75056",
        awardKind: "conquest",
        thresholdDays: 0,
        holdStartedOn: "2025-01-01",
        heldThroughOn: "2025-01-07",
        awardedOn: "2025-01-07",
        validFrom: "2025-01-07",
        validUntil: "2025-01-08",
        validityStatus: "invalidated",
        sourceFingerprint: "correction-1",
      },
    ]);

    const response = await GET(new Request(
      "http://localhost/api/gamification/territorial-leaderboard/history?campaignYear=2025&level=commune&territoryCode=75056",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toMatchObject({ status: "ok", campaignYear: 2025 });
    expect(body.proofs[0]).toMatchObject({ campaignYear: 2025, validityStatus: "invalidated" });
    expect(loadHistoryMock).toHaveBeenCalledWith({}, "user-1", {
      campaignYear: 2025,
      level: "commune",
      territoryCode: "75056",
    });
  });

  it("rejects unauthenticated reads before touching the database", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });

    const response = await GET(new Request(
      "http://localhost/api/gamification/territorial-leaderboard/history?campaignYear=2025",
    ));

    expect(response.status).toBe(401);
    expect(loadHistoryMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it.each([
    "campaignYear=0",
    "campaignYear=2025&level=invalid",
    "campaignYear=2025&territoryCode=75056",
    "campaignYear=2025&level=country&territoryCode=75056",
  ])("rejects an invalid history scope: %s", async (query) => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });

    const response = await GET(new Request(`http://localhost/api/gamification/territorial-leaderboard/history?${query}`));

    expect(response.status).toBe(400);
    expect(loadHistoryMock).not.toHaveBeenCalled();
  });
});
