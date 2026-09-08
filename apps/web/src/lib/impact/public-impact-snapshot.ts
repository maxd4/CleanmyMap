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
  "impact-terrain-public-2026.09-v2";
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
        "apps/web/src/lib/accueil/action-participant-aggregation.ts",
        "apps/web/supabase/migrations/20260908000001_incremental_public_impact_state.sql",
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
      payload.kpis &&
      payload.aggregates &&
      payload.provenance &&
      payload.provenance.sourceRpc ===
        "public.load_public_landing_action_summary_incremental" &&
      (payload.provenance.sourceMode === "incremental" ||
        payload.provenance.sourceMode === "rebuild"),
  );
}

export async function loadLatestPublicImpactSnapshot(): Promise<PublicImpactSnapshotRecord | null> {
  const snapshot = await readLatestPublicSurfaceSnapshot<PublicImpactSnapshotPayload>(
    PUBLIC_IMPACT_SNAPSHOT_KEY,
  );

  if (!snapshot || !isPublicImpactSnapshotPayload(snapshot.payload)) {
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
  const current = await loadLatestPublicImpactSnapshot();

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
