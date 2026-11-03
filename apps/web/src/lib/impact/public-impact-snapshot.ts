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
import {
  IMPACT_PROXY_CONFIG,
  isCurrentImpactProxyVersion,
  isKnownImpactProxyVersion,
} from "@/lib/gamification/progression/impact-proxy-config";
import { MEGOTS_CONDITIONS } from "./impact-terrain-2026";
import {
  isKnownPublicImpactProjectionVersion,
  PUBLIC_IMPACT_PROJECTION_VERSION,
} from "./scientific-projection-versions";
import { IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION } from "./impact-terrain-2026-results";
import {
  getPublicSurfaceSnapshotDate,
  readLatestPublicSurfaceSnapshot,
  readPublicSurfaceSnapshotHistory,
  requirePersistedPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";

export const PUBLIC_IMPACT_SNAPSHOT_KEY = "cleanmymap-impact-terrain-2026";
export const PUBLIC_IMPACT_SNAPSHOT_VERSION =
  "impact-terrain-public-2026.09-v7-volume-lot-reconciliation";
export const HISTORICAL_PUBLIC_IMPACT_SNAPSHOT_V1_VERSION =
  "impact-terrain-public-2026.09-v1";
const HISTORICAL_PUBLIC_IMPACT_PROXY_V1_VERSION =
  "impact-proxy-2026.04-v1";
const PUBLIC_IMPACT_SNAPSHOT_TITLE =
  "Snapshot public mensuel Impact terrain 2026";

export type PublicImpactSnapshotPayload = {
  period: {
    fromDate: string;
    toDate: string;
    timezone: "UTC";
  };
  generatedAt: string;
  methodologyVersion: string;
  projectionVersion?: string;
  resultsContractVersion: string;
  kpis: PublicLandingActionAggregation;
  aggregates: {
    visibleActions: number;
    distinctLocations: number;
  };
  provenance: {
    sourceRpc:
      | "public.load_public_landing_action_summary_incremental"
      | "public.load_public_landing_action_summary";
    sourceMode?: "incremental" | "rebuild";
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

type InFlightImpactSnapshotGeneration = {
  token: symbol;
  promise: Promise<GeneratePublicImpactSnapshotResult>;
};

const inFlightImpactSnapshotGenerations = new Map<
  string,
  InFlightImpactSnapshotGeneration
>();

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
    projectionVersion: PUBLIC_IMPACT_PROJECTION_VERSION,
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
        "apps/web/supabase/migrations/20261101000008_public_impact_butt_mass_provenance.sql",
        "apps/web/supabase/migrations/20261101000012_scientific_projection_volume_lot_reconciliation.sql",
      ],
    },
  };
}

function isValidPublicImpactSnapshotPayload(
  value: unknown,
): value is PublicImpactSnapshotPayload {
  return isValidPublicImpactSnapshotEnvelope(
    value,
    isValidPublicImpactKpiStructure,
  );
}

function isValidPublicImpactSnapshotEnvelope(
  value: unknown,
  validateKpis: (value: unknown) => boolean,
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
      (payload.projectionVersion === undefined ||
        typeof payload.projectionVersion === "string") &&
      typeof payload.resultsContractVersion === "string" &&
      typeof payload.kpis === "object" &&
      payload.kpis !== null &&
      typeof payload.aggregates === "object" &&
      payload.aggregates !== null &&
      payload.provenance &&
      (payload.provenance.sourceRpc ===
        "public.load_public_landing_action_summary_incremental" ||
        payload.provenance.sourceRpc ===
          "public.load_public_landing_action_summary") &&
      (payload.provenance.sourceMode === undefined ||
        payload.provenance.sourceMode === "incremental" ||
        payload.provenance.sourceMode === "rebuild") &&
      payload.provenance.scope &&
      payload.provenance.scope.actionType === "action" &&
      payload.provenance.scope.status === "approved" &&
      payload.provenance.scope.visibility === "visible" &&
      payload.provenance.scope.excludesTestDemoData === true &&
      typeof payload.provenance.scope.floorDate === "string" &&
      Array.isArray(payload.provenance.calculationDomain) &&
      payload.provenance.calculationDomain.every(
        (entry) => typeof entry === "string",
      ) &&
      validateKpis(payload.kpis) &&
      isValidPublicImpactAggregateStructure(payload.aggregates),
  );
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNullableFiniteNonNegativeNumber(value: unknown): value is number | null {
  return value === null || isFiniteNonNegativeNumber(value);
}

