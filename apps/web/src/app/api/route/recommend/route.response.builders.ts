import {
  resolveRouteDataLayers,
} from "@/lib/route/route-data-status";
import type { RouteStop } from "@/lib/route/route-contract";
import { ROUTE_PLANNER_ENGINE_VERSION } from "@/lib/route/route-planner";
import type { RoutePlannerOrigin } from "@/lib/route/route-planner";
import type { RouteGroupRoute, RouteMultiRouteMetrics, RoutePickupPreference } from "@/lib/route/route-response-contract";
import {
  buildRouteRecommendationTrace,
  type RouteMultiRouteTrace,
  type RouteTraceCandidateSummary,
} from "@/lib/route/route-trace";
import { buildRouteCalibrationContext } from "@/lib/route/route-calibration";
import type {
  buildRoutePlannerSnapshot,
  buildVerifiedRouteCalibrationContext,
} from "@/lib/route/route-calibration";
import { createRoutePlannerProof } from "@/lib/route/route-planner-proof";
import {
  buildRouteOperationalBudget,
  ROUTE_ORGANIZATION_MARGIN_MINUTES,
  type RouteOperationalBudgetDependency,
} from "@/lib/route/route-operational-budget";
import { buildCleanupWorkload } from "@/lib/route/route-cleanup-workload";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import type { RouteEventPressureContext, RouteCandidateData } from "./route.candidates";
import type { RoutePlanningResult } from "./route.planning";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import {
  buildRoutePlannerSnapshotForProof,
  buildRouteSnapshotStops,
  buildVerifiedProofCalibrationContext,
} from "./route.response.proofs";

export type RouteRecommendationResponseInput = {
  origin: RoutePlannerOrigin;
  locationPreference: { arrondissement?: number | null } | null;
  eventPressureContext: RouteEventPressureContext;
  candidateData: RouteCandidateData;
  planning: RoutePlanningResult;
  planningMode?: RoutePlanningMode;
  maxStops: number;
  travelBudgetMinutes: number;
  priorityVsTravel: number;
  volunteers: number;
  groupCount: number;
  pickupPreference: RoutePickupPreference;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
};

const EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT = {
  candidatePressureById: new Map(),
  completedEventsConsidered: 0,
  geolocatedCompletedEvents: 0,
  eventsWithoutCoordinates: 0,
  futureEventSignals: [],
  sourceAvailable: false,
  warnings: ["Le signal événementiel est indisponible pour ce calcul."],
};

type CalibrationCandidate = {
  candidateId: string;
  family: "observed" | "predicted";
  cleanupWorkload: ReturnType<typeof buildCleanupWorkload>;
};

export type OperationalContext = {
  generatedAt: string;
  calibrationCandidates: CalibrationCandidate[];
  operationalBudget: ReturnType<typeof buildRouteOperationalBudget>;
  groupRoutes: RouteGroupRoute[];
  multiRoute: RouteMultiRouteMetrics;
  multiRouteTrace: RouteMultiRouteTrace | null;
};

export type ProofContext = {
  predictionSummary: RoutePlanningResult["predictionSummary"] & {
    selected: number;
    selectedCandidateIds: string[];
  };
  trace: ReturnType<typeof buildRouteRecommendationTrace>;
  dataLayers: ReturnType<typeof resolveRouteDataLayers>;
  snapshotStops: RouteStop[];
  plannerSnapshot: ReturnType<typeof buildRoutePlannerSnapshot>;
  plannerProof: ReturnType<typeof createRoutePlannerProof>;
  calibrationContext: ReturnType<typeof buildVerifiedRouteCalibrationContext>;
};

