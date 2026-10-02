import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
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
import type { RouteGeometry } from "@/lib/route/route-contract";
import type { TrashSpotterRouteCandidate } from "@/lib/route/trash-spotter-recommendation";
import {
  buildEventCenteredCandidates,
  buildRouteEventCenteredContext,
  type RouteEventCenteredAnchor,
  type RouteEventCenteredContext,
} from "@/lib/route/route-event-centered";
import type { RouteEventSignalContext } from "@/lib/route/route-event-pressure";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import type { RouteFinalRoutingReconciliation } from "@/lib/route/route-trace";
import {
  buildSingleGroupRoute,
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
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import {
  buildStreetCleaningStreetPassesFromGeometry,
  buildUnknownStreetCleaningCorridorHandoff,
  planOperationalStreetCorridors,
  type StreetCleaningCorridorHandoff,
} from "@/lib/route/street-cleaning-corridor";

export type RoutePlanningResult = {
  plannerResult: RoutePlannerResult;
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
};

function planRecommendationCandidates(
  input: {
    origin: RoutePlannerOrigin;
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
  spatialCandidates: TrashSpotterRouteCandidate[];
  parisPressureSnapshot: ParisPressureSnapshot | null;
  municipalCleaningSnapshot?: MunicipalCleaningServiceabilitySnapshot | null;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  volunteers: number;
  groupCount: number;
  effectiveRiskFocus: RouteRiskFocus;
  planningMode: RoutePlanningMode;
  eventCenteredAnchor: RouteEventCenteredAnchor | null;
  eventSignalContext: RouteEventSignalContext;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
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
    candidates: candidatePool.candidates,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    planningMode: input.planningMode,
    effectiveRiskFocus,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
  };
  const groupPartition: RouteGroupPartitionResult | null =
    input.groupCount === 1
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
  const candidatesForPool = eventCenteredBuild?.candidates ?? comparableCandidates;
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
    candidates: preparation.candidatePool.candidates,
    partition: preparation.groupPartition,
    travelBudgetMinutes: input.travelBudgetMinutes,
    effectiveRiskFocus: preparation.effectiveRiskFocus,
    operationalBudget: input.operationalBudget,
    weatherContext: input.weatherContext,
  });
  return {
    plannedStops: multiRouteResult.plannedStops,
    routeGeometry: multiRouteResult.groupRoutes[0]?.routeGeometry ?? fallbackGeometryForPrefix(input.origin, []),
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
  const {
    effectiveRiskFocus,
    eventCenteredBuild,
    plannerResult,
  } = preparation;
  let predictionSummary = preparation.predictionSummary;
  const routingState = input.groupCount === 1
    ? buildSingleGroupRoutingState(
        input,
        preparation,
        await reconcileSingleRouteGeometry(
          input.origin,
          input.travelBudgetMinutes,
          plannerResult.stops,
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
  const operationalPasses = groupRoutes.length > 1
    ? groupRoutes.flatMap((group, index) =>
        buildStreetCleaningStreetPassesFromGeometry({
          routeId: `group-${group.groupIndex}`,
          routeOrder: index,
          routeGeometry: group.routeGeometry,
        }),
      )
    : buildStreetCleaningStreetPassesFromGeometry({
        routeId: "main",
        routeOrder: 0,
        routeGeometry,
      });
  const operationalCorridorPlan = planOperationalStreetCorridors({
    passes: operationalPasses,
  });
  return {
    plannerResult,
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
