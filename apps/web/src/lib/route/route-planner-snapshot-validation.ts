import {
  CLEANUP_WORKLOAD_MODEL_VERSION,
} from "./route-cleanup-workload";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataLayers } from "./route-data-status";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { RoutePlannerOrigin } from "./route-planner";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type {
  RoutePlannerSnapshot,
  RoutePlannerSnapshotGroup,
} from "./route-calibration";

export function isRoutePlannerSnapshot(
  value: unknown,
  expectedVersion: string,
): value is RoutePlannerSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<RoutePlannerSnapshot>;

  return (
    snapshot.version === expectedVersion &&
    isSnapshotIdentity(snapshot) &&
    isSnapshotModels(snapshot.modelVersions) &&
    isSnapshotParameters(snapshot.parameters) &&
    isSnapshotSelections(snapshot) &&
    isSnapshotDistance(snapshot.distance) &&
    isRouteGeometry(snapshot.geometry) &&
    Array.isArray(snapshot.groups) &&
    snapshot.groups.every(isRoutePlannerSnapshotGroup) &&
    isRoutePlannerSnapshotProvenance(snapshot.provenance)
  );
}

function isSnapshotIdentity(snapshot: Partial<RoutePlannerSnapshot>): boolean {
  return (
    isIsoDate(snapshot.generatedAt) &&
    typeof snapshot.engineVersion === "string" &&
    snapshot.engineVersion.length > 0 &&
    snapshot.cleanupWorkloadVersion === CLEANUP_WORKLOAD_MODEL_VERSION
  );
}

function isSnapshotModels(
  models: RoutePlannerSnapshot["modelVersions"] | undefined,
): boolean {
  return (
    Boolean(models) &&
    typeof models?.planner === "string" &&
    models.planner.length > 0 &&
    models.cleanupWorkload === CLEANUP_WORKLOAD_MODEL_VERSION &&
    (models.prediction === null || typeof models.prediction === "string") &&
    (models.duration === null || typeof models.duration === "string")
  );
}

function isSnapshotParameters(
  parameters: RoutePlannerSnapshot["parameters"] | undefined,
): boolean {
  return (
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
    finiteIntegerBetween(parameters?.groupCount, 1, 12)
  );
}

function isSnapshotSelections(snapshot: Partial<RoutePlannerSnapshot>): boolean {
  return (
    isStringArray(snapshot.selectedCandidateIds) &&
    isStringArray(snapshot.observedCandidateIds) &&
    isStringArray(snapshot.predictedCandidateIds) &&
    Array.isArray(snapshot.selectedStops) &&
    snapshot.selectedStops.every(isRouteStop)
  );
}

function isSnapshotDistance(
  distance: RoutePlannerSnapshot["distance"] | undefined,
): boolean {
  return (
    Boolean(distance) &&
    finiteNonNegative(distance?.totalKm) &&
    finiteNonNegative(distance?.travelMinutes) &&
    finiteNonNegative(distance?.returnDistanceKm) &&
    finiteNonNegative(distance?.returnMinutes)
  );
}

function isRoutePlannerSnapshotGroup(
  value: unknown,
): value is RoutePlannerSnapshotGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<RoutePlannerSnapshotGroup>;
  return (
    finiteIntegerBetween(group.groupIndex, 1, 12) &&
    finiteIntegerBetween(group.volunteerCount, 0, 500) &&
    isStringArray(group.candidateIds) &&
    isStringArray(group.reservedCandidateIds) &&
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
    isDataLayers(dataLayers) &&
    isSourceHealth(sourceHealth) &&
    isPredictionSummary(prediction)
  );
}

function isDataLayers(dataLayers: RouteDataLayers | undefined): boolean {
  return (
    Boolean(dataLayers) &&
    ["complete", "empty", "partial", "unavailable"].includes(
      dataLayers?.observed ?? "",
    ) &&
    ["available", "partial", "unavailable"].includes(
      dataLayers?.prediction ?? "",
    ) &&
    ["ok", "empty", "degraded"].includes(dataLayers?.recommendation ?? "")
  );
}

function isSourceHealth(sourceHealth: UnifiedSourceHealth | undefined): boolean {
  return (
    Boolean(sourceHealth) &&
    typeof sourceHealth?.partial === "boolean" &&
    isStringArray(sourceHealth?.failedSources) &&
    isStringArray(sourceHealth?.availableSources) &&
    Array.isArray(sourceHealth?.warnings) &&
    sourceHealth.warnings.every((warning) => typeof warning === "string")
  );
}

function isPredictionSummary(
  prediction: RoutePredictionSummary | null | undefined,
): boolean {
  return (
    prediction === null ||
    (typeof prediction === "object" &&
      ["available", "partial", "unavailable"].includes(prediction.status ?? "") &&
      (prediction.modelVersion === null || typeof prediction.modelVersion === "string") &&
      isStringArray(prediction.selectedCandidateIds))
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
    finiteNumberBetween(origin.latitude, -90, 90) &&
    finiteNumberBetween(origin.longitude, -180, 180) &&
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
    (geometry.returnLeg === null || isReturnLeg(geometry.returnLeg))
  );
}

function isReturnLeg(
  value: NonNullable<RouteGeometry["returnLeg"]> | null | undefined,
): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    finiteIntegerBetween(value.fromStopIndex, 0, 500) &&
    finiteIntegerBetween(value.toStopIndex, 0, 500) &&
    finiteNonNegative(value.distanceKm) &&
    finiteNonNegative(value.estimatedMinutes)
  );
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    finiteNumber(value[0]) &&
    finiteNumber(value[1])
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegative(value: unknown): value is number {
  return finiteNumber(value) && value >= 0;
}

function finiteIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function finiteNumberBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return finiteNumber(value) && value >= minimum && value <= maximum;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}
