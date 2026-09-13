import type { ActionPreparationData } from "@/lib/actions/types";
import {
  CLEANUP_WORKLOAD_MODEL_VERSION,
  type CleanupWorkload,
} from "./route-cleanup-workload";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataLayers, RouteDataStatus } from "./route-data-status";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { RoutePlannerOrigin } from "./route-planner";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { RouteOperationalBudget } from "./route-operational-budget";

export const ROUTE_CLEANUP_DURATION_CONTRACT_VERSION =
  "route-cleanup-duration-v1" as const;
export const ROUTE_CALIBRATION_CONTEXT_VERSION =
  "action-route-calibration-v2" as const;
export const ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION =
  "action-route-calibration-v1" as const;
export const ROUTE_PLANNER_SNAPSHOT_VERSION =
  "route-planner-snapshot-v1" as const;

export const ROUTE_CALIBRATION_STATUSES = [
  "calibrated",
  "data_insufficient",
  "unavailable",
  "excluded",
] as const;

export type RouteCalibrationStatus = (typeof ROUTE_CALIBRATION_STATUSES)[number];

export type RouteCleanupDurationEstimate = {
  contractVersion: typeof ROUTE_CLEANUP_DURATION_CONTRACT_VERSION;
  minutes: number | null;
  uncertaintyMinutes: number | null;
  modelVersion: string;
  calibrationStatus: RouteCalibrationStatus;
  reason: string;
  provenance: {
    source: "route-calibration";
    contextVersion:
      | typeof ROUTE_CALIBRATION_CONTEXT_VERSION
      | typeof ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION
      | null;
    artifactVersion: string | null;
  };
};

export type RouteCalibrationContextCandidate = {
  candidateId: string;
  family: "observed" | "predicted";
  cleanupWorkload: CleanupWorkload;
};

export type RoutePlannerSnapshotGroup = {
  groupIndex: number;
  volunteerCount: number;
  candidateIds: string[];
  reservedCandidateIds: string[];
  targetCount: number;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  withinBudget: boolean;
  routeGeometry: RouteGeometry;
  operationalBudget: RouteOperationalBudget | null;
};

/**
 * Exact planner output captured for the action handoff. This is evidence of
 * what the planner knew and recommended, not a new calibration model.
 */
export type RoutePlannerSnapshot = {
  version: typeof ROUTE_PLANNER_SNAPSHOT_VERSION;
  generatedAt: string;
  engineVersion: string;
  cleanupWorkloadVersion: CleanupWorkload["modelVersion"];
  modelVersions: {
    planner: string;
    cleanupWorkload: CleanupWorkload["modelVersion"];
    prediction: string | null;
    duration: string | null;
  };
  parameters: {
    origin: RoutePlannerOrigin;
    planningMode: RoutePlanningMode;
    travelBudgetMinutes: number;
    maxStops: number;
    priorityVsTravel: number;
    pickupPreference: RoutePickupPreference;
    effectiveRiskFocus: "all" | "waste" | "cigaretteButts";
    volunteers: number;
    groupCount: number;
  };
  selectedCandidateIds: string[];
  observedCandidateIds: string[];
  predictedCandidateIds: string[];
  selectedStops: RouteStop[];
  distance: {
    totalKm: number;
    travelMinutes: number;
    returnDistanceKm: number;
    returnMinutes: number;
  };
  geometry: RouteGeometry;
  groups: RoutePlannerSnapshotGroup[];
  provenance: {
    dataStatus: RouteDataStatus;
    dataLayers: RouteDataLayers;
    sourceHealth: UnifiedSourceHealth;
    prediction: RoutePredictionSummary | null;
  };
};

export type RouteCalibrationContext = {
  version:
    | typeof ROUTE_CALIBRATION_CONTEXT_VERSION
    | typeof ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION;
  generatedAt: string;
  routeEngineVersion: string;
  cleanupWorkloadVersion: CleanupWorkload["modelVersion"];
  volunteersExpected: number;
  groupCount: number;
  candidates: RouteCalibrationContextCandidate[];
  plannerSnapshot?: RoutePlannerSnapshot;
};

