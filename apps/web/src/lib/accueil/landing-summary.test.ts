import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import type { PublicImpactSnapshotPayload } from "@/lib/impact/public-impact-snapshot";

const fetchCachedUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const loadLatestPublicImpactSnapshotMock = vi.hoisted(() => vi.fn());
const storageListMock = vi.hoisted(() => vi.fn());
const storagePublicUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/unified-source/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: fetchCachedUnifiedActionContractsMock,
}));
vi.mock("@/lib/impact/public-impact-snapshot", () => ({
  loadLatestPublicImpactSnapshot: loadLatestPublicImpactSnapshotMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        list: storageListMock,
        getPublicUrl: storagePublicUrlMock,
      }),
    },
  }),
}));

import { loadLandingSummary } from "./data";

function actionContract() {
  return buildActionDataContract({
    id: "landing-action",
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: "2026-08-27",
    createdAt: "2026-08-27T10:00:00.000Z",
    locationLabel: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    actorName: "Bénévole",
    wasteKg: 2,
    cigaretteButts: 100,
    volunteersCount: 3,
  });
}

function monthlyPayload(): PublicImpactSnapshotPayload {
  return {
    period: {
      fromDate: "2025-09-08",
      toDate: "2026-09-08",
      timezone: "UTC",
    },
    generatedAt: "2026-09-08T03:00:00.000Z",
    methodologyVersion: "impact-proxy-2026.04-v1",
    resultsContractVersion: "impact-terrain-results-2026.09-v1",
    kpis: {
      participantsTotal: 31,
      totalDurationMinutes: 90,
      totalDurationHours: 1.5,
      actionDistribution: [
        { key: "company", category: "Entreprise", count: 2 },
      ],
      classificationWarnings: [],
      impactTerrain: buildImpactTerrain2026PublicResults({
        wasteKg: 25.5,
        buttsTotal: 1250,
      }),
      streetCleaningSavings: {
        wasteKg: 25.5,
        durationMinutes: 90,
        actionHours: 1.5,
        massEstimateEuros: 38.25,
        timeEstimateEuros: 18.465,
        lowerBoundEuros: 18.465,
        upperBoundEuros: 38.25,
      },
    },
    aggregates: {
      visibleActions: 12,
      distinctLocations: 4,
    },
    provenance: {
      sourceRpc: "public.load_public_landing_action_summary",
      scope: {
        actionType: "action",
        status: "approved",
        visibility: "visible",
        excludesTestDemoData: true,
        floorDate: "2025-09-08",
      },
      calculationDomain: [],
    },
  };
}

describe("landing summary loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadLatestPublicImpactSnapshotMock.mockResolvedValue({
      payload: monthlyPayload(),
    });
    fetchCachedUnifiedActionContractsMock.mockResolvedValue({
      items: [actionContract()],
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions", "local"],
        warnings: [],
      },
    });
    storageListMock.mockResolvedValue({ data: [], error: null });
    storagePublicUrlMock.mockReturnValue({ data: { publicUrl: "" } });
  });

  it("uses the monthly impact snapshot and only fetches bounded recent activity", async () => {
    storageListMock.mockResolvedValue({
      data: [{ name: "2026-08-27-photo.jpg" }],
      error: null,
    });
    storagePublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://storage.example/action-photo.jpg" },
    });

    const summary = await loadLandingSummary();

    expect(summary.counters).toMatchObject({
      wasteKg: 25.5,
      butts: 1250,
      volunteers: 31,
    });
    expect(summary).toMatchObject({
      participantsTotal: 31,
      totalDurationMinutes: 90,
      totalDurationHours: 1.5,
      actionDistribution: [
        { key: "company", category: "Entreprise", count: 2 },
      ],
      classificationWarnings: [],
      impactTerrain: {
        wasteKg: 25.5,
        wasteBagsEquivalent: 5.1,
        co2CarKilometers: expect.any(Number),
        waterOlympicPools: expect.any(Number),
      },
      streetCleaningSavings: {
        massEstimateEuros: 38.25,
        timeEstimateEuros: 18.465,
        lowerBoundEuros: 18.465,
        upperBoundEuros: 38.25,
      },
    });
    expect(summary.activity).toMatchObject({
      visibleActions: 12,
      distinctLocations: 4,
      items: [{ id: "landing-action" }],
    });
    expect(summary.activity.items[0]?.image).toMatchObject({
      source: "userProvidedImage",
      url: "https://storage.example/action-photo.jpg",
      isFallback: false,
    });
    expect(loadLatestPublicImpactSnapshotMock).toHaveBeenCalledOnce();
    expect(fetchCachedUnifiedActionContractsMock).toHaveBeenCalledWith({
      limit: 3,
      status: "approved",
      floorDate: "2025-09-08",
      requireCoordinates: false,
      types: ["action"],
    });
  });

  it("does not rebuild the monthly KPI aggregate when a snapshot is available", async () => {
    fetchCachedUnifiedActionContractsMock.mockResolvedValueOnce({
      items: [],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });

    const summary = await loadLandingSummary();

    expect(summary.participantsTotal).toBe(31);
    expect(loadLatestPublicImpactSnapshotMock).toHaveBeenCalledOnce();
    expect(fetchCachedUnifiedActionContractsMock).toHaveBeenCalledOnce();
  });
});