function hasFiniteNonNegativeFields(
  value: UnknownRecord,
  fields: readonly string[],
): boolean {
  return fields.every((field) => isFiniteNonNegativeNumber(value[field]));
}

function isValidActionDistribution(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.key === "string" &&
        entry.key.length > 0 &&
        typeof entry.category === "string" &&
        entry.category.length > 0 &&
        isFiniteNonNegativeNumber(entry.count),
    )
  );
}

function isValidClassificationWarnings(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.code === "string" &&
        entry.code.length > 0 &&
        isFiniteNonNegativeNumber(entry.count),
    )
  );
}

function isValidStreetCleaningSavings(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasFiniteNonNegativeFields(value, [
      "wasteKg",
      "durationMinutes",
      "actionHours",
      "massEstimateEuros",
      "timeEstimateEuros",
      "lowerBoundEuros",
      "upperBoundEuros",
    ])
  );
}

function isValidImpactTerrainConditionEntry(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.condition === "string" &&
    MEGOTS_CONDITIONS.includes(
      value.condition as (typeof MEGOTS_CONDITIONS)[number],
    ) &&
    isRecord(value.label) &&
    typeof value.label.fr === "string" &&
    typeof value.label.en === "string" &&
    isFiniteNonNegativeNumber(value.count) &&
    isNullableFiniteNonNegativeNumber(value.estimatedWeightKg) &&
    (value.massProvenance === "measured" ||
      value.massProvenance === "estimated" ||
      value.massProvenance === "mixed" ||
      value.massProvenance === "unknown") &&
    Array.isArray(value.conversionVersions) &&
    value.conversionVersions.every((version) => typeof version === "string")
  );
}

function isValidImpactTerrainResults(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasFiniteNonNegativeFields(value, [
      "wasteKg",
      "wasteKnownActions",
      "wasteCoverageRate",
      "wasteBagsEquivalent",
      "wasteMechanicalBicyclesEquivalent",
      "buttsTotal",
      "qualifiedButtsTotal",
      "unqualifiedButtsTotal",
      "buttsDistanceMeters",
      "co2eKg",
      "co2eGrams",
      "co2CarKilometers",
      "co2ParisMoscowCarTrips",
      "co2ParisNewYorkFlightShares",
      "waterLiters",
      "waterOlympicPools",
      "waterFrenchPersonYears",
    ]) &&
    Array.isArray(value.buttsByCondition) &&
    value.buttsByCondition.every(isValidImpactTerrainConditionEntry) &&
    isNullableFiniteNonNegativeNumber(value.estimatedButtsWeightKg) &&
    (value.buttsMassProvenance === null ||
      value.buttsMassProvenance === "measured" ||
      value.buttsMassProvenance === "estimated" ||
      value.buttsMassProvenance === "mixed" ||
      value.buttsMassProvenance === "unknown") &&
    Array.isArray(value.buttsMassConversionVersions) &&
    value.buttsMassConversionVersions.every(
      (version) => typeof version === "string",
    )
  );
}

function isValidHistoricalImpactTerrainConditionEntry(
  value: unknown,
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const optionalFieldsAreValid =
    (value.estimatedWeightKg === undefined ||
      isNullableFiniteNonNegativeNumber(value.estimatedWeightKg)) &&
    (value.massProvenance === undefined ||
      value.massProvenance === "measured" ||
      value.massProvenance === "estimated" ||
      value.massProvenance === "mixed" ||
      value.massProvenance === "unknown") &&
    (value.conversionVersions === undefined ||
      (Array.isArray(value.conversionVersions) &&
        value.conversionVersions.every(
          (version) => typeof version === "string",
        )));

  return (
    typeof value.condition === "string" &&
    MEGOTS_CONDITIONS.includes(
      value.condition as (typeof MEGOTS_CONDITIONS)[number],
    ) &&
    isRecord(value.label) &&
    typeof value.label.fr === "string" &&
    typeof value.label.en === "string" &&
    isFiniteNonNegativeNumber(value.count) &&
    optionalFieldsAreValid
  );
}