function buildTraceCandidateSummary(
  candidateData: RouteCandidateData,
  plannerResult: RoutePlanningResult["plannerResult"],
): RouteTraceCandidateSummary {
  const actionableCandidates = candidateData.actionableCandidates ?? candidateData.candidates;
  const excludedByReason: Record<string, number> = {
    not_admissible: Math.max(0, candidateData.contracts.length - actionableCandidates.length),
    unsafe_trained_only: 0,
    unsafe_no_pickup: 0,
    unsafe_missing_categories: 0,
    unsafe_unknown_categories: 0,
    travel_budget: plannerResult.diagnostics.excludedByTravelBudget,
  };
  for (const candidate of actionableCandidates) {
    const reason = candidate.safety.specializationReason;
    if (reason) {
      const key = `unsafe_${reason}`;
      excludedByReason[key] = (excludedByReason[key] ?? 0) + 1;
    }
  }
  if (candidateData.sourceHealth.partial) excludedByReason.source_unavailable = 1;
  return {
    loaded: candidateData.contracts.length,
    admissible: candidateData.candidates.length,
    excluded: Object.entries(excludedByReason).reduce(
      (total, [reason, count]) => total + (reason === "source_unavailable" ? 0 : count),
      0,
    ),
    excludedByReason,
  };
}
function buildMultiRouteTrace(
  groupRoutes: RouteGroupRoute[],
  metrics: RouteMultiRouteMetrics,
): RouteMultiRouteTrace {
  return {
    groupCount: metrics.groupCount,
    volunteers: metrics.volunteers,
    groups: groupRoutes.map((group) => ({
      groupIndex: group.groupIndex,
      volunteerCount: group.volunteerCount,
      candidateIds: [...group.candidateIds],
      reservedCandidateIds: [...group.reservedCandidateIds],
      distanceKm: group.travelDistanceKm,
      durationMinutes: group.travelMinutes,
      targetCount: group.targetCount,
      routeMode: group.routeGeometry.mode,
      withinBudget: group.withinBudget,
      operationalBudget: group.operationalBudget,
    })),
    metrics: {
      coverageGain: metrics.coverageGain,
      sharedTargetRatio: metrics.sharedTargetRatio,
      sharedDistanceKm: metrics.sharedDistanceKm,
      sharedDistanceRatio: metrics.sharedDistanceRatio,
      networkOverlap: metrics.networkOverlap,
      cleaningCoverageOverlap: metrics.cleaningCoverageOverlap,
      balanceDistance: metrics.balanceDistance,
      balanceDuration: metrics.balanceDuration,
      balanceTargetCount: metrics.balanceTargetCount,
      balanceVolunteerCount: metrics.balanceVolunteerCount,
      networkDistanceMeasured: metrics.networkDistanceMeasured,
    },
    constraints: [
      "Chaque groupe conserve une origine commune et une boucle fermée.",
      "Un stop ne peut être attribué qu'à un seul groupe par défaut.",
      "La sécurité et le budget individuel priment sur la diversité des groupes.",
    ],
  };
}

function buildCalibrationCandidates(
  plannedStops: RoutePlanningResult["plannedStops"],
): CalibrationCandidate[] {
  return plannedStops.map(({ candidate }) => ({
    candidateId: candidate.id,
    family: candidate.family,
    cleanupWorkload: buildCleanupWorkload(candidate),
  }));
}

function buildGroupRoutesWithBudgets(
  input: RouteRecommendationResponseInput,
  generatedAt: string,
  durationDependency: RouteOperationalBudgetDependency | undefined,
  candidateById: Map<string, RoutePlanningResult["plannedStops"][number]["candidate"]>,
): RouteGroupRoute[] {
  return (input.planning.groupRoutes ?? []).map((group) => {
    const groupContext = buildRouteCalibrationContext({
      generatedAt,
      routeEngineVersion: ROUTE_PLANNER_ENGINE_VERSION,
      volunteersExpected: group.volunteerCount,
      groupCount: input.groupCount,
      candidates: group.candidateIds.flatMap((candidateId) => {
        const candidate = candidateById.get(candidateId);
        return candidate
          ? [{
              candidateId: candidate.id,
              family: candidate.family,
              cleanupWorkload: buildCleanupWorkload(candidate),
            }]
          : [];
      }),
    });
    const operationalBudget = buildRouteOperationalBudget({
      travelMinutes: group.travelMinutes,
      budgetMinutes: group.travelBudgetMinutes,
      calibrationContext: groupContext,
      durationDependency,
      weatherContext: input.weatherContext,
    });
    return {
      ...group,
      withinBudget: operationalBudget.withinBudget ?? group.withinBudget,
      operationalBudget,
    };
  });
}

