import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import type { MunicipalCleaningServiceabilitySnapshot } from "@/lib/geo/municipal-cleaning-serviceability-contract";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import {
  applyRoutePredictionFinalRoutingBudgetAudit,
  applyRoutePredictionPlannerBudgetAudit,
  applyRoutePredictionPoolAudit,
  buildPredictedRouteCandidates,
  buildRoutePlannerCandidatePool,
} from "@/lib/route/route-predicted-targets";
import {
  fallbackRoutePrefixWithinBudget,
  planRoute,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "@/lib/route/route-planner";
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
};

function fallbackGeometryForPrefix(
  origin: RoutePlannerOrigin,
  stops: Array<{ latitude: number; longitude: number }>,
): ReturnType<typeof createFallbackRouteGeometry> {
  return createFallbackRouteGeometry([
    [origin.latitude, origin.longitude],
    ...stops.map(
      (stop) => [stop.latitude, stop.longitude] as [number, number],
    ),
    [origin.latitude, origin.longitude],
  ]);
}

export async function planRouteRecommendation(input: {
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
}): Promise<RoutePlanningResult> {
  const effectiveRiskFocus = input.effectiveRiskFocus;
  const baselinePlannerResult = planRoute({
    origin: input.origin,
    candidates: input.spatialCandidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    effectiveRiskFocus,
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
  const plannerResult = planRoute({
    origin: input.origin,
    candidates: candidatePool.candidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    effectiveRiskFocus,
  });
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
  };
  let groupPartition: RouteGroupPartitionResult | null =
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
  let plannedStops = plannerResult.stops;
  let routeGeometry = fallbackGeometryForPrefix(input.origin, []);
  let budgetPrefixApplied = false;
  let providerCalls = 0;
  let firstProviderMode: RouteGeometry["mode"] | null = null;
  let finalRoutingWarning: string | null = null;
  let finalRoutingDegraded = false;
  const stopsBeforeFinalRouting = plannedStops.length;
  let finalRoutingBudgetExcludedCandidateIds: string[] = [];
  let groupRoutes: RouteGroupRoute[] = [];
  let multiRouteMetrics: RouteMultiRouteMetrics | undefined;

  if (input.groupCount === 1 && plannedStops.length > 0) {
    const routeCoordinates: [number, number][] = [
      [input.origin.latitude, input.origin.longitude],
      ...plannedStops.map(
        ({ candidate }) =>
          [candidate.latitude, candidate.longitude] as [number, number],
      ),
      [input.origin.latitude, input.origin.longitude],
    ];
    routeGeometry = await routePolylineThroughFossgisFoot(
      routeCoordinates,
      {},
    );
    providerCalls += 1;
    firstProviderMode = routeGeometry.mode;

    if (routeGeometry.durationMinutes > input.travelBudgetMinutes) {
      budgetPrefixApplied = true;
      let reconciled = false;
      let retainedStops = [...plannedStops];

      if (routeGeometry.mode === "network") {
        while (retainedStops.length > 0) {
          retainedStops = retainedStops.slice(0, -1);
          if (retainedStops.length === 0) break;
          const retainedCoordinates: [number, number][] = [
            [input.origin.latitude, input.origin.longitude],
            ...retainedStops.map(
              ({ candidate }) =>
                [candidate.latitude, candidate.longitude] as [number, number],
            ),
            [input.origin.latitude, input.origin.longitude],
          ];
          try {
            providerCalls += 1;
            const reconciledGeometry = await routePolylineThroughFossgisFoot(
              retainedCoordinates,
              {},
            );
            if (reconciledGeometry.durationMinutes <= input.travelBudgetMinutes) {
              plannedStops = retainedStops;
              routeGeometry = reconciledGeometry;
              reconciled = true;
              if (reconciledGeometry.mode === "fallback") {
                finalRoutingDegraded = true;
                finalRoutingWarning =
                  "Le réseau n'a pas pu être recalculé dans le budget ; un fallback local fermé est utilisé.";
              }
              break;
            }
          } catch {
            finalRoutingDegraded = true;
            finalRoutingWarning =
              "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé.";
            break;
          }
        }
      }

      if (!reconciled) {
        finalRoutingDegraded = true;
        finalRoutingWarning =
          finalRoutingWarning ??
          "La géométrie réseau de la boucle dépasse le budget ; un fallback local fermé est utilisé.";
        const fallbackPrefix = fallbackRoutePrefixWithinBudget(
          input.origin,
          (routeGeometry.mode === "network" ? retainedStops : plannedStops).map(
            ({ candidate }) => candidate,
          ),
          input.travelBudgetMinutes,
          (coordinates) => createFallbackRouteGeometry(coordinates),
        );
        plannedStops = (routeGeometry.mode === "network" ? retainedStops : plannedStops).slice(
          0,
          fallbackPrefix.length,
        );
        routeGeometry = fallbackGeometryForPrefix(
          input.origin,
          plannedStops.map(({ candidate }) => candidate),
        );
      }
    }
  }

  if (input.groupCount === 1) {
    finalRoutingBudgetExcludedCandidateIds = plannerResult.stops
      .slice(plannedStops.length)
      .map(({ candidate }) => candidate.id);
    groupPartition = partitionRouteCandidates({
      ...partitionInput,
      plannerResult: {
        ...plannerResult,
        stops: plannedStops,
      },
    });
    groupRoutes = [buildSingleGroupRoute({
      group: groupPartition.groups[0]!,
      plannedStops,
      routeGeometry,
      travelBudgetMinutes: input.travelBudgetMinutes,
    })];
    multiRouteMetrics = {
      groupCount: 1,
      volunteers: input.volunteers,
      totalDistanceKm: routeGeometry.distanceKm,
      totalDurationMinutes: routeGeometry.durationMinutes,
      coverageGain: groupPartition.metrics.coverageGain,
      sharedTargetRatio: 0,
      sharedDistanceKm: null,
      sharedDistanceRatio: null,
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
      balanceVolunteerCount: 0,
      fallbackGroupCount: routeGeometry.mode === "fallback" ? 1 : 0,
      networkDistanceMeasured: false,
    };
  } else {
    if (!groupPartition) {
      throw new Error("La partition multi-groupe n'a pas été produite.");
    }
    const multiRouteResult: RouteMultiRouteResult = await routePartitionedGroups({
      origin: input.origin,
      candidates: candidatePool.candidates,
      partition: groupPartition,
      travelBudgetMinutes: input.travelBudgetMinutes,
      effectiveRiskFocus,
    });
    groupPartition = multiRouteResult.partition;
    groupRoutes = multiRouteResult.groupRoutes;
    multiRouteMetrics = multiRouteResult.metrics;
    plannedStops = multiRouteResult.plannedStops;
    routeGeometry = groupRoutes[0]?.routeGeometry ?? fallbackGeometryForPrefix(input.origin, []);
    budgetPrefixApplied = multiRouteResult.budgetPrefixApplied;
    providerCalls = multiRouteResult.providerCalls;
    firstProviderMode = multiRouteResult.firstProviderMode;
    finalRoutingDegraded = multiRouteResult.degraded;
    finalRoutingWarning = multiRouteResult.warning;
    finalRoutingBudgetExcludedCandidateIds = multiRouteResult.excludedCandidateIds;
  }
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
  };
}
