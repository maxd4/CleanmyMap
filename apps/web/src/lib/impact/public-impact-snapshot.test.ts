import { beforeEach, describe, expect, it, vi } from "vitest";

const loadIncrementalAggregateMock = vi.hoisted(() => vi.fn());
const loadFullAggregateMock = vi.hoisted(() => vi.fn());
const advanceStateMock = vi.hoisted(() => vi.fn());
const rebuildStateMock = vi.hoisted(() => vi.fn());
const readLatestSnapshotMock = vi.hoisted(() => vi.fn());
const upsertSnapshotMock = vi.hoisted(() => vi.fn());
const requirePersistedSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/accueil/public-landing-action-summary", () => ({
  buildLandingFloorDate: (now: Date) => {
    const floor = new Date(now);
    floor.setUTCHours(0, 0, 0, 0);
    floor.setUTCDate(floor.getUTCDate() - 365);
    return floor.toISOString().slice(0, 10);
  },
  loadIncrementalPublicLandingActionSummary: loadIncrementalAggregateMock,
  loadPublicLandingActionSummary: loadFullAggregateMock,
  advancePublicImpactActionState: advanceStateMock,
  rebuildPublicImpactActionState: rebuildStateMock,
}));

vi.mock("@/lib/public-surface-snapshots", () => ({
  getPublicSurfaceSnapshotDate: (value: string) => value.slice(0, 10),
  readLatestPublicSurfaceSnapshot: readLatestSnapshotMock,
  requirePersistedPublicSurfaceSnapshot: requirePersistedSnapshotMock,
  upsertPublicSurfaceSnapshot: upsertSnapshotMock,
}));

import {
  buildPublicImpactSnapshotPayload,
  generateAndPersistPublicImpactSnapshot,
  getImpactSnapshotMonthDate,
  loadLatestPublicImpactSnapshot,
  isCurrentPublicImpactSnapshot,
  HISTORICAL_PUBLIC_IMPACT_SNAPSHOT_V1_VERSION,
  PUBLIC_IMPACT_SNAPSHOT_VERSION,
  type PublicImpactSnapshotPayload,
  type PublicImpactSnapshotRecord,
} from "./public-impact-snapshot";
import { PUBLIC_IMPACT_PROJECTION_VERSION } from "@/lib/impact/scientific-projection-versions";

const NOW = new Date("2026-09-08T03:00:00.000Z");
const LATER_IN_SAME_MONTH = new Date("2026-09-26T12:00:00.000Z");

