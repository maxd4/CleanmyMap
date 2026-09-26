import {
  buildLandingFloorDate,
  advancePublicImpactActionState,
  loadIncrementalPublicLandingActionSummary,
  rebuildPublicImpactActionState,
  type PublicLandingActionSummaryRow,
} from "@/lib/accueil/public-landing-action-summary";
import {
  buildPublicLandingActionMetricsFromAggregate,
  type PublicLandingActionAggregation,
} from "@/lib/accueil/action-participant-aggregation";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION } from "./impact-terrain-2026-results";
import {
  getPublicSurfaceSnapshotDate,
  readLatestPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";

export const PUBLIC_IMPACT_SNAPSHOT_KEY = "cleanmymap-impact-terrain-2026";
export const PUBLIC_IMPACT_SNAPSHOT_VERSION =
  "impact-terrain-public-2026.09-v3-null-coverage";
export const PUBLIC_IMPACT_SNAPSHOT_TITLE =
  "Snapshot public mensuel Impact terrain 2026";

export type PublicImpactSnapshotPayload = {
  period: {
    fromDate: string;
    toDate: string;
    timezone: "UTC";
  };
  generatedAt: string;
  methodologyVersion: string;
  resultsContractVersion: string;
  kpis: PublicLandingActionAggregation;
  aggregates: {
    visibleActions: number;
    distinctLocations: number;
  };
  provenance: {
    sourceRpc: "public.load_public_landing_action_summary_incremental";
    sourceMode: "incremental" | "rebuild";
    scope: {
      actionType: "action";
      status: "approved";
      visibility: "visible";
      excludesTestDemoData: true;
      floorDate: string;
    };
    calculationDomain: readonly string[];
  };
};

export type PublicImpactSnapshotRecord = PublicSurfaceSnapshotRecord<
  PublicImpactSnapshotPayload
>;

export type GeneratePublicImpactSnapshotResult = {
  snapshot: PublicImpactSnapshotRecord;
  persisted: boolean;
  reused: boolean;
  forced: boolean;
};

function toFiniteNonNegativeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function getImpactSnapshotMonthDate(generatedAt: string): string {
  const parsed = new Date(generatedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid impact snapshot generation date.");
  }

  return `${parsed.toISOString().slice(0, 7)}-01`;
}

export function buildPublicImpactSnapshotPayload(params: {
  aggregate: PublicLandingActionSummaryRow;
  generatedAt: string;
  floorDate: string;
  sourceMode?: "incremental" | "rebuild";
}): PublicImpactSnapshotPayload {
  const kpis = buildPublicLandingActionMetricsFromAggregate(params.aggregate);

  return {
    period: {
      fromDate: params.floorDate,
      toDate: getPublicSurfaceSnapshotDate(params.generatedAt),
      timezone: "UTC",
    },
    generatedAt: params.generatedAt,
    methodologyVersion: IMPACT_PROXY_CONFIG.version,
    resultsContractVersion: IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION,
    kpis,
    aggregates: {
      visibleActions: toFiniteNonNegativeNumber(params.aggregate.visible_actions),
      distinctLocations: toFiniteNonNegativeNumber(
        params.aggregate.distinct_locations,
      ),
    },
    provenance: {
      sourceRpc: "public.load_public_landing_action_summary_incremental",
      sourceMode: params.sourceMode ?? "incremental",
      scope: {
        actionType: "action",
        status: "approved",
        visibility: "visible",
        excludesTestDemoData: true,
        floorDate: params.floorDate,
      },
      calculationDomain: [
        "apps/web/src/lib/impact/impact-terrain-2026.ts",
        "apps/web/src/lib/impact/impact-terrain-2026-results.ts",
        "apps/web/src/lib/impact/public-impact-kpis.ts",
        "apps/web/src/lib/accueil/action-participant-aggregation.ts",
        "apps/web/supabase/migrations/20260908000001_incremental_public_impact_state.sql",
        "apps/web/supabase/migrations/20260913000002_public_impact_kpi_parity.sql",
        "apps/web/supabase/migrations/20260913000006_restore_historical_waste_null_semantics.sql",
      ],
    },
  };
}

function isPublicImpactSnapshotPayload(
  value: unknown,
): value is PublicImpactSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<PublicImpactSnapshotPayload>;
  return Boolean(
    payload.period &&
      typeof payload.period.fromDate === "string" &&
      typeof payload.period.toDate === "string" &&
      payload.period.timezone === "UTC" &&
      typeof payload.generatedAt === "string" &&
      typeof payload.methodologyVersion === "string" &&
      typeof payload.resultsContractVersion === "string" &&
      typeof payload.kpis === "object" &&
      payload.kpis !== null &&
      typeof payload.aggregates === "object" &&
      payload.aggregates !== null &&
      payload.provenance &&
      payload.provenance.sourceRpc ===
        "public.load_public_landing_action_summary_incremental" &&
      (payload.provenance.sourceMode === "incremental" ||
        payload.provenance.sourceMode === "rebuild") &&
      payload.provenance.scope &&
      payload.provenance.scope.actionType === "action" &&
      payload.provenance.scope.status === "approved" &&
      payload.provenance.scope.visibility === "visible" &&
      payload.provenance.scope.excludesTestDemoData === true &&
      typeof payload.provenance.scope.floorDate === "string",
  );
}

function isValidUtcDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isCurrentImpactSnapshotPeriod(
  snapshot: PublicImpactSnapshotRecord,
  now: Date,
): boolean {
  return (
    snapshot.snapshotDate === getImpactSnapshotMonthDate(now.toISOString()) &&
    snapshot.snapshotDate === getImpactSnapshotMonthDate(snapshot.generatedAt)
  );
}

function hasCoherentImpactSnapshotPeriod(
  snapshot: PublicImpactSnapshotRecord,
  payload: PublicImpactSnapshotPayload,
  generatedDate: string,
  generatedFloorDate: string,
): boolean {
  return (
    isValidUtcDate(snapshot.snapshotDate) &&
    isValidUtcDate(payload.period.fromDate) &&
    isValidUtcDate(payload.period.toDate) &&
    payload.period.toDate === generatedDate &&
    payload.period.fromDate === generatedFloorDate &&
    payload.provenance.scope.floorDate === generatedFloorDate
  );
}

export function isCurrentPublicImpactSnapshot(
  snapshot: PublicImpactSnapshotRecord | null | undefined,
  now = new Date(),
): snapshot is PublicImpactSnapshotRecord {
  if (!snapshot || !isPublicImpactSnapshotPayload(snapshot.payload)) {
    return false;
  }

  if (!Number.isFinite(new Date(snapshot.generatedAt).getTime())) {
    return false;
  }

  const generatedAt = new Date(snapshot.generatedAt);
  const generatedDate = getPublicSurfaceSnapshotDate(snapshot.generatedAt);
  const generatedFloorDate = buildLandingFloorDate(generatedAt);
  const payload = snapshot.payload;

  return (
    snapshot.snapshotKey === PUBLIC_IMPACT_SNAPSHOT_KEY &&
    isCurrentImpactSnapshotPeriod(snapshot, now) &&
    snapshot.version === PUBLIC_IMPACT_SNAPSHOT_VERSION &&
    snapshot.generatedAt === payload.generatedAt &&
    hasCoherentImpactSnapshotPeriod(
      snapshot,
      payload,
      generatedDate,
      generatedFloorDate,
    ) &&
    payload.methodologyVersion === IMPACT_PROXY_CONFIG.version &&
    payload.resultsContractVersion ===
      IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION
  );
}

export async function loadLatestPublicImpactSnapshot(
  now = new Date(),
): Promise<PublicImpactSnapshotRecord | null> {
  const snapshot = await readLatestPublicSurfaceSnapshot<PublicImpactSnapshotPayload>(
    PUBLIC_IMPACT_SNAPSHOT_KEY,
  );

  if (!isCurrentPublicImpactSnapshot(snapshot, now)) {
    return null;
  }

  return snapshot;
}

export async function generateAndPersistPublicImpactSnapshot(params: {
  now?: Date;
  force?: boolean;
  rebuild?: boolean;
} = {}): Promise<GeneratePublicImpactSnapshotResult> {
  const now = params.now ?? new Date();
  const generatedAt = now.toISOString();
  const monthDate = getImpactSnapshotMonthDate(generatedAt);
  const current = await loadLatestPublicImpactSnapshot(now);

  const floorDate = buildLandingFloorDate(now);
  if (params.rebuild) {
    await rebuildPublicImpactActionState(floorDate);
  } else {
    await advancePublicImpactActionState(floorDate);
  }

  if (
    !params.force &&
    !params.rebuild &&
    current?.snapshotDate === monthDate &&
    current.version === PUBLIC_IMPACT_SNAPSHOT_VERSION
  ) {
    return {
      snapshot: current,
      persisted: false,
      reused: true,
      forced: false,
    };
  }

  const aggregate = await loadIncrementalPublicLandingActionSummary();
  const payload = buildPublicImpactSnapshotPayload({
    aggregate,
    generatedAt,
    floorDate,
    sourceMode: params.rebuild ? "rebuild" : "incremental",
  });
  const snapshot: Omit<PublicImpactSnapshotRecord, "id"> = {
    snapshotKey: PUBLIC_IMPACT_SNAPSHOT_KEY,
    snapshotDate: monthDate,
    generatedAt,
    version: PUBLIC_IMPACT_SNAPSHOT_VERSION,
    title: PUBLIC_IMPACT_SNAPSHOT_TITLE,
    payload,
    meta: {
      periodFromDate: floorDate,
      periodToDate: payload.period.toDate,
      methodologyVersion: payload.methodologyVersion,
      sourceRpc: payload.provenance.sourceRpc,
      sourceMode: payload.provenance.sourceMode,
    },
  };

  await upsertPublicSurfaceSnapshot(snapshot);

  return {
    snapshot: {
      id: `${snapshot.snapshotKey}:${snapshot.snapshotDate}`,
      ...snapshot,
    },
    persisted: true,
    reused: false,
    forced: Boolean(params.force),
  };
}
