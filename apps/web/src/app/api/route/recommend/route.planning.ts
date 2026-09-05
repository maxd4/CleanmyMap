import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import {
  applyRoutePredictionPlannerBudgetAudit,
  applyRoutePredictionPoolAudit,
  buildPredictedRouteCandidates,
  buildRoutePlannerCandidatePool,
} from "@/lib/route/route-predicted-targets";
import {
  fallbackRoutePrefixWithinBudget,
  longestNetworkPrefixWithinBudget,
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

export type RoutePlanningResult = {
  plannerResult: RoutePlannerResult;
  predictionSummary: ReturnType<typeof applyRoutePredictionPoolAudit>;
  plannedStops: RoutePlannerResult["stops"];
  routeGeometry: RouteGeometry;
  eventCenteredContext: RouteEventCenteredContext | null;
  budgetPrefixApplied: boolean;
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
  ]);
}

export async function planRouteRecommendation(input: {
  origin: RoutePlannerOrigin;
  spatialCandidates: TrashSpotterRouteCandidate[];
  parisPressureSnapshot: ParisPressureSnapshot | null;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  planningMode: RoutePlanningMode;
  eventCenteredAnchor: RouteEventCenteredAnchor | null;
  eventSignalContext: RouteEventSignalContext;
}): Promise<RoutePlanningResult> {
  const baselinePlannerResult = planRoute({
    origin: input.origin,
    candidates: input.spatialCandidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
  });
  const predictionBuild = buildPredictedRouteCandidates({
    snapshot: input.parisPressureSnapshot,
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
    maxCandidates: Math.max(input.maxStops * 2, 8),
  });
  const plannerResult = planRoute({
    origin: input.origin,
    candidates: candidatePool.candidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
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
  let routeGeometry = createFallbackRouteGeometry([]);
  let budgetPrefixApplied = false;

  if (plannedStops.length > 0) {
    const routeCoordinates: [number, number][] = [
      [input.origin.latitude, input.origin.longitude],
      ...plannedStops.map(
        ({ candidate }) =>
          [candidate.latitude, candidate.longitude] as [number, number],
      ),
    ];
    routeGeometry = await routePolylineThroughFossgisFoot(
      routeCoordinates,
      {},
    );

    if (routeGeometry.durationMinutes > input.travelBudgetMinutes) {
      budgetPrefixApplied = true;
      if (routeGeometry.mode === "network") {
        const prefixLength = longestNetworkPrefixWithinBudget(
          routeGeometry.legs,
          input.travelBudgetMinutes,
        );
        plannedStops = plannedStops.slice(0, prefixLength);
      } else {
        const fallbackPrefix = fallbackRoutePrefixWithinBudget(
          input.origin,
          plannedStops.map(({ candidate }) => candidate),
          input.travelBudgetMinutes,
          (coordinates) => createFallbackRouteGeometry(coordinates),
        );
        plannedStops = plannedStops.slice(0, fallbackPrefix.length);
      }
      routeGeometry = fallbackGeometryForPrefix(
        input.origin,
        plannedStops.map(({ candidate }) => candidate),
      );
    }
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
    plannedStops,
    routeGeometry,
    eventCenteredContext,
    budgetPrefixApplied,
  };
}