export type ApprovedActionForCalibration = {
  id: string;
  status: "pending" | "approved" | "rejected";
  actionDate: string;
  locationLabel: string;
  wasteKg: number | null;
  cigaretteButts: number | null;
  volunteersCount: number | null;
  durationMinutes: number | null;
  preparationData: ActionPreparationData | null | undefined;
};

export type RouteCalibrationSample = {
  actionId: string;
  historicalWorkload: RouteCalibrationContextCandidate[];
  volunteersPresent: number;
  durationMinutes: number;
  wasteKg: number;
  cigaretteButts: number;
  actionDate: string;
  locationLabel: string;
};

export type RouteCalibrationDatasetEntry =
  | { status: "included"; sample: RouteCalibrationSample }
  | {
      status: "excluded";
      actionId: string;
      reason:
        | "not_approved"
        | "missing_historical_context"
        | "invalid_historical_context"
        | "duration_unavailable";
    };

export type RouteCalibrationDataset = {
  entries: RouteCalibrationDatasetEntry[];
  samples: RouteCalibrationSample[];
  exclusions: Extract<RouteCalibrationDatasetEntry, { status: "excluded" }>[];
  readiness: RouteCalibrationReadiness;
};

export type RouteCalibrationReadinessReason =
  | "ordinary_waste_has_no_variation"
  | "workload_has_no_diversity"
  | "workload_and_volunteers_are_not_dissociable"
  | "historical_runtime_bridge_missing"
  | "independent_validation_unavailable";

export type RouteCalibrationReadiness = {
  calibrationStatus: "data_insufficient" | "ready";
  reasons: RouteCalibrationReadinessReason[];
};

export type ActiveRouteDurationArtifact = {
  artifactVersion: string;
  modelVersion: string;
  calibratedAt: string;
  estimate: (input: {
    context: RouteCalibrationContext;
  }) => { minutes: number; uncertaintyMinutes: number };
};

export function buildRouteCalibrationContext(input: {
  generatedAt: string;
  routeEngineVersion: string;
  volunteersExpected: number;
  groupCount: number;
  candidates: readonly RouteCalibrationContextCandidate[];
  plannerSnapshot?: RoutePlannerSnapshot;
}): RouteCalibrationContext {
  return {
    version: ROUTE_CALIBRATION_CONTEXT_VERSION,
    generatedAt: input.generatedAt,
    routeEngineVersion: input.routeEngineVersion,
    cleanupWorkloadVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    volunteersExpected: input.volunteersExpected,
    groupCount: input.groupCount,
    candidates: input.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      family: candidate.family,
      cleanupWorkload: structuredClone(candidate.cleanupWorkload),
    })),
    ...(input.plannerSnapshot
      ? { plannerSnapshot: structuredClone(input.plannerSnapshot) }
      : {}),
  };
}

