import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";

const fetchCachedUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const storageListMock = vi.hoisted(() => vi.fn());
const storagePublicUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/unified-source/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: fetchCachedUnifiedActionContractsMock,
}));
vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: loadOrRefreshPublicSurfaceSnapshotMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    rpc: rpcMock,
    storage: {
      from: () => ({
        list: storageListMock,
        getPublicUrl: storagePublicUrlMock,
      }),
    },
  }),
}));

import {
  LANDING_SUMMARY_SNAPSHOT_KEY,
  LANDING_SUMMARY_SNAPSHOT_TTL_MINUTES,
  LANDING_SUMMARY_SNAPSHOT_VERSION,
  loadLandingSummary,
} from "./data";

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

describe("landing summary loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({
      data: [
        {
          visible_actions: 12,
          distinct_locations: 4,
          waste_kg: "25.5",
          cigarette_butts: 1250,
          volunteers: 31,
          participants_total: 31,
          total_duration_minutes: 90,
          action_distribution: [
            { key: "company", category: "Entreprise", count: 2 },
          ],
          classification_warnings: [],
        },
      ],
      error: null,
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
    loadOrRefreshPublicSurfaceSnapshotMock.mockImplementation(
      async (params: { buildPayload: () => Promise<unknown> }) => ({
        payload: await params.buildPayload(),
      }),
    );
  });

  it("uses the bounded action preview and the dedicated 60-minute snapshot", async () => {
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
    expect(fetchCachedUnifiedActionContractsMock).toHaveBeenCalledWith({
      limit: 3,
      status: "approved",
      floorDate: expect.any(String),
      requireCoordinates: false,
      types: ["action"],
    });
    expect(rpcMock).toHaveBeenCalledWith(
      "load_public_landing_action_summary",
      { p_floor_date: expect.any(String) },
    );
    expect(loadOrRefreshPublicSurfaceSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotKey: LANDING_SUMMARY_SNAPSHOT_KEY,
        version: LANDING_SUMMARY_SNAPSHOT_VERSION,
        ttlMinutes: LANDING_SUMMARY_SNAPSHOT_TTL_MINUTES,
      }),
    );
  });

  it("returns a fresh snapshot without rebuilding the landing payload", async () => {
    const freshPayload = {
      counters: {
        wasteKg: 1,
        butts: 2,
        volunteers: 3,
        co2AvoidedKg: 1.2,
        waterSavedLiters: 1000,
        euroSaved: 2,
      },
      activity: { visibleActions: 1, distinctLocations: 1, items: [] },
      dataAvailability: {
        status: "available",
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      },
      participantsTotal: 3,
      totalDurationMinutes: 30,
      totalDurationHours: 0.5,
      actionDistribution: [],
      classificationWarnings: [],
    };
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: freshPayload,
    });

    await expect(loadLandingSummary()).resolves.toEqual(freshPayload);

    expect(fetchCachedUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