function buildMultiRouteMetrics(
  input: RouteRecommendationResponseInput,
  operationalBudget: ReturnType<typeof buildRouteOperationalBudget>,
  groupRoutes: RouteGroupRoute[],
): RouteMultiRouteMetrics {
  const { planning, groupCount, volunteers } = input;
  const baseMultiRoute: RouteMultiRouteMetrics = planning.multiRouteMetrics ?? {
    groupCount,
    volunteers,
    totalDistanceKm: planning.routeGeometry.distanceKm,
    totalDurationMinutes: planning.routeGeometry.durationMinutes,
    coverageGain: planning.groupPartition.metrics.coverageGain,
    sharedTargetRatio: planning.groupPartition.metrics.sharedTargetRatio,
    sharedDistanceKm: null,
    sharedDistanceRatio: null,
    networkOverlap: null,
    cleaningCoverageOverlap: 0,
    balanceDistance: planning.groupPartition.metrics.balanceDistance,
    balanceDuration: planning.groupPartition.metrics.balanceDuration,
    balanceTargetCount: planning.groupPartition.metrics.balanceTargetCount,
    balanceVolunteerCount: 0,
    fallbackGroupCount: planning.routeGeometry.mode === "fallback" ? 1 : 0,
    networkDistanceMeasured: false,
  };
  const operationalNetworkOverlap = planning.streetCleaningCorridors?.operationalPlan?.networkOverlap;
  const groupBudgets = groupRoutes.map(({ operationalBudget: budget }) => budget);
  const operationalGroupsAvailable = groupBudgets.length > 0 && groupBudgets.every(
    (budget) => budget?.totalMinutes !== null && budget?.totalMinutes !== undefined,
  );
  const actionMinutes = groupBudgets.map((budget) => budget?.actionMinutes ?? 0);
  const totalOperationalMinutes = operationalGroupsAvailable
    ? Math.max(...actionMinutes) + ROUTE_ORGANIZATION_MARGIN_MINUTES
    : null;
  const balanceOperationalDuration = operationalGroupsAvailable
    ? Math.max(...actionMinutes) - Math.min(...actionMinutes)
    : null;
  return {
    ...baseMultiRoute,
    networkOverlap:
      operationalNetworkOverlap !== undefined
        ? operationalNetworkOverlap
        : baseMultiRoute.networkOverlap ?? null,
    cleaningCoverageOverlap:
      planning.streetCleaningCorridors?.operationalPlan?.cleaningCoverageOverlap ??
      baseMultiRoute.cleaningCoverageOverlap ?? 0,
    operationalBudgetAvailable:
      groupRoutes.length > 0 ? operationalGroupsAvailable : operationalBudget.totalMinutes !== null,
    totalOperationalMinutes:
      groupRoutes.length > 0 ? totalOperationalMinutes : operationalBudget.totalMinutes,
    balanceOperationalDuration:
      groupRoutes.length > 0 ? balanceOperationalDuration : null,
  };
}