export function buildRoutePlannerSnapshot(input: {
  generatedAt: string;
  engineVersion: string;
  selectedCandidates: readonly RouteCalibrationContextCandidate[];
  selectedStops: readonly RouteStop[];
  origin: RoutePlannerOrigin;
  planningMode: RoutePlanningMode;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  pickupPreference: RoutePickupPreference;
  effectiveRiskFocus: "all" | "waste" | "cigaretteButts";
  volunteers: number;
  groupCount: number;
  routeGeometry: RouteGeometry;
  travelDistanceKm: number;
  travelMinutes: number;
  returnDistanceKm: number;
  returnMinutes: number;
  groups: readonly RoutePlannerSnapshotGroup[];
  dataStatus: RouteDataStatus;
  dataLayers: RouteDataLayers;
  sourceHealth: UnifiedSourceHealth;
  prediction: RoutePredictionSummary | null;
  durationModelVersion?: string | null;
}): RoutePlannerSnapshot {
  const selectedCandidates = input.selectedCandidates.map((candidate) =>
    structuredClone(candidate),
  );
  const observedCandidateIds = selectedCandidates
    .filter((candidate) => candidate.family === "observed")
    .map((candidate) => candidate.candidateId);
  const predictedCandidateIds = selectedCandidates
    .filter((candidate) => candidate.family === "predicted")
    .map((candidate) => candidate.candidateId);
  const predictionModelVersion = input.prediction?.modelVersion ?? null;

  return {
    version: ROUTE_PLANNER_SNAPSHOT_VERSION,
    generatedAt: input.generatedAt,
    engineVersion: input.engineVersion,
    cleanupWorkloadVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    modelVersions: {
      planner: input.engineVersion,
      cleanupWorkload: CLEANUP_WORKLOAD_MODEL_VERSION,
      prediction: predictionModelVersion,
      duration: input.durationModelVersion ?? null,
    },
    parameters: {
      origin: structuredClone(input.origin),
      planningMode: structuredClone(input.planningMode),
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxStops: input.maxStops,
      priorityVsTravel: input.priorityVsTravel,
      pickupPreference: input.pickupPreference,
      effectiveRiskFocus: input.effectiveRiskFocus,
      volunteers: input.volunteers,
      groupCount: input.groupCount,
    },
    selectedCandidateIds: selectedCandidates.map((candidate) => candidate.candidateId),
    observedCandidateIds,
    predictedCandidateIds,
    selectedStops: input.selectedStops.map((stop) => structuredClone(stop)),
    distance: {
      totalKm: input.travelDistanceKm,
      travelMinutes: input.travelMinutes,
      returnDistanceKm: input.returnDistanceKm,
      returnMinutes: input.returnMinutes,
    },
    geometry: structuredClone(input.routeGeometry),
    groups: input.groups.map((group) => structuredClone(group)),
    provenance: {
      dataStatus: input.dataStatus,
      dataLayers: structuredClone(input.dataLayers),
      sourceHealth: structuredClone(input.sourceHealth),
      prediction: input.prediction ? structuredClone(input.prediction) : null,
    },
  };
}

export function buildCalibrationDataset(
  actions: readonly ApprovedActionForCalibration[],
  options: { independentValidationAvailable?: boolean } = {},
): RouteCalibrationDataset {
  const entries = actions.map(buildCalibrationDatasetEntry);
  const samples = entries.flatMap((entry) => (entry.status === "included" ? [entry.sample] : []));
  return {
    entries,
    samples,
    exclusions: entries.flatMap((entry) => (entry.status === "excluded" ? [entry] : [])),
    readiness: assessRouteCalibrationReadiness({
      samples,
      runtimeHistoricalBridgeAvailable: samples.length > 0,
      independentValidationAvailable: options.independentValidationAvailable,
    }),
  };
}

function buildCalibrationDatasetEntry(
  action: ApprovedActionForCalibration,
): RouteCalibrationDatasetEntry {
  if (action.status !== "approved") {
    return { status: "excluded", actionId: action.id, reason: "not_approved" };
  }

  const context = action.preparationData?.routeCalibrationContext;
  if (!context) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "missing_historical_context",
    };
  }
  if (!isRouteCalibrationContext(context)) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "invalid_historical_context",
    };
  }
  if (
    !finitePositive(action.durationMinutes) ||
    !finiteNonNegativeNullable(action.volunteersCount) ||
    !finiteNonNegativeNullable(action.wasteKg) ||
    !finiteNonNegativeNullable(action.cigaretteButts)
  ) {
    return { status: "excluded", actionId: action.id, reason: "duration_unavailable" };
  }

  return {
    status: "included",
    sample: {
      actionId: action.id,
      historicalWorkload: context.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        family: candidate.family,
        cleanupWorkload: structuredClone(candidate.cleanupWorkload),
      })),
      volunteersPresent: action.volunteersCount,
      durationMinutes: action.durationMinutes,
      wasteKg: action.wasteKg,
      cigaretteButts: action.cigaretteButts,
      actionDate: action.actionDate,
      locationLabel: action.locationLabel,
    },
  };
}

