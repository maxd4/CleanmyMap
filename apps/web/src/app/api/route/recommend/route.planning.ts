import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import type { MunicipalCleaningServiceabilitySnapshot } from "@/lib/geo/municipal-cleaning-serviceability-contract";
import {
  applyRoutePredictionFinalRoutingBudgetAudit,
  applyRoutePredictionPlannerBudgetAudit,
  applyRoutePredictionPoolAudit,
  buildPredictedRouteCandidates,
  buildRoutePlannerCandidatePool,
} from "@/lib/route/route-predicted-targets";
import {
  planRoute,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "@/lib/route/route-planner";
import {
  fallbackGeometryForPrefix,
  reconcileSingleRouteGeometry,
  type RouteGeometryReconciliation,
} from "@/lib/route/route-geometry-reconciliation";
import type { RouteOperationalBudgetDependency } from "@/lib/route/route-operational-budget";
import type { RouteGeometry, RouteTopology } from "@/lib/route/route-contract";
import type { PedestrianNetworkGraph } from "@/lib/route/pedestrian-network";
import {
  planPredictedPedestrianSegmentRoutes,
  type PedestrianSegmentRoutePlan,
  type SegmentRouteSelectionMetrics,
} from "@/lib/route/pedestrian-segment-route-planner";
import type { TrashSpotterRouteCandidate } from "@/lib/route/trash-spotter-recommendation";
import {
  buildEventCenteredCandidates,
  buildRouteEventCenteredContext,
  type RouteEventCenteredAnchor,
  type RouteEventCenteredContext,
} from "@/lib/route/route-event-centered";
import type { RouteEventSignalContext } from "@/lib/route/route-event-pressure";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import type { RouteGuidedBudget } from "@/lib/route/route-planning-mode";
import type { RouteFinalRoutingReconciliation } from "@/lib/route/route-trace";
import {
  buildSingleGroupRoute,
  measureSharedNetworkDistanceKm,
  routePartitionedGroups,
  type RouteMultiRouteResult,
} from "@/lib/route/route-multi-route";
import type {
  RouteGroupRoute,
  RouteMultiRouteMetrics,
} from "@/lib/route/route-response-contract";
import {
  MAX_ROUTE_PARTITION_CANDIDATES,
  partitionRouteCandidates,
  type RouteGroupPartitionResult,
} from "@/lib/route/route-group-partition";
import type { RouteRiskFocus } from "@/lib/route/route-predicted-targets";
import type { RouteObservedEnrichmentMetrics } from "@/lib/route/route-observed-enrichment";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import {
  buildStreetCleaningStreetPassesFromGeometry,
  buildUnknownStreetCleaningCorridorHandoff,
  planOperationalStreetCorridors,
  type StreetCleaningCorridorHandoff,
} from "@/lib/route/street-cleaning-corridor";

export type RoutePlanningResult = {
  plannerResult: RoutePlannerResult;
  /** The exact candidate pool and planner evaluations used by this run. */
  candidates?: RoutePlannerCandidate[];
  predictionSummary: ReturnType<typeof applyRoutePredictionPoolAudit>;
  /** The single predictive branch used by this planning run. */
  effectiveRiskFocus: RouteRiskFocus;
  plannedStops: RoutePlannerResult["stops"];
  routeGeometry: RouteGeometry;
  eventCenteredContext: RouteEventCenteredContext | null;
  budgetPrefixApplied: boolean;
  finalRoutingReconciliation?: RouteFinalRoutingReconciliation;
  groupPartition: RouteGroupPartitionResult;
  groupRoutes?: RouteGroupRoute[];
  multiRouteMetrics?: RouteMultiRouteMetrics;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  streetCleaningCorridors?: StreetCleaningCorridorHandoff;
  segmentSelection?: SegmentRouteSelectionMetrics;
  observedEnrichment?: RouteObservedEnrichmentMetrics;
};

function planRecommendationCandidates(
  input: {
    origin: RoutePlannerOrigin;
    arrival?: RoutePlannerOrigin;
    routeTopology: RouteTopology;
    spatialCandidates?: TrashSpotterRouteCandidate[];
    travelBudgetMinutes: number;
    maxStops: number;
    priorityVsTravel: number;
    volunteers: number;
    groupCount: number;
    operationalBudget?: RouteOperationalBudgetDependency;
    weatherContext?: PlannerWeatherContext;
  },
  candidates: RoutePlannerCandidate[],
  effectiveRiskFocus: RouteRiskFocus,
): RoutePlannerResult {
  return planRoute({
    ...input,
    candidates,
    effectiveRiskFocus,
    ...(input.operationalBudget || input.weatherContext
      ? {
          operationalBudget: input.operationalBudget,
          weatherContext: input.weatherContext,
          volunteersExpected: input.volunteers,
          groupCount: input.groupCount,
        }
      : {}),
  });
}

type RouteRecommendationInput = {
  origin: RoutePlannerOrigin;
  arrival?: RoutePlannerOrigin;
  routeTopology: RouteTopology;
  spatialCandidates: TrashSpotterRouteCandidate[];
  parisPressureSnapshot: ParisPressureSnapshot | null;
  pedestrianRiskProjection?: PedestrianRiskProjectionSnapshot | null;
  municipalCleaningSnapshot?: MunicipalCleaningServiceabilitySnapshot | null;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  volunteers: number;
  groupCount: number;
  effectiveRiskFocus: RouteRiskFocus;
  planningMode: RoutePlanningMode;
  guidedBudget?: RouteGuidedBudget;
  eventCenteredAnchor: RouteEventCenteredAnchor | null;
  eventSignalContext: RouteEventSignalContext;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  pedestrianNetwork?: PedestrianNetworkGraph | null;
};

function finalizeRouteRecommendationPreparation(
  input: RouteRecommendationInput,
  effectiveRiskFocus: RouteRiskFocus,
  baselinePlannerResult: RoutePlannerResult,
  predictionBuild: ReturnType<typeof buildPredictedRouteCandidates>,
  eventCenteredBuild: ReturnType<typeof buildEventCenteredCandidates> | null,
  candidatePool: ReturnType<typeof buildRoutePlannerCandidatePool>,
) {
  const plannerResult = planRecommendationCandidates(
    input,
    candidatePool.candidates,
    effectiveRiskFocus,
  );
  const partitionInput = {
    origin: input.origin,
    arrival: input.arrival,
    routeTopology: input.routeTopology,
    candidates: candidatePool.candidates,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    planningMode: input.planningMode,
    guidedBudget: input.guidedBudget,
    effectiveRiskFocus,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
  };
  const groupPartition: RouteGroupPartitionResult | null =
    input.groupCount === 1 && input.planningMode.type !== "territorial-guided"
      ? null
      : partitionRouteCandidates({
          ...partitionInput,
          plannerResult,
        });
  let predictionSummary = applyRoutePredictionPoolAudit(
    predictionBuild.summary,
    candidatePool.audit,
  );
  predictionSummary = applyRoutePredictionPlannerBudgetAudit(
    predictionSummary,
    {
      passedCandidateIds: candidatePool.audit.passedToPlannerCandidateIds,
      evaluations: plannerResult.audit?.evaluations ?? [],
    },
  );
  return {
    effectiveRiskFocus,
    baselinePlannerResult,
    predictionBuild,
    eventCenteredBuild,
    candidatePool,
    plannerResult,
    partitionInput,
    groupPartition,
    predictionSummary,
  };
}

function prepareRouteRecommendation(input: RouteRecommendationInput) {
  const effectiveRiskFocus = input.effectiveRiskFocus;
  const baselinePlannerResult = planRoute({
    origin: input.origin,
    arrival: input.arrival,
    routeTopology: input.routeTopology,
    candidates: input.spatialCandidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    effectiveRiskFocus,
    ...(input.operationalBudget || input.weatherContext
      ? {
          operationalBudget: input.operationalBudget,
          weatherContext: input.weatherContext,
          volunteersExpected: input.volunteers,
          groupCount: input.groupCount,
        }
      : {}),
  });
  const predictionBuild = buildPredictedRouteCandidates({
    snapshot: input.parisPressureSnapshot,
    projection: input.pedestrianRiskProjection,
    municipalCleaningSnapshot: input.municipalCleaningSnapshot,
    origin: input.origin,
    corridor: {
      points: [
        input.origin,
        ...baselinePlannerResult.stops.map(({ candidate }) => ({
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        })),
      ],
      source: "ordered_baseline",
    },
    travelBudgetMinutes: input.travelBudgetMinutes,
    effectiveRiskFocus,
    recentEvents: [...input.eventSignalContext.candidatePressureById.values()]
      .flatMap((pressure) => pressure.contributions)
      .map((event) => ({
        latitude: event.latitude,
        longitude: event.longitude,
        ageDays: event.ageDays,
        attendancePressure: event.attendanceFactor,
      })),
  });
  const comparableCandidates = [
    ...input.spatialCandidates,
    ...predictionBuild.candidates,
  ] as RoutePlannerCandidate[];
  const eventCenteredBuild = input.eventCenteredAnchor
    ? buildEventCenteredCandidates(comparableCandidates, input.eventCenteredAnchor)
    : null;
  const candidatesForPool = input.planningMode.type === "territorial-guided"
    ? []
    : eventCenteredBuild?.candidates ?? comparableCandidates;
  const candidatePool = buildRoutePlannerCandidatePool({
    observedCandidates: candidatesForPool.filter(
      (candidate) => candidate.family !== "predicted",
    ),
    predictedCandidates: candidatesForPool.filter(
      (candidate) => candidate.family === "predicted",
    ),
    effectiveRiskFocus,
    maxCandidates: input.groupCount === 1
      ? Math.max(input.maxStops * 2, 8)
      : Math.min(
          MAX_ROUTE_PARTITION_CANDIDATES,
          Math.max(input.maxStops * input.groupCount * 2, 8),
        ),
    allowUnknownPredictedSafety: Boolean(
      input.pedestrianNetwork &&
      input.pedestrianRiskProjection &&
      input.planningMode.type === "free",
    ),
  });
  return finalizeRouteRecommendationPreparation(
    input,
    effectiveRiskFocus,
    baselinePlannerResult,
    predictionBuild,
    eventCenteredBuild,
    candidatePool,
  );
}

type RouteRecommendationRoutingState = {
  plannedStops: RoutePlannerResult["stops"];
  routeGeometry: RouteGeometry;
  budgetPrefixApplied: boolean;
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  finalRoutingWarning: string | null;
  finalRoutingDegraded: boolean;
  stopsBeforeFinalRouting: number;
  finalRoutingBudgetExcludedCandidateIds: string[];
  groupPartition: RouteGroupPartitionResult;
  groupRoutes: RouteGroupRoute[];
  multiRouteMetrics: RouteMultiRouteMetrics | undefined;
};

function buildSingleGroupRoutingState(
  input: RouteRecommendationInput,
  preparation: ReturnType<typeof prepareRouteRecommendation>,
  geometry: RouteGeometryReconciliation,
): RouteRecommendationRoutingState {
  const finalRoutingBudgetExcludedCandidateIds = preparation.plannerResult.stops
    .slice(geometry.plannedStops.length)
    .map(({ candidate }) => candidate.id);
  const groupPartition = partitionRouteCandidates({
    ...preparation.partitionInput,
    plannerResult: {
      ...preparation.plannerResult,
      stops: geometry.plannedStops,
    },
    operationalBudget: input.operationalBudget,
  });
  return {
    ...geometry,
    stopsBeforeFinalRouting: preparation.plannerResult.stops.length,
    finalRoutingBudgetExcludedCandidateIds,
    groupPartition,
    groupRoutes: [buildSingleGroupRoute({
      group: groupPartition.groups[0]!,
      plannedStops: geometry.plannedStops,
      routeGeometry: geometry.routeGeometry,
      travelBudgetMinutes: input.travelBudgetMinutes,
    })],
    multiRouteMetrics: {
      groupCount: 1,
      volunteers: input.volunteers,
      totalDistanceKm: geometry.routeGeometry.distanceKm,
      totalDurationMinutes: geometry.routeGeometry.durationMinutes,
      coverageGain: groupPartition.metrics.coverageGain,
      sharedTargetRatio: 0,
      sharedDistanceKm: null,
      sharedDistanceRatio: null,
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
      balanceVolunteerCount: 0,
      fallbackGroupCount: geometry.routeGeometry.mode === "fallback" ? 1 : 0,
      networkDistanceMeasured: false,
    },
  };
}

async function buildMultiGroupRoutingState(
  input: RouteRecommendationInput,
  preparation: ReturnType<typeof prepareRouteRecommendation>,
): Promise<RouteRecommendationRoutingState> {
  if (!preparation.groupPartition) {
    throw new Error("La partition multi-groupe n'a pas été produite.");
  }
  const multiRouteResult: RouteMultiRouteResult = await routePartitionedGroups({
    origin: input.origin,
    arrival: input.arrival,
    routeTopology: input.routeTopology,
    candidates: preparation.candidatePool.candidates,
    partition: preparation.groupPartition,
    travelBudgetMinutes: input.travelBudgetMinutes,
    effectiveRiskFocus: preparation.effectiveRiskFocus,
    guidedBudget: input.guidedBudget,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
    pedestrianNetwork: input.pedestrianNetwork,
  });
  return {
    plannedStops: multiRouteResult.plannedStops,
    routeGeometry: multiRouteResult.groupRoutes[0]?.routeGeometry ?? fallbackGeometryForPrefix(input.origin, [], input.routeTopology, input.arrival),
    budgetPrefixApplied: multiRouteResult.budgetPrefixApplied,
    providerCalls: multiRouteResult.providerCalls,
    firstProviderMode: multiRouteResult.firstProviderMode,
    finalRoutingWarning: multiRouteResult.warning,
    finalRoutingDegraded: multiRouteResult.degraded,
    stopsBeforeFinalRouting: multiRouteResult.plannedStops.length + multiRouteResult.excludedCandidateIds.length,
    finalRoutingBudgetExcludedCandidateIds: multiRouteResult.excludedCandidateIds,
    groupPartition: multiRouteResult.partition,
    groupRoutes: multiRouteResult.groupRoutes,
    multiRouteMetrics: multiRouteResult.metrics,
  };
}

export async function planRouteRecommendation(input: RouteRecommendationInput): Promise<RoutePlanningResult> {
  const preparation = prepareRouteRecommendation(input);
  const segmentRoutePlan = input.pedestrianNetwork && input.pedestrianRiskProjection &&
    input.planningMode.type === "free"
    ? planPredictedPedestrianSegmentRoutes({
        origin: input.origin,
        arrival: input.arrival,
        routeTopology: input.routeTopology,
        candidates: preparation.candidatePool.candidates,
        projection: input.pedestrianRiskProjection,
        pedestrianNetwork: input.pedestrianNetwork,
        travelBudgetMinutes: input.travelBudgetMinutes,
        maxStops: input.maxStops,
        priorityVsTravel: input.priorityVsTravel,
        volunteers: input.volunteers,
        groupCount: input.groupCount,
        effectiveRiskFocus: input.effectiveRiskFocus,
      })
    : null;
  if (segmentRoutePlan) {
    return finalizePredictedSegmentRouteRecommendation(input, preparation, segmentRoutePlan);
  }
  const {
    effectiveRiskFocus,
    eventCenteredBuild,
    plannerResult,
  } = preparation;
  let predictionSummary = preparation.predictionSummary;
  const routingState = input.groupCount === 1 && input.planningMode.type !== "territorial-guided"
    ? buildSingleGroupRoutingState(
        input,
        preparation,
        await reconcileSingleRouteGeometry(
          input.origin,
          input.travelBudgetMinutes,
          plannerResult.stops,
          input.routeTopology,
          input.arrival,
          input.pedestrianNetwork,
        ),
      )
    : await buildMultiGroupRoutingState(input, preparation);
  const {
    plannedStops,
    routeGeometry,
    budgetPrefixApplied,
    providerCalls,
    firstProviderMode,
    finalRoutingWarning,
    finalRoutingDegraded,
    stopsBeforeFinalRouting,
    finalRoutingBudgetExcludedCandidateIds,
    groupPartition,
    groupRoutes,
    multiRouteMetrics,
  } = routingState;
  predictionSummary = applyRoutePredictionFinalRoutingBudgetAudit(
    predictionSummary,
    finalRoutingBudgetExcludedCandidateIds,
  );
  if (!groupPartition) {
    throw new Error("La partition de groupes n'a pas été produite.");
  }

  const eventCenteredContext = input.eventCenteredAnchor
    ? buildRouteEventCenteredContext(
        input.eventCenteredAnchor,
        input.origin,
        eventCenteredBuild?.impacts ?? [],
        plannedStops.map(({ candidate }) => candidate.id),
      )
    : null;
  const operationalPasses = buildOperationalPasses(groupRoutes ?? [], routeGeometry);
  const operationalCorridorPlan = planOperationalStreetCorridors({
    passes: operationalPasses,
  });
  return {
    plannerResult,
    candidates: preparation.candidatePool.candidates,
    predictionSummary,
    effectiveRiskFocus,
    plannedStops,
    routeGeometry,
    eventCenteredContext,
    budgetPrefixApplied,
    finalRoutingReconciliation: {
      stopsBefore: input.groupCount === 1
        ? stopsBeforeFinalRouting
        : plannedStops.length + finalRoutingBudgetExcludedCandidateIds.length,
      stopsAfter: plannedStops.length,
      excludedCandidateIds: finalRoutingBudgetExcludedCandidateIds,
      providerCalls,
      firstProviderMode,
      finalGeometryMode: routeGeometry.mode,
      degraded: finalRoutingDegraded,
      warning: finalRoutingWarning,
    },
    groupPartition,
    groupRoutes,
    multiRouteMetrics,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
    streetCleaningCorridors: buildUnknownStreetCleaningCorridorHandoff(
      "Aucune source géographique auditée ne prouve encore le côté du corridor.",
      operationalCorridorPlan,
    ),
    ...(input.weatherContext ? { weatherContext: structuredClone(input.weatherContext) } : {}),
  };
}

function finalizePredictedSegmentRouteRecommendation(
  input: RouteRecommendationInput,
  preparation: ReturnType<typeof prepareRouteRecommendation>,
  segmentRoutePlan: PedestrianSegmentRoutePlan,
): RoutePlanningResult {
  let predictionSummary = applyRoutePredictionPlannerBudgetAudit(
    preparation.predictionSummary,
    {
      passedCandidateIds: preparation.candidatePool.audit.passedToPlannerCandidateIds,
      evaluations: segmentRoutePlan.plannerResult.audit.evaluations,
    },
  );
  predictionSummary = applyRoutePredictionFinalRoutingBudgetAudit(
    predictionSummary,
    segmentRoutePlan.excludedCandidateIds,
  );
  const routeGeometry = segmentRoutePlan.routeGeometry;
  const groupRoutes = segmentRoutePlan.groupRoutes;
  const groupDistances = groupRoutes.map(({ travelDistanceKm }) => travelDistanceKm);
  const groupDurations = groupRoutes.map(({ travelMinutes }) => travelMinutes);
  const groupVolunteers = groupRoutes.map(({ volunteerCount }) => volunteerCount);
  const totalDistanceKm = groupDistances.reduce((total, distance) => total + distance, 0);
  const totalDurationMinutes = groupDurations.reduce((total, duration) => total + duration, 0);
  const sharedDistanceKm = measureSharedNetworkDistanceKm(groupRoutes);
  const sharedTargetIds = groupRoutes.flatMap(({ candidateIds }) => candidateIds);
  const sharedTargetRatio = sharedTargetIds.length === 0
    ? 0
    : Number(((sharedTargetIds.length - new Set(sharedTargetIds).size) / sharedTargetIds.length).toFixed(3));
  const operationalPasses = buildOperationalPasses(groupRoutes, routeGeometry);
  const operationalCorridorPlan = planOperationalStreetCorridors({ passes: operationalPasses });
  const multiRouteMetrics: RouteMultiRouteMetrics = {
    groupCount: input.groupCount,
    volunteers: input.volunteers,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationMinutes,
    coverageGain: Number(groupRoutes.reduce((total, route) =>
      total + route.candidateIds.reduce((sum, id) => {
        const candidate = preparation.candidatePool.candidates.find(({ id: candidateId }) => candidateId === id);
        return sum + (candidate?.score ?? 0) / 100;
      }, 0), 0).toFixed(2)),
    sharedTargetRatio,
    sharedDistanceKm,
    sharedDistanceRatio: sharedDistanceKm === null || totalDistanceKm === 0
      ? null
      : Number((sharedDistanceKm / totalDistanceKm).toFixed(3)),
    networkOverlap: operationalCorridorPlan.networkOverlap,
    cleaningCoverageOverlap: operationalCorridorPlan.cleaningCoverageOverlap,
    balanceDistance: groupDistances.length > 0 ? Math.max(...groupDistances) - Math.min(...groupDistances) : 0,
    balanceDuration: groupDurations.length > 0 ? Math.max(...groupDurations) - Math.min(...groupDurations) : 0,
    balanceTargetCount: groupRoutes.length > 0 ? Math.max(...groupRoutes.map(({ targetCount }) => targetCount)) - Math.min(...groupRoutes.map(({ targetCount }) => targetCount)) : 0,
    balanceVolunteerCount: groupVolunteers.length > 0
      ? Math.max(...groupVolunteers) - Math.min(...groupVolunteers)
      : 0,
    fallbackGroupCount: groupRoutes.filter(({ routeGeometry: geometry }) => geometry.mode === "fallback").length,
    networkDistanceMeasured: sharedDistanceKm !== null,
  };
  return {
    plannerResult: segmentRoutePlan.plannerResult,
    candidates: preparation.candidatePool.candidates,
    predictionSummary,
    effectiveRiskFocus: input.effectiveRiskFocus,
    plannedStops: segmentRoutePlan.plannedStops,
    routeGeometry,
    eventCenteredContext: null,
    budgetPrefixApplied: false,
    finalRoutingReconciliation: {
      stopsBefore: segmentRoutePlan.plannerResult.stops.length,
      stopsAfter: segmentRoutePlan.plannedStops.length,
      excludedCandidateIds: segmentRoutePlan.excludedCandidateIds,
      providerCalls: 0,
      firstProviderMode: routeGeometry.mode,
      finalGeometryMode: routeGeometry.mode,
      degraded: segmentRoutePlan.degraded,
      warning: segmentRoutePlan.warning,
    },
    groupPartition: segmentRoutePlan.partition,
    groupRoutes,
    multiRouteMetrics,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
    segmentSelection: segmentRoutePlan.metrics,
    observedEnrichment: segmentRoutePlan.observedEnrichment,
    streetCleaningCorridors: buildUnknownStreetCleaningCorridorHandoff(
      "Aucune source géographique auditée ne prouve encore le côté du corridor.",
      operationalCorridorPlan,
    ),
    ...(input.weatherContext ? { weatherContext: structuredClone(input.weatherContext) } : {}),
  };
}

function buildOperationalPasses(
  groupRoutes: NonNullable<RoutePlanningResult["groupRoutes"]>,
  routeGeometry: RoutePlanningResult["routeGeometry"],
) {
  return groupRoutes.length > 1
    ? groupRoutes.flatMap((group, index) => buildStreetCleaningStreetPassesFromGeometry({ routeId: `group-${group.groupIndex}`, routeOrder: index, routeGeometry: group.routeGeometry }))
    : buildStreetCleaningStreetPassesFromGeometry({ routeId: "main", routeOrder: 0, routeGeometry });
}