export function buildRouteOperationalContext(
  input: RouteRecommendationResponseInput,
): OperationalContext {
  const generatedAt = new Date().toISOString();
  const durationDependency = input.operationalBudget ?? input.planning.operationalBudget;
  const calibrationCandidates = buildCalibrationCandidates(input.planning.plannedStops);
  const calibrationContextForBudget = buildRouteCalibrationContext({
    generatedAt,
    routeEngineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    volunteersExpected: input.volunteers,
    groupCount: input.groupCount,
    candidates: calibrationCandidates,
  });
  const operationalBudget = buildRouteOperationalBudget({
    travelMinutes: input.groupCount === 1
      ? input.planning.routeGeometry.durationMinutes
      : input.planning.multiRouteMetrics?.totalDurationMinutes ?? input.planning.routeGeometry.durationMinutes,
    budgetMinutes: input.travelBudgetMinutes,
    calibrationContext: calibrationContextForBudget,
    durationDependency,
    weatherContext: input.weatherContext,
  });
  const candidateById = new Map(
    input.planning.plannedStops.map((stop) => [stop.candidate.id, stop.candidate]),
  );
  const groupRoutes = buildGroupRoutesWithBudgets(
    input,
    generatedAt,
    durationDependency,
    candidateById,
  );
  const multiRoute = buildMultiRouteMetrics(input, operationalBudget, groupRoutes);
  return {
    generatedAt,
    calibrationCandidates,
    operationalBudget,
    groupRoutes,
    multiRoute,
    multiRouteTrace: groupRoutes.length > 1
      ? buildMultiRouteTrace(groupRoutes, multiRoute)
      : null,
  };
}

function buildPredictionSummary(
  planning: RoutePlanningResult,
): ProofContext["predictionSummary"] {
  const predictedStops = planning.plannedStops.filter(({ candidate }) => candidate.family === "predicted");
  return {
    ...planning.predictionSummary,
    riskFocus: planning.effectiveRiskFocus,
    selected: predictedStops.length,
    selectedCandidateIds: predictedStops.map(({ candidate }) => candidate.id),
  };
}

function buildRouteProofTrace(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
  predictionSummary: ProofContext["predictionSummary"],
): ReturnType<typeof buildRouteRecommendationTrace> {
  const { candidateData, planning } = input;
  return buildRouteRecommendationTrace({
    engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    planningMode: input.planningMode ?? { type: "free" },
    origin: input.origin,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    candidateSummary: buildTraceCandidateSummary(candidateData, planning.plannerResult),
    plannerResult: planning.plannerResult,
    selectedStops: input.groupCount === 1 ? planning.plannedStops : [],
    routeGeometry: planning.routeGeometry,
    consumedTravelMinutes: Math.max(context.multiRoute.totalDurationMinutes, 0),
    budgetPrefixApplied: planning.budgetPrefixApplied,
    sourceHealth: candidateData.sourceHealth,
    eventSignalContext: candidateData.routeEventSignalContext ?? EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT,
    eventCenteredContext: planning.eventCenteredContext,
    predictionSummary,
    effectiveRiskFocus: planning.effectiveRiskFocus,
    finalRoutingReconciliation: planning.finalRoutingReconciliation,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    pickupPreference: input.pickupPreference,
    multiRoute: context.multiRouteTrace,
    operationalBudget: context.operationalBudget,
    weatherContext: input.weatherContext,
  });
}

export function buildRouteProofContext(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
): ProofContext {
  const { candidateData, planning } = input;
  const { candidates, isTruncated, sourceHealth } = candidateData;
  const predictionSummary = buildPredictionSummary(planning);
  const dataLayers = resolveRouteDataLayers({
    observed: { candidateCount: candidates.length, isTruncated, sourceHealth },
    prediction: {
      status: predictionSummary.status,
      selectedCount: predictionSummary.selected,
    },
    selectedCount: planning.plannedStops.length,
    routeGeometryMode: planning.routeGeometry.mode,
  });
  const trace = buildRouteProofTrace(input, context, predictionSummary);
  const snapshotStops = buildRouteSnapshotStops(input, context);
  const plannerSnapshot = buildRoutePlannerSnapshotForProof(
    input,
    context,
    predictionSummary,
    dataLayers,
    snapshotStops,
  );
  const plannerProof = createRoutePlannerProof({
    snapshot: plannerSnapshot,
    now: new Date(context.generatedAt),
  });
  const calibrationContext = buildVerifiedProofCalibrationContext(
    input,
    context,
    plannerSnapshot,
    plannerProof,
  );
  return {
    predictionSummary,
    trace,
    dataLayers,
    snapshotStops,
    plannerSnapshot,
    plannerProof,
    calibrationContext,
  };
}