export function assessRouteCalibrationReadiness(input: {
  samples: readonly RouteCalibrationSample[];
  runtimeHistoricalBridgeAvailable?: boolean;
  independentValidationAvailable?: boolean;
}): RouteCalibrationReadiness {
  const workloadSignatures = new Set(
    input.samples.map((sample) => JSON.stringify(sample.historicalWorkload)),
  );
  const wasteValues = new Set(input.samples.map((sample) => sample.wasteKg));
  const volunteerValues = new Set(input.samples.map((sample) => sample.volunteersPresent));
  const repeatedWorkloadWithDifferentVolunteers = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => JSON.stringify(sample.historicalWorkload),
    (sample) => String(sample.volunteersPresent),
  );
  const repeatedVolunteersWithDifferentWorkload = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => String(sample.volunteersPresent),
    (sample) => JSON.stringify(sample.historicalWorkload),
  );
  const reasons: RouteCalibrationReadinessReason[] = [];

  if (wasteValues.size < 2) reasons.push("ordinary_waste_has_no_variation");
  if (workloadSignatures.size < 2) reasons.push("workload_has_no_diversity");
  if (
    !repeatedWorkloadWithDifferentVolunteers ||
    !repeatedVolunteersWithDifferentWorkload ||
    volunteerValues.size < 2
  ) {
    reasons.push("workload_and_volunteers_are_not_dissociable");
  }
  if (!input.runtimeHistoricalBridgeAvailable) {
    reasons.push("historical_runtime_bridge_missing");
  }
  if (!input.independentValidationAvailable) {
    reasons.push("independent_validation_unavailable");
  }

  return {
    calibrationStatus: reasons.length === 0 ? "ready" : "data_insufficient",
    reasons,
  };
}

export function estimateRouteCleanupDuration(input: {
  context?: RouteCalibrationContext | null;
  artifact?: ActiveRouteDurationArtifact | null;
}): RouteCleanupDurationEstimate {
  if (!input.context) {
    return unavailableEstimate("missing_historical_context", null);
  }
  if (!input.artifact) {
    return unavailableEstimate("no_active_calibrated_artifact", input.context);
  }
  const result = input.artifact.estimate({ context: input.context });
  return {
    contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    minutes: result.minutes,
    uncertaintyMinutes: result.uncertaintyMinutes,
    modelVersion: input.artifact.modelVersion,
    calibrationStatus: "calibrated",
    reason: "active_calibrated_artifact",
    provenance: {
      source: "route-calibration",
      contextVersion: input.context.version,
      artifactVersion: input.artifact.artifactVersion,
    },
  };
}

function unavailableEstimate(
  reason: string,
  context: RouteCalibrationContext | null,
): RouteCleanupDurationEstimate {
  return {
    contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    minutes: null,
    uncertaintyMinutes: null,
    modelVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    calibrationStatus: "data_insufficient",
    reason,
    provenance: {
      source: "route-calibration",
      contextVersion: context?.version ?? null,
      artifactVersion: null,
    },
  };
}

export function preserveHistoricalRouteCalibrationContext(
  current: ActionPreparationData | null | undefined,
  incoming: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const currentContext = current?.routeCalibrationContext;
  const next = incoming ?? {};
  if (!currentContext) return next;

  if (
    next.routeCalibrationContext !== undefined &&
    JSON.stringify(next.routeCalibrationContext) !== JSON.stringify(currentContext)
  ) {
    throw new Error("Le contexte historique de calibration ne peut pas être réécrit.");
  }
  return { ...next, routeCalibrationContext: structuredClone(currentContext) };
}

export function isRouteCalibrationContext(value: unknown): value is RouteCalibrationContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<RouteCalibrationContext>;
  return (
    (context.version === ROUTE_CALIBRATION_CONTEXT_VERSION ||
      context.version === ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION) &&
    isIsoDate(context.generatedAt) &&
    typeof context.routeEngineVersion === "string" &&
    context.routeEngineVersion.length > 0 &&
    context.cleanupWorkloadVersion === CLEANUP_WORKLOAD_MODEL_VERSION &&
    typeof context.volunteersExpected === "number" &&
    Number.isInteger(context.volunteersExpected) &&
    context.volunteersExpected >= 0 &&
    context.volunteersExpected <= 500 &&
    typeof context.groupCount === "number" &&
    Number.isInteger(context.groupCount) &&
    context.groupCount >= 1 &&
    context.groupCount <= 12 &&
    Array.isArray(context.candidates) &&
    context.candidates.every(isRouteCalibrationCandidate) &&
    (context.plannerSnapshot === undefined ||
      isRoutePlannerSnapshot(context.plannerSnapshot))
  );
}

