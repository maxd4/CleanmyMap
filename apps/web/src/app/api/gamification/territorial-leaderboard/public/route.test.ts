import { beforeEach, describe, expect, it, vi } from "vitest";

const loadPageMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gamification/territorial-legends", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/territorial-legends")>("@/lib/gamification/territorial-legends");
  return { ...actual, loadTerritorialLegendPage: loadPageMock };
});
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: () => null,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn(() => ({})) }));

import { GET } from "./route";

describe("public territorial leaderboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the minimized public projection", async () => {
    verifyRateLimitMock.mockResolvedValue({ allowed: true });
    loadPageMock.mockResolvedValue({
      level: "department",
      campaignYear: 2026,
      territoryCode: "974",
      territoryLabel: "La Réunion",
      generatedAt: "2026-11-03T12:00:00.000Z",
      windowDays: 90,
      competitorCount: 2,
      maxScore: 2,
      titleEligible: true,
      title: "Légende de La Réunion",
      items: [{ rank: 1, publicLabel: "Alice", score: 2, distinctActions: 2, tied: false, tieSize: 1 }],
      nextCursor: null,
    });
    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/public?level=department&territoryCode=974"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, no-store, max-age=0");
    expect(payload.campaignYear).toBe(2026);
    expect(payload.items[0]).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("consents");
    expect(payload).not.toHaveProperty("participations");
    expect(loadPageMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ level: "department", territoryCode: "974" }));
  });

  it("rejects an unscoped or unknown level before loading data", async () => {
    verifyRateLimitMock.mockResolvedValue({ allowed: true });
    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/public?territoryCode=75"));
    expect(response.status).toBe(400);
    expect(loadPageMock).not.toHaveBeenCalled();
  });

  it("rejects a code shape that cannot be a COG territory", async () => {
    verifyRateLimitMock.mockResolvedValue({ allowed: true });
    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/public?level=country&territoryCode=75"));
    expect(response.status).toBe(400);
    expect(loadPageMock).not.toHaveBeenCalled();
  });
});