function isValidHistoricalImpactTerrainResults(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const historicalOptionalFieldsAreValid =
    (value.wasteKnownActions === undefined ||
      isFiniteNonNegativeNumber(value.wasteKnownActions)) &&
    (value.wasteCoverageRate === undefined ||
      isFiniteNonNegativeNumber(value.wasteCoverageRate)) &&
    (value.buttsMassProvenance === undefined ||
      value.buttsMassProvenance === null ||
      value.buttsMassProvenance === "measured" ||
      value.buttsMassProvenance === "estimated" ||
      value.buttsMassProvenance === "mixed" ||
      value.buttsMassProvenance === "unknown") &&
    (value.buttsMassConversionVersions === undefined ||
      (Array.isArray(value.buttsMassConversionVersions) &&
        value.buttsMassConversionVersions.every(
          (version) => typeof version === "string",
        )));

  return (
    historicalOptionalFieldsAreValid &&
    hasFiniteNonNegativeFields(value, [
      "wasteKg",
      "wasteBagsEquivalent",
      "wasteMechanicalBicyclesEquivalent",
      "buttsTotal",
      "qualifiedButtsTotal",
      "unqualifiedButtsTotal",
      "buttsDistanceMeters",
      "co2eKg",
      "co2eGrams",
      "co2CarKilometers",
      "co2ParisMoscowCarTrips",
      "co2ParisNewYorkFlightShares",
      "waterLiters",
      "waterOlympicPools",
      "waterFrenchPersonYears",
    ]) &&
    Array.isArray(value.buttsByCondition) &&
    value.buttsByCondition.every(isValidHistoricalImpactTerrainConditionEntry) &&
    isNullableFiniteNonNegativeNumber(value.estimatedButtsWeightKg)
  );
}

function isValidPublicImpactKpiStructure(value: unknown): boolean {
  return isValidPublicImpactKpiStructureWithImpactTerrain(
    value,
    isValidImpactTerrainResults,
  );
}

function isValidPublicImpactKpiStructureWithImpactTerrain(
  value: unknown,
  validateImpactTerrain: (value: unknown) => boolean,
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const optionalNumericFields = [
    "actionsCount",
    "wasteKnownActions",
    "wasteCoverageRate",
    "participantsKnownActions",
    "participantsUnknownActions",
  ];

  return (
    isFiniteNonNegativeNumber(value.participantsTotal) &&
    isFiniteNonNegativeNumber(value.totalDurationMinutes) &&
    isFiniteNonNegativeNumber(value.totalDurationHours) &&
    isValidActionDistribution(value.actionDistribution) &&
    isValidClassificationWarnings(value.classificationWarnings) &&
    isValidStreetCleaningSavings(value.streetCleaningSavings) &&
    validateImpactTerrain(value.impactTerrain) &&
    optionalNumericFields.every(
      (field) =>
        value[field] === undefined || isFiniteNonNegativeNumber(value[field]),
    )
  );
}

function isValidHistoricalPublicImpactKpiStructure(value: unknown): boolean {
  return isValidPublicImpactKpiStructureWithImpactTerrain(
    value,
    isValidHistoricalImpactTerrainResults,
  );
}

function isValidHistoricalPublicImpactSnapshotPayload(
  value: unknown,
): value is PublicImpactSnapshotPayload {
  return isValidPublicImpactSnapshotEnvelope(
    value,
    isValidHistoricalPublicImpactKpiStructure,
  );
}

function isValidPublicImpactAggregateStructure(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNonNegativeNumber(value.visibleActions) &&
    isFiniteNonNegativeNumber(value.distinctLocations)
  );
}