function isRoutePlannerSnapshot(value: unknown): value is RoutePlannerSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<RoutePlannerSnapshot>;
  const models = snapshot.modelVersions;
  const parameters = snapshot.parameters;
  const distance = snapshot.distance;
  return (
    snapshot.version === ROUTE_PLANNER_SNAPSHOT_VERSION &&
    isIsoDate(snapshot.generatedAt) &&
    typeof snapshot.engineVersion === "string" &&
    snapshot.engineVersion.length > 0 &&
    snapshot.cleanupWorkloadVersion === CLEANUP_WORKLOAD_MODEL_VERSION &&
    Boolean(models) &&
    typeof models?.planner === "string" &&
    models.planner.length > 0 &&
    models.cleanupWorkload === CLEANUP_WORKLOAD_MODEL_VERSION &&
    (models.prediction === null || typeof models.prediction === "string") &&
    (models.duration === null || typeof models.duration === "string") &&
    Boolean(parameters) &&
    isRoutePlannerOrigin(parameters?.origin) &&
    isRoutePlanningMode(parameters?.planningMode) &&
    finiteNonNegative(parameters?.travelBudgetMinutes) &&
    finiteIntegerBetween(parameters?.maxStops, 1, 200) &&
    finiteNumberBetween(parameters?.priorityVsTravel, 0, 100) &&
    ["balanced", "waste", "cigarette_butts"].includes(
      parameters?.pickupPreference ?? "",
    ) &&
    ["all", "waste", "cigaretteButts"].includes(
      parameters?.effectiveRiskFocus ?? "",
    ) &&
    finiteIntegerBetween(parameters?.volunteers, 0, 500) &&
    finiteIntegerBetween(parameters?.groupCount, 1, 12) &&
    Array.isArray(snapshot.selectedCandidateIds) &&
    snapshot.selectedCandidateIds.every(isNonEmptyString) &&
    Array.isArray(snapshot.observedCandidateIds) &&
    snapshot.observedCandidateIds.every(isNonEmptyString) &&
    Array.isArray(snapshot.predictedCandidateIds) &&
    snapshot.predictedCandidateIds.every(isNonEmptyString) &&
    Array.isArray(snapshot.selectedStops) &&
    snapshot.selectedStops.every(isRouteStop) &&
    Boolean(distance) &&
    finiteNonNegative(distance?.totalKm) &&
    finiteNonNegative(distance?.travelMinutes) &&
    finiteNonNegative(distance?.returnDistanceKm) &&
    finiteNonNegative(distance?.returnMinutes) &&
    isRouteGeometry(snapshot.geometry) &&
    Array.isArray(snapshot.groups) &&
    snapshot.groups.every(isRoutePlannerSnapshotGroup) &&
    isRoutePlannerSnapshotProvenance(snapshot.provenance)
  );
}

function isRoutePlannerSnapshotGroup(value: unknown): value is RoutePlannerSnapshotGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<RoutePlannerSnapshotGroup>;
  return (
    finiteIntegerBetween(group.groupIndex, 1, 12) &&
    finiteIntegerBetween(group.volunteerCount, 0, 500) &&
    Array.isArray(group.candidateIds) &&
    group.candidateIds.every(isNonEmptyString) &&
    Array.isArray(group.reservedCandidateIds) &&
    group.reservedCandidateIds.every(isNonEmptyString) &&
    finiteIntegerBetween(group.targetCount, 0, 200) &&
    finiteNonNegative(group.travelDistanceKm) &&
    finiteNonNegative(group.travelMinutes) &&
    finiteNonNegative(group.travelBudgetMinutes) &&
    typeof group.withinBudget === "boolean" &&
    isRouteGeometry(group.routeGeometry) &&
    (group.operationalBudget === null ||
      Boolean(group.operationalBudget && typeof group.operationalBudget === "object"))
  );
}

