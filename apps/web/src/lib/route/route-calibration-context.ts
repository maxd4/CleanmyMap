import { CLEANUP_WORKLOAD_MODEL_VERSION } from "./route-cleanup-workload";
import {
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_PLANNER_SNAPSHOT_VERSION,
  type RoutePlannerSnapshotIntegrity,
} from "./route-calibration-contract";
import type {
  RouteCalibrationContext,
  RouteCalibrationContextCandidate,
  RoutePlannerSnapshot,
  RoutePlannerSnapshotGroup,
} from "./route-calibration-types";
import type { RouteDataLayers, RouteDataStatus } from "./route-data-status";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { RoutePlannerOrigin } from "./route-planner";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";

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

export function buildVerifiedRouteCalibrationContext(input: {
  generatedAt: string;
  routeEngineVersion: string;
  volunteersExpected: number;
  groupCount: number;
  candidates: readonly RouteCalibrationContextCandidate[];
  plannerSnapshot: RoutePlannerSnapshot;
  plannerSnapshotIntegrity: RoutePlannerSnapshotIntegrity;
}): RouteCalibrationContext {
  return {
    ...buildRouteCalibrationContext(input),
    version: ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
    plannerSnapshotIntegrity: structuredClone(input.plannerSnapshotIntegrity),
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
  weatherContext?: PlannerWeatherContext;
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
    ...(input.weatherContext
      ? { weatherContext: structuredClone(input.weatherContext) }
      : {}),
  };
}