const aggregate = {
  visible_actions: 3,
  distinct_locations: 2,
  waste_kg: "10",
  waste_source_count: 2,
  cigarette_butts: 200,
  volunteers: 6,
  participants_total: 6,
  total_duration_minutes: 120,
  action_distribution: [
    { key: "spontaneous:2", category: "Duo", count: 1 },
    { key: "association", category: "Association", count: 2 },
  ],
  classification_warnings: [],
  butts_by_condition: [{
    condition: "propre",
    count: 200,
    massContributions: [{
      count: 200,
      massKg: 0.044,
      massProvenance: "estimated",
      conversionVersion: "impact-terrain-2026-butts-mass-v2",
    }],
  }],
  methodology_version: "impact-terrain-public-2026.09-v7",
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

function currentSnapshot(overrides: Record<string, unknown> = {}) {
  return existingSnapshot({
    snapshotDate: "2026-09-01",
    generatedAt: NOW.toISOString(),
    payload: buildPublicImpactSnapshotPayload({
      aggregate,
      generatedAt: NOW.toISOString(),
      floorDate: "2025-09-08",
    }),
    ...overrides,
  });
}

const OBSERVED_HISTORICAL_V1_PAYLOAD = {
  period: {
    fromDate: "2025-09-08",
    toDate: "2026-09-08",
    timezone: "UTC" as const,
  },
  generatedAt: "2026-09-08T07:16:23.009Z",
  methodologyVersion: "impact-proxy-2026.04-v1",
  resultsContractVersion: "impact-terrain-results-2026.09-v1",
  kpis: {
    actionsCount: 12,
    wasteKnownActions: 10,
    wasteCoverageRate: 83.33333333333333,
    participantsTotal: 31,
    participantsKnownActions: 11,
    participantsUnknownActions: 1,
    totalDurationMinutes: 90,
    totalDurationHours: 1.5,
    actionDistribution: [
      { key: "company", category: "Entreprise", count: 2 },
    ],
    classificationWarnings: [],
    streetCleaningSavings: {
      wasteKg: 25.5,
      durationMinutes: 90,
      actionHours: 1.5,
      massEstimateEuros: 38.25,
      timeEstimateEuros: 18.465,
      lowerBoundEuros: 18.465,
      upperBoundEuros: 38.25,
    },
    impactTerrain: {
      wasteKg: 25.5,
      wasteKnownActions: 10,
      wasteCoverageRate: 83.33333333333333,
      wasteBagsEquivalent: 5.1,
      wasteMechanicalBicyclesEquivalent: 1.275,
      buttsTotal: 1250,
      qualifiedButtsTotal: 1250,
      unqualifiedButtsTotal: 0,
      buttsByCondition: [
        {
          condition: "propre",
          label: { fr: "Propre", en: "Clean" },
          count: 1250,
          estimatedWeightKg: 0.5,
          massProvenance: "estimated",
          conversionVersions: ["impact-terrain-2026-butts-mass-v1"],
        },
      ],
      estimatedButtsWeightKg: 0.5,
      buttsMassProvenance: "estimated",
      buttsMassConversionVersions: ["impact-terrain-2026-butts-mass-v1"],
      buttsDistanceMeters: 31.25,
      co2eKg: 10.625,
      co2eGrams: 10625,
      co2CarKilometers: 66.40625,
      co2ParisMoscowCarTrips: 0.001,
      co2ParisNewYorkFlightShares: 0.0001,
      waterLiters: 625000,
      waterOlympicPools: 0.25,
      waterFrenchPersonYears: 0.034,
    },
  },
  aggregates: {
    visibleActions: 12,
    distinctLocations: 4,
  },
  provenance: {
    sourceRpc: "public.load_public_landing_action_summary" as const,
    scope: {
      actionType: "action" as const,
      status: "approved" as const,
      visibility: "visible" as const,
      excludesTestDemoData: true as const,
      floorDate: "2025-09-08",
    },
    calculationDomain: [
      "apps/web/src/lib/impact/impact-terrain-2026.ts",
      "apps/web/src/lib/accueil/action-participant-aggregation.ts",
    ],
  },
} satisfies PublicImpactSnapshotPayload;

type HistoricalSnapshotOverrides = Omit<
  Partial<PublicImpactSnapshotRecord>,
  "payload"
> & {
  payload?: unknown;
};

function historicalV1Snapshot(
  overrides: HistoricalSnapshotOverrides = {},
): PublicImpactSnapshotRecord {
  return {
    id: "historical-v1-snapshot-id",
    snapshotKey: "cleanmymap-impact-terrain-2026",
    snapshotDate: "2026-09-01",
    generatedAt: "2026-09-08T07:16:23.009+00:00",
    version: HISTORICAL_PUBLIC_IMPACT_SNAPSHOT_V1_VERSION,
    title: "Snapshot public mensuel Impact terrain 2026",
    payload: {
      ...OBSERVED_HISTORICAL_V1_PAYLOAD,
    },
    meta: {},
    ...overrides,
  } as PublicImpactSnapshotRecord;
}

async function expectSnapshotRegenerated(snapshot: ReturnType<typeof currentSnapshot>) {
  expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(false);
  readLatestSnapshotMock.mockResolvedValue(snapshot);

  const result = await generateAndPersistPublicImpactSnapshot({ now: NOW });

  expect(result.persisted).toBe(true);
  expect(result.reused).toBe(false);
  expect(loadIncrementalAggregateMock).toHaveBeenCalledOnce();
  expect(upsertSnapshotMock).toHaveBeenCalledOnce();
}

describe("public monthly impact snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadIncrementalAggregateMock.mockResolvedValue(aggregate);
    loadFullAggregateMock.mockResolvedValue(aggregate);
    advanceStateMock.mockResolvedValue(undefined);
    rebuildStateMock.mockResolvedValue(undefined);
    readLatestSnapshotMock.mockResolvedValue(existingSnapshot());
    upsertSnapshotMock.mockResolvedValue(undefined);
    requirePersistedSnapshotMock.mockResolvedValue(existingSnapshot());
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
    expect(payload.projectionVersion).toBe("impact-terrain-public-2026.09-v7");
    expect(payload.kpis).toMatchObject({
      participantsTotal: 6,
      totalDurationMinutes: 120,
      actionDistribution: aggregate.action_distribution,
      impactTerrain: {
        wasteKg: 10,
        buttsTotal: 200,
        estimatedButtsWeightKg: 0.044,
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
      "public.load_public_landing_action_summary_incremental",
    );
    expect(payload.provenance.sourceMode).toBe("incremental");
    expect(payload.provenance.calculationDomain).toContain(
      "apps/web/supabase/migrations/20260913000002_public_impact_kpi_parity.sql",
    );
  });

  it("serves the latest valid previous-month snapshot when the current cron has not produced one", async () => {
    const snapshot = existingSnapshot();
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(snapshot);
    expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(false);
  });

  it("reads the observed v1 historical envelope without rewriting its contract", async () => {
    const snapshot = historicalV1Snapshot();
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(snapshot);
    expect(snapshot.version).toBe("impact-terrain-public-2026.09-v1");
    expect(snapshot.payload.provenance.sourceRpc).toBe(
      "public.load_public_landing_action_summary",
    );
    expect("sourceMode" in snapshot.payload.provenance).toBe(false);
    expect("projectionVersion" in snapshot.payload).toBe(false);
    expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(false);
    expect(loadIncrementalAggregateMock).not.toHaveBeenCalled();
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
    expect(advanceStateMock).not.toHaveBeenCalled();
    expect(rebuildStateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("accepts equivalent SQL and UTC timestamps for a current v7 snapshot", async () => {
    const snapshot = currentSnapshot({
      generatedAt: "2026-09-08T07:16:23.009+00:00",
      payload: {
        ...currentSnapshot().payload,
        generatedAt: "2026-09-08T07:16:23.009Z",
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(snapshot);
    expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(true);
  });

  it.each([
    [
      "different instants",
      {
        generatedAt: "2026-09-08T07:16:24.009+00:00",
      },
    ],
    ["invalid row timestamp", { generatedAt: "not-a-timestamp" }],
    [
      "invalid payload timestamp",
      {
        payload: {
          ...OBSERVED_HISTORICAL_V1_PAYLOAD,
          generatedAt: "not-a-timestamp",
        },
      },
    ],
  ])("rejects snapshots with %s", async (_reason, overrides) => {
    const snapshot = historicalV1Snapshot(overrides);
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a suffixed methodology", {
      methodologyVersion: "impact-proxy-2026.04-v1+factors-deadbeef",
    }],
    ["a projection version", { projectionVersion: "impact-terrain-public-2026.09-v7" }],
    ["a source mode", { sourceMode: "rebuild" }],
  ])("rejects v1 snapshots with %s", async (_reason, provenanceOrPayload) => {
    const sourceMode = "sourceMode" in provenanceOrPayload
      ? { provenance: { ...OBSERVED_HISTORICAL_V1_PAYLOAD.provenance, sourceMode: provenanceOrPayload.sourceMode } }
      : {};
    const snapshot = historicalV1Snapshot({
      payload: {
        ...OBSERVED_HISTORICAL_V1_PAYLOAD,
        ...provenanceOrPayload,
        ...sourceMode,
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
  });

  it("rejects an invalid historical RPC", async () => {
    const snapshot = historicalV1Snapshot({
      payload: {
        ...OBSERVED_HISTORICAL_V1_PAYLOAD,
        provenance: {
          ...OBSERVED_HISTORICAL_V1_PAYLOAD.provenance,
          sourceRpc: "public.unknown_snapshot_source",
        },
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
  });

  it.each([
    ["empty kpis", { kpis: {} }],
    ["empty aggregates", { aggregates: {} }],
    [
      "invalid impact terrain",
      { kpis: { ...OBSERVED_HISTORICAL_V1_PAYLOAD.kpis, impactTerrain: {} } },
    ],
  ])("rejects a snapshot with %s", async (_reason, payloadOverride) => {
    const snapshot = historicalV1Snapshot({
      payload: {
        ...OBSERVED_HISTORICAL_V1_PAYLOAD,
        ...payloadOverride,
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
  });

  it("rejects an unknown historical envelope or provenance", async () => {
    const snapshot = historicalV1Snapshot({
      payload: {
        ...historicalV1Snapshot().payload,
        provenance: {
          ...historicalV1Snapshot().payload.provenance,
          sourceRpc: "public.unknown_snapshot_source",
        },
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("conserve la lecture d'un snapshot historique sans réutiliser sa méthode", async () => {
    const snapshot = existingSnapshot({
      payload: {
        ...existingSnapshot().payload,
        methodologyVersion: "impact-proxy-2026.04-v1",
      },
    });

    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(snapshot);
    expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(false);
  });

  it("lit une empreinte historique mais ne la réutilise pas comme résultat courant", async () => {
    const snapshot = existingSnapshot({
      payload: {
        ...existingSnapshot().payload,
        methodologyVersion: "impact-proxy-2026.04-v1+factors-deadbeef",
      },
    });
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(snapshot);
    expect(isCurrentPublicImpactSnapshot(snapshot, NOW)).toBe(false);

    const result = await generateAndPersistPublicImpactSnapshot({ now: NOW });

    expect(result.reused).toBe(false);
    expect(result.persisted).toBe(true);
    expect(upsertSnapshotMock).toHaveBeenCalledOnce();
  });

  it("does not recalculate or persist a second snapshot in the same month", async () => {
    const snapshot = currentSnapshot();
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    const result = await generateAndPersistPublicImpactSnapshot({ now: NOW });

    expect(result.reused).toBe(true);
    expect(result.persisted).toBe(false);
    expect(advanceStateMock).not.toHaveBeenCalled();
    expect(loadIncrementalAggregateMock).not.toHaveBeenCalled();
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("réutilise un snapshot valide généré plus tôt dans le même mois", async () => {
    const snapshot = currentSnapshot();

    expect(isCurrentPublicImpactSnapshot(snapshot, LATER_IN_SAME_MONTH)).toBe(true);
    readLatestSnapshotMock.mockResolvedValue(snapshot);

    const result = await generateAndPersistPublicImpactSnapshot({
      now: LATER_IN_SAME_MONTH,
    });

    expect(result.reused).toBe(true);
    expect(result.persisted).toBe(false);
    expect(advanceStateMock).not.toHaveBeenCalled();
    expect(loadIncrementalAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("rejette explicitement une version publique obsolète", () => {
    const snapshot = currentSnapshot({
      version: "impact-terrain-public-2026.09-v1",
    });

    expect(isCurrentPublicImpactSnapshot(snapshot, LATER_IN_SAME_MONTH)).toBe(false);
  });

  it("ne sert pas un snapshot incompatible, même s'il appartient au mois courant", async () => {
    readLatestSnapshotMock.mockResolvedValue(
      currentSnapshot({ version: "impact-terrain-public-incompatible" }),
    );

    await expect(loadLatestPublicImpactSnapshot()).resolves.toBeNull();
    expect(loadIncrementalAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("rejette un snapshot d'un autre mois", () => {
    const snapshot = currentSnapshot({ snapshotDate: "2026-08-01" });

    expect(isCurrentPublicImpactSnapshot(snapshot, LATER_IN_SAME_MONTH)).toBe(false);
  });

  it("rejects a same-month snapshot when its formula version is stale", async () => {
    const snapshot = currentSnapshot({
      payload: {
        ...currentSnapshot().payload,
        methodologyVersion: "impact-proxy-stale",
      },
    });

    await expectSnapshotRegenerated(snapshot);
  });

  it("rejects a same-month snapshot when its projection version is stale", async () => {
    const snapshot = currentSnapshot({
      payload: {
        ...currentSnapshot().payload,
        projectionVersion: "impact-terrain-public-2026.09-v2",
      },
    });

    expect(snapshot.payload.projectionVersion).not.toBe(PUBLIC_IMPACT_PROJECTION_VERSION);
    await expectSnapshotRegenerated(snapshot);
  });

  it("rejects a same-month snapshot when its period is incoherent with its generation date", async () => {
    const valid = currentSnapshot();
    const snapshot = {
      ...valid,
      payload: {
        ...valid.payload,
        period: {
          ...valid.payload.period,
          fromDate: "2026-09-07",
          toDate: "2026-09-07",
        },
        provenance: {
          ...valid.payload.provenance,
          scope: {
            ...valid.payload.provenance.scope,
            floorDate: "2026-09-07",
          },
        },
      },
    };

    await expectSnapshotRegenerated(snapshot);
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
    expect(advanceStateMock).toHaveBeenCalledWith("2025-09-08");
    expect(loadIncrementalAggregateMock).toHaveBeenCalledOnce();
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
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
    expect(advanceStateMock).toHaveBeenCalledWith("2025-09-08");
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
  });

  it("ne retourne pas la reconstruction locale si la persistance la refuse sans gagnant relisible", async () => {
    const conflict = new Error("no persisted winner");
    readLatestSnapshotMock.mockResolvedValue(existingSnapshot({ snapshotDate: "2026-08-01" }));
    upsertSnapshotMock.mockResolvedValue("ignored_older");
    requirePersistedSnapshotMock.mockRejectedValue(conflict);

    await expect(
      generateAndPersistPublicImpactSnapshot({ now: NOW }),
    ).rejects.toBe(conflict);
  });

  it("uses the explicit rebuild mode without using the full-scan RPC in the normal path", async () => {
    const result = await generateAndPersistPublicImpactSnapshot({
      now: NOW,
      rebuild: true,
    });

    expect(result.persisted).toBe(true);
    expect(rebuildStateMock).toHaveBeenCalledWith("2025-09-08");
    expect(advanceStateMock).not.toHaveBeenCalled();
    expect(loadIncrementalAggregateMock).toHaveBeenCalledOnce();
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock.mock.calls[0]?.[0].payload.provenance.sourceMode).toBe(
      "rebuild",
    );
  });

  it("does not persist when the aggregate calculation fails", async () => {
    loadIncrementalAggregateMock.mockRejectedValue(new Error("aggregate unavailable"));

    await expect(
      generateAndPersistPublicImpactSnapshot({ now: NOW }),
    ).rejects.toThrow("aggregate unavailable");
    expect(loadFullAggregateMock).not.toHaveBeenCalled();
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("keeps the previous valid snapshot readable after a failed monthly generation", async () => {
    const previous = existingSnapshot();
    readLatestSnapshotMock.mockResolvedValue(previous);
    loadIncrementalAggregateMock.mockRejectedValue(new Error("cron aggregate unavailable"));

    await expect(
      generateAndPersistPublicImpactSnapshot({ now: NOW }),
    ).rejects.toThrow("cron aggregate unavailable");
    await expect(loadLatestPublicImpactSnapshot()).resolves.toBe(previous);
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

  it("coalesces concurrent scheduled generations before the heavy aggregate call", async () => {
    let releaseAggregate!: () => void;
    let signalAggregateStarted!: () => void;
    const aggregateGate = new Promise<void>((resolve) => {
      releaseAggregate = resolve;
    });
    const aggregateStarted = new Promise<void>((resolve) => {
      signalAggregateStarted = resolve;
    });
    loadIncrementalAggregateMock.mockImplementation(async () => {
      signalAggregateStarted();
      await aggregateGate;
      return aggregate;
    });

    const first = generateAndPersistPublicImpactSnapshot({ now: NOW });
    await aggregateStarted;
    const second = generateAndPersistPublicImpactSnapshot({ now: NOW });
    releaseAggregate();

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toBe(secondResult);
    expect(loadIncrementalAggregateMock).toHaveBeenCalledOnce();
    expect(advanceStateMock).toHaveBeenCalledOnce();
    expect(upsertSnapshotMock).toHaveBeenCalledOnce();
    expect(readLatestSnapshotMock).toHaveBeenCalledOnce();
  });
});
