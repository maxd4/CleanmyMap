import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAggregateMock = vi.hoisted(() => vi.fn());
const readLatestSnapshotMock = vi.hoisted(() => vi.fn());
const upsertSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/accueil/public-landing-action-summary", () => ({
  buildLandingFloorDate: (now: Date) => now.toISOString().slice(0, 10),
  loadPublicLandingActionSummary: loadAggregateMock,
}));

vi.mock("@/lib/public-surface-snapshots", () => ({
  getPublicSurfaceSnapshotDate: (value: string) => value.slice(0, 10),
  readLatestPublicSurfaceSnapshot: readLatestSnapshotMock,
  upsertPublicSurfaceSnapshot: upsertSnapshotMock,
}));

import {
  buildPublicImpactSnapshotPayload,
  generateAndPersistPublicImpactSnapshot,
  getImpactSnapshotMonthDate,
  PUBLIC_IMPACT_SNAPSHOT_VERSION,
} from "./public-impact-snapshot";

const NOW = new Date("2026-09-08T03:00:00.000Z");

const aggregate = {
  visible_actions: 3,
  distinct_locations: 2,
  waste_kg: "10",
  cigarette_butts: 200,
  volunteers: 6,
  participants_total: 6,
  total_duration_minutes: 120,
  action_distribution: [
    { key: "spontaneous:2", category: "Duo", count: 1 },
    { key: "association", category: "Association", count: 2 },
  ],
  classification_warnings: [],
  butts_by_condition: [{ condition: "propre", count: 200 }],
};

function existingSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "snapshot-id",
    snapshotKey: "cleanmymap-impact-terrain-2026",
    snapshotDate: "2026-08-01",
    generatedAt: "2026-08-01T03:00:00.000Z",
    version: PUBLIC_IMPACT_SNAPSHOT_VERSION,
    title: "Snapshot public mensuel Impact terrain 2026",
    payload: buildPublicImpactSnapshotPayload({
      aggregate,
      generatedAt: "2026-08-01T03:00:00.000Z",
      floorDate: "2025-08-01",
    }),
    meta: {},
    ...overrides,
  };
}

describe("public monthly impact snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAggregateMock.mockResolvedValue(aggregate);
    readLatestSnapshotMock.mockResolvedValue(existingSnapshot());
    upsertSnapshotMock.mockResolvedValue(undefined);
  });

  it("uses the first day of the UTC month and exposes the full canonical result", () => {
    expect(getImpactSnapshotMonthDate(NOW.toISOString())).toBe("2026-09-01");

    const payload = buildPublicImpactSnapshotPayload({
      aggregate,
      generatedAt: NOW.toISOString(),
      floorDate: "2025-09-08",
    });

    expect(payload.period).toEqual({
      fromDate: "2025-09-08",
      toDate: "2026-09-08",
      timezone: "UTC",
    });
    expect(payload.kpis).toMatchObject({
      participantsTotal: 6,
      totalDurationMinutes: 120,
      actionDistribution: aggregate.action_distribution,
      impactTerrain: {
        wasteKg: 10,
        buttsTotal: 200,
        co2eKg: 12,
        waterLiters: 100_000,
      },
      streetCleaningSavings: {
        massEstimateEuros: 15,
        timeEstimateEuros: 24.62,
      },
    });
    expect(payload.aggregates).toEqual({
      visibleActions: 3,
      distinctLocations: 2,
    });
    expect(payload.provenance.sourceRpc).toBe(
      "public.load_public_landing_action_summary",
    );
  });

  it("does not recalculate or persist a second snapshot in the same month", async () => {
    readLatestSnapshotMock.mockResolvedValue(
      existingSnapshot({ snapshotDate: "2026-09-01" }),
    );

    const result = await generateAndPersistPublicImpactSnapshot({ now: NOW });

    expect(result.reused).toBe(true);
    expect(result.persisted).toBe(false);
    expect(loadAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("persists one month-start snapshot when the month has no valid snapshot", async () => {
    readLatestSnapshotMock.mockResolvedValue(existingSnapshot({ snapshotDate: "2026-08-01" }));

    const result = await generateAndPersistPublicImpactSnapshot({ now: NOW });

    expect(result.persisted).toBe(true);
    expect(result.snapshot.snapshotDate).toBe("2026-09-01");
    expect(upsertSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotDate: "2026-09-01",
        version: PUBLIC_IMPACT_SNAPSHOT_VERSION,
        payload: expect.objectContaining({
          generatedAt: NOW.toISOString(),
        }),
      }),
    );
  });

  it("allows an explicitly forced rerun without changing the monthly key", async () => {
    readLatestSnapshotMock.mockResolvedValue(
      existingSnapshot({ snapshotDate: "2026-09-01" }),
    );

    const result = await generateAndPersistPublicImpactSnapshot({
      now: NOW,
      force: true,
    });

    expect(result.forced).toBe(true);
    expect(result.persisted).toBe(true);
    expect(upsertSnapshotMock).toHaveBeenCalledOnce();
    expect(upsertSnapshotMock.mock.calls[0]?.[0].snapshotDate).toBe("2026-09-01");
  });

  it("does not persist when the aggregate calculation fails", async () => {
    loadAggregateMock.mockRejectedValue(new Error("aggregate unavailable"));

    await expect(
      generateAndPersistPublicImpactSnapshot({ now: NOW }),
    ).rejects.toThrow("aggregate unavailable");
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("propagates persistence failure without replacing the previous snapshot", async () => {
    readLatestSnapshotMock.mockResolvedValue(
      existingSnapshot({ snapshotDate: "2026-08-01" }),
    );
    upsertSnapshotMock.mockRejectedValue(new Error("persistence unavailable"));

    await expect(
      generateAndPersistPublicImpactSnapshot({ now: NOW }),
    ).rejects.toThrow("persistence unavailable");
    expect(upsertSnapshotMock).toHaveBeenCalledOnce();
    expect(readLatestSnapshotMock).toHaveBeenCalledOnce();
  });
});
