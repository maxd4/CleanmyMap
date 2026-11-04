import { beforeEach, describe, expect, it, vi } from "vitest";

const loadProofsMock = vi.hoisted(() => vi.fn());
const loadPeriodsMock = vi.hoisted(() => vi.fn());
const loadPageMock = vi.hoisted(() => vi.fn());

vi.mock("./award-facts", () => ({
  loadTerritorialLegendAwardProofs: loadProofsMock,
  loadTerritorialLegendHoldPeriods: loadPeriodsMock,
}));
vi.mock("./engine", () => ({ loadTerritorialLegendPage: loadPageMock }));

import { loadTerritorialLegendOverview } from "./overview";

describe("loadTerritorialLegendOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProofsMock.mockResolvedValue([{
      proofId: "private-proof",
      userId: "user-1",
      campaignYear: 2026,
      level: "commune",
      territoryCode: "75056",
      awardKind: "conquest",
      thresholdDays: 0,
      holdStartedOn: "2026-11-01",
      heldThroughOn: "2026-11-01",
      awardedOn: "2026-11-01",
      validFrom: "2026-11-01",
      validUntil: null,
      validityStatus: "active",
      sourceFingerprint: "server-proof",
    }]);
    loadPeriodsMock.mockResolvedValue([{
      userId: "user-1",
      campaignYear: 2026,
      level: "commune",
      territoryCode: "75056",
      territoryLabel: "Paris",
      startedOn: "2026-11-01",
      lastVerifiedOn: "2026-11-04",
      endedOn: null,
      validityStatus: "active",
      sourceFingerprint: "server-hold",
    }]);
    loadPageMock.mockImplementation(async (_supabase: unknown, params: { ownerUserId?: string }) => ({
      level: "commune",
      campaignYear: 2026,
      territoryCode: "75056",
      territoryLabel: "Paris",
      generatedAt: "2026-11-04T12:00:00.000Z",
      windowDays: 90,
      competitorCount: 2,
      maxScore: 2,
      titleEligible: true,
      title: "Légende de Paris",
      owner: params.ownerUserId ? { rank: 1, score: 2, distinctActions: 2, tied: true, tieSize: 2 } : undefined,
      items: params.ownerUserId ? [] : [{ rank: 1, publicLabel: "Camille", score: 2, distinctActions: 2, tied: true, tieSize: 2 }],
      nextCursor: null,
    }));
  });

  it("projects verified current duration, best history and public ties without exposing private source ids", async () => {
    const overview = await loadTerritorialLegendOverview({} as never, "user-1", new Date("2026-11-04T12:00:00.000Z"));
    const item = overview.territories[0]!;

    expect(item.currentHold).toMatchObject({ days: 4 });
    expect(item.bestHistory).toMatchObject({ days: 4 });
    expect(item.private).toMatchObject({ rank: 1, title: "Légende de Paris" });
    expect(item.public.items[0]).toMatchObject({ tied: true, tieSize: 2 });
    expect(JSON.stringify(overview)).not.toContain("userId");
    expect(JSON.stringify(overview)).not.toContain("server-proof");
  });
});