function parseSnapshotInstant(value: unknown): Date | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function getEquivalentSnapshotGenerationInstant(
  snapshot: PublicImpactSnapshotRecord,
  payload: PublicImpactSnapshotPayload,
): Date | null {
  const snapshotGeneratedAt = parseSnapshotInstant(snapshot.generatedAt);
  const payloadGeneratedAt = parseSnapshotInstant(payload.generatedAt);

  if (
    !snapshotGeneratedAt ||
    !payloadGeneratedAt ||
    snapshotGeneratedAt.getTime() !== payloadGeneratedAt.getTime()
  ) {
    return null;
  }

  return snapshotGeneratedAt;
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

function isValidPublicImpactSnapshot(
  snapshot: PublicImpactSnapshotRecord | null | undefined,
): snapshot is PublicImpactSnapshotRecord {
  if (!snapshot || !isValidPublicImpactSnapshotPayload(snapshot.payload)) {
    return false;
  }

  const generatedAt = getEquivalentSnapshotGenerationInstant(
    snapshot,
    snapshot.payload,
  );
  if (!generatedAt) {
    return false;
  }

  const generatedDate = getPublicSurfaceSnapshotDate(snapshot.generatedAt);
  const generatedFloorDate = buildLandingFloorDate(generatedAt);
  const payload = snapshot.payload;

  return (
    snapshot.snapshotKey === PUBLIC_IMPACT_SNAPSHOT_KEY &&
    snapshot.version === PUBLIC_IMPACT_SNAPSHOT_VERSION &&
    hasCoherentImpactSnapshotPeriod(
      snapshot,
      payload,
      generatedDate,
      generatedFloorDate,
    ) &&
    payload.provenance.sourceRpc ===
      "public.load_public_landing_action_summary_incremental" &&
    (payload.provenance.sourceMode === "incremental" ||
      payload.provenance.sourceMode === "rebuild") &&
    isKnownImpactProxyVersion(payload.methodologyVersion) &&
    (payload.projectionVersion === undefined ||
      isKnownPublicImpactProjectionVersion(payload.projectionVersion)) &&
    payload.resultsContractVersion ===
      IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION
  );
}

function isValidHistoricalPublicImpactSnapshot(
  snapshot: PublicImpactSnapshotRecord | null | undefined,
): snapshot is PublicImpactSnapshotRecord {
  if (
    !snapshot ||
    !isValidHistoricalPublicImpactSnapshotPayload(snapshot.payload)
  ) {
    return false;
  }

  const generatedAt = getEquivalentSnapshotGenerationInstant(
    snapshot,
    snapshot.payload,
  );
  if (!generatedAt) {
    return false;
  }

  const generatedDate = getPublicSurfaceSnapshotDate(snapshot.generatedAt);
  const generatedFloorDate = buildLandingFloorDate(generatedAt);
  const payload = snapshot.payload;

  return (
    snapshot.snapshotKey === PUBLIC_IMPACT_SNAPSHOT_KEY &&
    snapshot.version === HISTORICAL_PUBLIC_IMPACT_SNAPSHOT_V1_VERSION &&
    payload.projectionVersion === undefined &&
    payload.provenance.sourceRpc ===
      "public.load_public_landing_action_summary" &&
    payload.provenance.sourceMode === undefined &&
    hasCoherentImpactSnapshotPeriod(
      snapshot,
      payload,
      generatedDate,
      generatedFloorDate,
    ) &&
    payload.methodologyVersion === HISTORICAL_PUBLIC_IMPACT_PROXY_V1_VERSION &&
    payload.resultsContractVersion ===
      IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION
  );
}

function isReadablePublicImpactSnapshot(
  snapshot: PublicImpactSnapshotRecord | null | undefined,
): snapshot is PublicImpactSnapshotRecord {
  return isValidPublicImpactSnapshot(snapshot) ||
    isValidHistoricalPublicImpactSnapshot(snapshot);
}

export function isCurrentPublicImpactSnapshot(
  snapshot: PublicImpactSnapshotRecord | null | undefined,
  now = new Date(),
): snapshot is PublicImpactSnapshotRecord {
  return (
    isValidPublicImpactSnapshot(snapshot) &&
    isCurrentImpactSnapshotPeriod(snapshot, now) &&
    isCurrentImpactProxyVersion(snapshot.payload.methodologyVersion) &&
    snapshot.payload.projectionVersion === PUBLIC_IMPACT_PROJECTION_VERSION
  );
}

export async function loadLatestPublicImpactSnapshot(): Promise<PublicImpactSnapshotRecord | null> {
  const latestSnapshot = await readLatestPublicSurfaceSnapshot<PublicImpactSnapshotPayload>(
    PUBLIC_IMPACT_SNAPSHOT_KEY,
  );

  if (isReadablePublicImpactSnapshot(latestSnapshot)) {
    return latestSnapshot;
  }

  const historicalCandidates =
    await readPublicSurfaceSnapshotHistory<PublicImpactSnapshotPayload>(
      PUBLIC_IMPACT_SNAPSHOT_KEY,
    );
  return historicalCandidates.find(isReadablePublicImpactSnapshot) ?? null;
}

export async function generateAndPersistPublicImpactSnapshot(params: {
  now?: Date;
  force?: boolean;
  rebuild?: boolean;
} = {}): Promise<GeneratePublicImpactSnapshotResult> {
  const now = params.now ?? new Date();
  const monthDate = getImpactSnapshotMonthDate(now.toISOString());
  const generationMode = params.rebuild
    ? "rebuild"
    : params.force
      ? "force"
      : "scheduled";
  const generationKey = `${PUBLIC_IMPACT_SNAPSHOT_KEY}:${monthDate}:${generationMode}`;
  const inFlight = inFlightImpactSnapshotGenerations.get(generationKey);

  if (inFlight) {
    return await inFlight.promise;
  }

  const generation: InFlightImpactSnapshotGeneration = {
    token: Symbol(generationKey),
    promise: generateAndPersistPublicImpactSnapshotOnce({
      ...params,
      now,
    }),
  };
  inFlightImpactSnapshotGenerations.set(generationKey, generation);

  try {
    return await generation.promise;
  } finally {
    if (inFlightImpactSnapshotGenerations.get(generationKey)?.token === generation.token) {
      inFlightImpactSnapshotGenerations.delete(generationKey);
    }
  }
}

async function generateAndPersistPublicImpactSnapshotOnce(params: {
  now: Date;
  force?: boolean;
  rebuild?: boolean;
}): Promise<GeneratePublicImpactSnapshotResult> {
  const now = params.now;
  const generatedAt = now.toISOString();
  const monthDate = getImpactSnapshotMonthDate(generatedAt);
  const current = await loadLatestPublicImpactSnapshot();

  if (
    !params.force &&
    !params.rebuild &&
    current &&
    isCurrentPublicImpactSnapshot(current, now)
  ) {
    return {
      snapshot: current,
      persisted: false,
      reused: true,
      forced: false,
    };
  }

  const floorDate = buildLandingFloorDate(now);
  if (params.rebuild) {
    await rebuildPublicImpactActionState(floorDate);
  } else {
    await advancePublicImpactActionState(floorDate);
  }

  const snapshot = await buildPublicImpactSnapshotToPersist({
    snapshotDate: monthDate,
    generatedAt,
    floorDate,
    sourceMode: params.rebuild ? "rebuild" : "incremental",
  });

  const writeResult = await upsertPublicSurfaceSnapshot(snapshot);
  if (writeResult === "ignored_older") {
    const latestSnapshot = await requirePersistedPublicSurfaceSnapshot<PublicImpactSnapshotPayload>(
      PUBLIC_IMPACT_SNAPSHOT_KEY,
      snapshot.snapshotDate,
    );
    return {
      snapshot: latestSnapshot,
      persisted: false,
      reused: true,
      forced: Boolean(params.force),
    };
  }

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

async function buildPublicImpactSnapshotToPersist(params: {
  snapshotDate: string;
  generatedAt: string;
  floorDate: string;
  sourceMode: "rebuild" | "incremental";
}): Promise<Omit<PublicImpactSnapshotRecord, "id">> {
  const aggregate = await loadIncrementalPublicLandingActionSummary();
  const payload = buildPublicImpactSnapshotPayload({
    aggregate,
    generatedAt: params.generatedAt,
    floorDate: params.floorDate,
    sourceMode: params.sourceMode,
  });
  return {
    snapshotKey: PUBLIC_IMPACT_SNAPSHOT_KEY,
    snapshotDate: params.snapshotDate,
    generatedAt: params.generatedAt,
    version: PUBLIC_IMPACT_SNAPSHOT_VERSION,
    title: PUBLIC_IMPACT_SNAPSHOT_TITLE,
    payload,
    meta: {
      periodFromDate: params.floorDate,
      periodToDate: payload.period.toDate,
      methodologyVersion: payload.methodologyVersion,
      sourceRpc: payload.provenance.sourceRpc,
      sourceMode: payload.provenance.sourceMode,
    },
  };
}
