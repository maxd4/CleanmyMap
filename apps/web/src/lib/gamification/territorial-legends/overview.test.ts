import { beforeEach, describe, expect, it, vi } from "vitest";

const loadProofsMock = vi.hoisted(() => vi.fn());
const loadPeriodsMock = vi.hoisted(() => vi.fn());
const loadFactsMock = vi.hoisted(() => vi.fn());
const buildPageMock = vi.hoisted(() => vi.fn());

vi.mock("./award-facts", () => ({
  loadTerritorialLegendAwardProofs: loadProofsMock,
  loadTerritorialLegendHoldPeriods: loadPeriodsMock,
}));
vi.mock("./engine", () => ({
  buildTerritorialLegendPage: buildPageMock,
  loadTerritorialLegendFacts: loadFactsMock,
}));

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
    loadFactsMock.mockResolvedValue({
      actions: [{
        actionId: "action-1",
        actionDate: "2026-11-03",
        territory: {
          country: { code: "FR", name: "France" },
          region: { code: "11", name: "Île-de-France" },
          department: { code: "75", name: "Paris" },
          commune: { code: "75056", name: "Paris" },
          arrondissement: null,
        },
      }],
      participations: [],
      consents: [],
      profiles: [],
    });
    buildPageMock.mockImplementation((params: { ownerUserId?: string; level: string; territoryCode: string }) => ({
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
      owner: params.ownerUserId ? { rank: 1, score: 2, distinctActions: 2, tied: true, tieSize: 2 } : null,
      items: [{ rank: 1, publicLabel: "Camille", score: 2, distinctActions: 2, tied: true, tieSize: 2 }],
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
    expect(loadFactsMock).toHaveBeenCalledTimes(1);
    expect(buildPageMock).toHaveBeenCalledTimes(1);
  });

  it("includes an eligible territory before the first title or reward", async () => {
    loadProofsMock.mockResolvedValue([]);
    loadPeriodsMock.mockResolvedValue([]);
    loadFactsMock.mockResolvedValue({
      actions: [{
        actionId: "action-eligible",
        actionDate: "2026-11-03",
        territory: {
          country: { code: "FR", name: "France" },
          region: { code: "11", name: "Île-de-France" },
          department: { code: "75", name: "Paris" },
          commune: { code: "75056", name: "Paris" },
          arrondissement: null,
        },
      }],
      participations: [{ actionId: "action-eligible", userId: "user-1", joinedAt: "2026-11-03T10:00:00.000Z" }],
      consents: [{ userId: "user-1", enabled: true, activatedAt: "2026-11-01T10:00:00.000Z", ageEligible: true }],
      profiles: [{ userId: "user-1", publicLabel: "Vous" }],
    });
    buildPageMock.mockImplementation((params: { level: string; territoryCode: string; ownerUserId?: string }) => ({
      level: params.level,
      campaignYear: 2026,
      territoryCode: params.territoryCode,
      territoryLabel: params.territoryCode === "75056" ? "Paris" : params.territoryCode,
      generatedAt: "2026-11-04T12:00:00.000Z",
      windowDays: 90,
      competitorCount: 0,
      maxScore: 0,
      titleEligible: false,
      title: null,
      owner: params.territoryCode === "75056" ? { rank: null, score: 1, distinctActions: 1, tied: false, tieSize: 1 } : null,
      items: [],
      nextCursor: null,
    }));

    const overview = await loadTerritorialLegendOverview({} as never, "user-1", new Date("2026-11-04T12:00:00.000Z"));

    expect(overview.territories).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: "commune", territoryCode: "75056", private: expect.objectContaining({ score: 1 }), rewards: [] }),
    ]));
  });

  it("does not let more than 100 foreign territories hide the owner's eligible territory", async () => {
    loadProofsMock.mockResolvedValue([]);
    loadPeriodsMock.mockResolvedValue([]);
    const foreignActions = Array.from({ length: 101 }, (_, index) => ({
      actionId: `foreign-${index}`,
      actionDate: "2026-11-03",
      territory: {
        country: { code: "FR", name: "France" },
        region: { code: "11", name: "Île-de-France" },
        department: { code: "75", name: "Paris" },
        commune: { code: String(10000 + index).padStart(5, "0"), name: `Territoire étranger ${index}` },
        arrondissement: null,
      },
    }));
    const ownerAction = {
      actionId: "owner-action",
      actionDate: "2026-11-03",
      territory: {
        country: { code: "FR", name: "France" },
        region: { code: "11", name: "Île-de-France" },
        department: { code: "75", name: "Paris" },
        commune: { code: "19999", name: "Territoire propriétaire" },
        arrondissement: null,
      },
    };
    loadFactsMock.mockResolvedValue({
      actions: [...foreignActions, ownerAction],
      participations: [{ actionId: "owner-action", userId: "user-1", joinedAt: "2026-11-03T10:00:00.000Z" }],
      consents: [{ userId: "user-1", enabled: true, activatedAt: "2026-11-01T10:00:00.000Z", ageEligible: true }],
      profiles: [{ userId: "user-1", publicLabel: "Vous" }],
    });
    buildPageMock.mockImplementation((params: { level: string; territoryCode: string }) => ({
      level: params.level,
      campaignYear: 2026,
      territoryCode: params.territoryCode,
      territoryLabel: params.territoryCode === "19999" ? "Territoire propriétaire" : params.territoryCode,
      generatedAt: "2026-11-04T12:00:00.000Z",
      windowDays: 90,
      competitorCount: 0,
      maxScore: 0,
      titleEligible: false,
      title: null,
      owner: params.territoryCode === "19999"
        ? { rank: null, score: 1, distinctActions: 1, tied: false, tieSize: 1 }
        : null,
      items: [],
      nextCursor: null,
    }));

    const overview = await loadTerritorialLegendOverview({} as never, "user-1", new Date("2026-11-04T12:00:00.000Z"));

    expect(overview.territories).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: "commune",
        territoryCode: "19999",
        private: expect.objectContaining({ score: 1, title: null }),
      }),
    ]));
    expect(overview.territories.some(({ territoryCode }) => territoryCode === "10000")).toBe(false);
  });
});