function isRoutePlannerSnapshotProvenance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const provenance = value as Partial<RoutePlannerSnapshot["provenance"]>;
  const sourceHealth = provenance.sourceHealth;
  const dataLayers = provenance.dataLayers;
  const prediction = provenance.prediction;
  return (
    ["complete", "empty", "partial", "unavailable"].includes(
      provenance.dataStatus ?? "",
    ) &&
    Boolean(dataLayers) &&
    ["complete", "empty", "partial", "unavailable"].includes(dataLayers?.observed ?? "") &&
    ["available", "partial", "unavailable"].includes(dataLayers?.prediction ?? "") &&
    ["ok", "empty", "degraded"].includes(dataLayers?.recommendation ?? "") &&
    Boolean(sourceHealth) &&
    typeof sourceHealth?.partial === "boolean" &&
    Array.isArray(sourceHealth?.failedSources) &&
    sourceHealth.failedSources.every(isNonEmptyString) &&
    Array.isArray(sourceHealth?.availableSources) &&
    sourceHealth.availableSources.every(isNonEmptyString) &&
    Array.isArray(sourceHealth?.warnings) &&
    sourceHealth.warnings.every((warning) => typeof warning === "string") &&
    (prediction === null ||
      (typeof prediction === "object" &&
        ["available", "partial", "unavailable"].includes(prediction.status ?? "") &&
        (prediction.modelVersion === null || typeof prediction.modelVersion === "string") &&
        Array.isArray(prediction.selectedCandidateIds) &&
        prediction.selectedCandidateIds.every(isNonEmptyString)))
  );
}

function isRouteStop(value: unknown): value is RouteStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Partial<RouteStop>;
  return (
    isNonEmptyString(stop.id) &&
    typeof stop.label === "string" &&
    typeof stop.latitude === "number" &&
    Number.isFinite(stop.latitude) &&
    typeof stop.longitude === "number" &&
    Number.isFinite(stop.longitude) &&
    finiteNonNegative(stop.segmentKm) &&
    finiteNonNegative(stop.estimatedMinutes) &&
    typeof stop.priorityReason === "string" &&
    finiteNumberBetween(stop.score, 0, 100)
  );
}

function isRoutePlannerOrigin(value: unknown): value is RoutePlannerOrigin {
  if (!value || typeof value !== "object") return false;
  const origin = value as Partial<RoutePlannerOrigin>;
  return (
    typeof origin.latitude === "number" &&
    Number.isFinite(origin.latitude) &&
    origin.latitude >= -90 &&
    origin.latitude <= 90 &&
    typeof origin.longitude === "number" &&
    Number.isFinite(origin.longitude) &&
    origin.longitude >= -180 &&
    origin.longitude <= 180 &&
    ["browser", "map", "approximate_saved_area"].includes(origin.source ?? "")
  );
}

function isRoutePlanningMode(value: unknown): value is RoutePlanningMode {
  if (!value || typeof value !== "object") return false;
  const mode = value as Partial<RoutePlanningMode>;
  return mode.type === "free" ||
    (mode.type === "event-centered" && isNonEmptyString(mode.eventId));
}

function isRouteGeometry(value: unknown): value is RouteGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<RouteGeometry>;
  return (
    geometry.isLoop === true &&
    (geometry.origin === null || isCoordinatePair(geometry.origin)) &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.every(isCoordinatePair) &&
    finiteNonNegative(geometry.distanceKm) &&
    finiteNonNegative(geometry.durationMinutes) &&
    Array.isArray(geometry.legs) &&
    geometry.legs.every((leg) =>
      Boolean(leg) &&
      finiteIntegerBetween(leg?.fromStopIndex, 0, 500) &&
      finiteIntegerBetween(leg?.toStopIndex, 0, 500) &&
      finiteNonNegative(leg?.distanceKm) &&
      finiteNonNegative(leg?.estimatedMinutes),
    ) &&
    ["osrm", "fossgis-osrm", "none"].includes(geometry.provider ?? "") &&
    (geometry.profile === null || geometry.profile === "foot") &&
    ["network", "fallback"].includes(geometry.mode ?? "") &&
    typeof geometry.estimated === "boolean" &&
    (geometry.returnLeg === null ||
      (typeof geometry.returnLeg === "object" &&
        finiteIntegerBetween(geometry.returnLeg.fromStopIndex, 0, 500) &&
        finiteIntegerBetween(geometry.returnLeg.toStopIndex, 0, 500) &&
        finiteNonNegative(geometry.returnLeg.distanceKm) &&
        finiteNonNegative(geometry.returnLeg.estimatedMinutes)))
  );
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function finiteIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum;
}

function finiteNumberBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum;
}

function isRouteCalibrationCandidate(value: unknown): value is RouteCalibrationContextCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RouteCalibrationContextCandidate>;
  return (
    typeof candidate.candidateId === "string" &&
    (candidate.family === "observed" || candidate.family === "predicted") &&
    isCleanupWorkload(candidate.cleanupWorkload)
  );
}

function isCleanupWorkload(value: unknown): value is CleanupWorkload {
  if (!value || typeof value !== "object") return false;
  const workload = value as Partial<CleanupWorkload>;
  return (
    workload.modelVersion === CLEANUP_WORKLOAD_MODEL_VERSION &&
    typeof workload.candidateId === "string" &&
    workload.candidateId.length > 0 &&
    (workload.family === "observed" || workload.family === "predicted") &&
    ["relative_estimate", "presence_only", "unavailable", "excluded"].includes(workload.status ?? "") &&
    isCleanupWorkloadAxis(workload.ordinaryWaste) &&
    isCleanupWorkloadAxis(workload.cigaretteButts) &&
    isCleanupWorkloadConfidence(workload.confidence) &&
    isCleanupWorkloadProvenance(workload.provenance) &&
    (workload.exclusionReason === null || typeof workload.exclusionReason === "string")
  );
}

function isCleanupWorkloadAxis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const axis = value as {
    relativePressure?: unknown;
    observedPresence?: unknown;
    confidence?: unknown;
  };
  return (
    (axis.relativePressure === null || (typeof axis.relativePressure === "number" && axis.relativePressure >= 0 && axis.relativePressure <= 100)) &&
    (axis.observedPresence === null || typeof axis.observedPresence === "boolean") &&
    (axis.confidence === null || (typeof axis.confidence === "number" && axis.confidence >= 0 && axis.confidence <= 1))
  );
}

function isCleanupWorkloadConfidence(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const confidence = value as { ordinaryWaste?: unknown; cigaretteButts?: unknown };
  return [confidence.ordinaryWaste, confidence.cigaretteButts].every(
    (item) => item === null || (typeof item === "number" && item >= 0 && item <= 1),
  );
}

function isCleanupWorkloadProvenance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const provenance = value as {
    source?: unknown;
    evidenceFamily?: unknown;
    observedAt?: unknown;
    zoneId?: unknown;
    sourceModelVersion?: unknown;
    snapshotId?: unknown;
    sourceProvenance?: unknown;
  };
  return (
    (provenance.source === null || provenance.source === "trash_spotter_spots" || provenance.source === "urban-pressure-model") &&
    (provenance.evidenceFamily === null || provenance.evidenceFamily === "observed" || provenance.evidenceFamily === "predicted") &&
    (provenance.observedAt === null || typeof provenance.observedAt === "string") &&
    (provenance.zoneId === null || typeof provenance.zoneId === "string") &&
    (provenance.sourceModelVersion === null || typeof provenance.sourceModelVersion === "string") &&
    (provenance.snapshotId === null || typeof provenance.snapshotId === "string") &&
    Array.isArray(provenance.sourceProvenance)
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function hasRepeatedKeyWithDifferentValue<T>(
  samples: readonly T[],
  key: (sample: T) => string,
  value: (sample: T) => number | string,
): boolean {
  const valuesByKey = new Map<string, Set<number | string>>();
  for (const sample of samples) {
    const values = valuesByKey.get(key(sample)) ?? new Set<number | string>();
    values.add(value(sample));
    valuesByKey.set(key(sample), values);
  }
  return [...valuesByKey.values()].some((values) => values.size > 1);
}

function finitePositive(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNonNegativeNullable(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
