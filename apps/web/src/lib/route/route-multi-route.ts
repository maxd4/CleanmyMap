import { routePolylineThroughFossgisFoot } from "./fossgis-foot-routing";
import {
  applyOriginRouteGeometryLegs,
  type RouteGeometry,
  type RouteStop,
} from "./route-contract";
import type {
  RouteGroupRoute,
  RouteMultiRouteMetrics,
} from "./route-response-contract";
import {
  routeDistanceKm,
  travelMinutesForDistance,
  type PlannedRouteStop,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
} from "./route-planner";
import type {
  RouteGroupAssignment,
  RouteGroupPartitionResult,
} from "./route-group-partition";
import type { RouteRiskFocus } from "./route-predicted-targets";

type Coordinate = [number, number];

export type RouteMultiRouteResult = {
  effectiveRiskFocus: RouteRiskFocus;
  partition: RouteGroupPartitionResult;
  groupRoutes: RouteGroupRoute[];
  plannedStops: PlannedRouteStop[];
  metrics: RouteMultiRouteMetrics;
  excludedCandidateIds: string[];
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  degraded: boolean;
  warning: string | null;
  budgetPrefixApplied: boolean;
};

type RouteGroupRoutingResult = {
  group: RouteGroupAssignment;
  finalCandidateIds: string[];
  routeGeometry: RouteGeometry;
  plannedStops: PlannedRouteStop[];
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  degraded: boolean;
  warning: string | null;
  budgetPrefixApplied: boolean;
};

const NETWORK_CORRIDOR_RADIUS_KM = 0.05;
function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function closedCoordinates(
  origin: RoutePlannerOrigin,
  candidates: readonly RoutePlannerCandidate[],
): Coordinate[] {
  return [
    [origin.latitude, origin.longitude],
    ...candidates.map(({ latitude, longitude }) => [latitude, longitude] as Coordinate),
    [origin.latitude, origin.longitude],
  ];
}

function fallbackGeometry(
  origin: RoutePlannerOrigin,
  candidates: readonly RoutePlannerCandidate[],
): RouteGeometry {
  const coordinates = closedCoordinates(origin, candidates);
  const legs = coordinates.slice(1).map((point, index) => {
    const from = coordinates[index]!;
    const distanceKm = routeDistanceKm(
      { latitude: from[0], longitude: from[1] },
      { latitude: point[0], longitude: point[1] },
    );
    return {
      fromStopIndex: index,
      toStopIndex: index + 1,
      distanceKm: round(distanceKm, 2),
      estimatedMinutes: Math.max(0, Math.round(travelMinutesForDistance(distanceKm))),
    };
  });
  const distanceKm = legs.reduce((total, leg) => total + leg.distanceKm, 0);
  const durationMinutes = legs.reduce((total, leg) => total + leg.estimatedMinutes, 0);
  return {
    isLoop: true,
    origin: coordinates[0] ?? null,
    returnLeg: legs.at(-1) ?? null,
    coordinates,
    distanceKm: round(distanceKm, 2),
    durationMinutes,
    legs,
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function plannedStopsFromGeometry(
  origin: RoutePlannerOrigin,
  candidates: readonly RoutePlannerCandidate[],
  geometry: RouteGeometry,
): PlannedRouteStop[] {
  let cumulativeDistanceKm = 0;
  let cumulativeTravelMinutes = 0;
  return candidates.map((candidate, index) => {
    const outboundLeg = geometry.legs[index];
    const returnLeg = geometry.legs[index + 1] ?? geometry.returnLeg;
    const incrementalDistanceKm = outboundLeg?.distanceKm ?? routeDistanceKm(
      index === 0 ? origin : candidates[index - 1]!,
      candidate,
    );
    const incrementalTravelMinutes = outboundLeg?.estimatedMinutes ?? Math.round(
      travelMinutesForDistance(incrementalDistanceKm),
    );
    const returnDistanceKm = returnLeg?.distanceKm ?? routeDistanceKm(candidate, origin);
    const returnTravelMinutes = returnLeg?.estimatedMinutes ?? Math.round(
      travelMinutesForDistance(returnDistanceKm),
    );
    cumulativeDistanceKm += incrementalDistanceKm;
    cumulativeTravelMinutes += incrementalTravelMinutes;
    return {
      candidate,
      incrementalDistanceKm,
      incrementalTravelMinutes,
      cumulativeTravelMinutes,
      returnDistanceKm,
      returnTravelMinutes,
      loopDistanceKm: cumulativeDistanceKm + returnDistanceKm,
      loopTravelMinutes: cumulativeTravelMinutes + returnTravelMinutes,
    };
  });
}

function routeStopsFromPlanned(plannedStops: PlannedRouteStop[], geometry: RouteGeometry): RouteStop[] {
  const baseStops = plannedStops.map(({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
    id: candidate.id,
    label: candidate.label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    segmentKm: incrementalDistanceKm,
    estimatedMinutes: Math.max(0, Math.round(incrementalTravelMinutes)),
    priorityReason: candidate.reason,
    score: Number(candidate.score.toFixed(2)),
    evidence: candidate.evidence,
  }));
  return applyOriginRouteGeometryLegs(baseStops, geometry);
}

async function routeGroupWithinBudget(
  origin: RoutePlannerOrigin,
  group: RouteGroupAssignment,
  candidatesById: Map<string, RoutePlannerCandidate>,
  travelBudgetMinutes: number,
): Promise<RouteGroupRoutingResult> {
  const initialCandidates = group.candidateIds
    .map((id) => candidatesById.get(id))
    .filter((candidate): candidate is RoutePlannerCandidate => candidate !== undefined);
  let providerCalls = 0;
  let firstProviderMode: RouteGeometry["mode"] | null = null;
  let degraded = false;
  let warning: string | null = null;
  let budgetPrefixApplied = false;

  if (initialCandidates.length === 0) {
    const geometry = fallbackGeometry(origin, []);
    return {
      group,
      finalCandidateIds: [],
      routeGeometry: geometry,
      plannedStops: [],
      providerCalls: 0,
      firstProviderMode: null,
      degraded: false,
      warning: null,
      budgetPrefixApplied: false,
    };
  }

  let retainedCandidates = [...initialCandidates];
  let geometry: RouteGeometry;
  try {
    geometry = await routePolylineThroughFossgisFoot(closedCoordinates(origin, retainedCandidates), {});
    providerCalls += 1;
    firstProviderMode = geometry.mode;
  } catch {
    geometry = fallbackGeometry(origin, retainedCandidates);
    providerCalls += 1;
    firstProviderMode = "fallback";
    degraded = true;
    warning = "Le routage réseau d'un groupe a échoué ; un fallback local fermé est utilisé.";
  }

  if (geometry.durationMinutes > travelBudgetMinutes) {
    budgetPrefixApplied = true;
    if (geometry.mode === "network") {
      while (retainedCandidates.length > 0) {
        retainedCandidates = retainedCandidates.slice(0, -1);
        if (retainedCandidates.length === 0) break;
        try {
          const candidateGeometry = await routePolylineThroughFossgisFoot(
            closedCoordinates(origin, retainedCandidates),
            {},
          );
          providerCalls += 1;
          if (candidateGeometry.durationMinutes <= travelBudgetMinutes) {
            geometry = candidateGeometry;
            break;
          }
        } catch {
          degraded = true;
          warning = "La boucle réseau réduite d'un groupe a échoué ; un fallback local fermé est utilisé.";
          break;
        }
      }
    }

    if (geometry.durationMinutes > travelBudgetMinutes || retainedCandidates.length === 0) {
      degraded = true;
      warning = warning ?? "Le réseau ne permet pas de respecter le budget de ce groupe ; un fallback local fermé est utilisé.";
      retainedCandidates = [];
      geometry = fallbackGeometry(origin, []);
      for (let count = initialCandidates.length; count > 0; count -= 1) {
        const prefix = initialCandidates.slice(0, count);
        const candidateGeometry = fallbackGeometry(origin, prefix);
        if (candidateGeometry.durationMinutes <= travelBudgetMinutes) {
          retainedCandidates = prefix;
          geometry = candidateGeometry;
          break;
        }
      }
    }
  }

  const plannedStops = plannedStopsFromGeometry(origin, retainedCandidates, geometry);
  return {
    group,
    finalCandidateIds: retainedCandidates.map(({ id }) => id),
    routeGeometry: geometry,
    plannedStops,
    providerCalls,
    firstProviderMode,
    degraded,
    warning,
    budgetPrefixApplied,
  };
}

function segmentMidpoint(left: Coordinate, right: Coordinate): Coordinate {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

function measuredSharedDistanceKm(routes: readonly RouteGroupRoutingResult[]): number | null {
  if (routes.length < 2 || routes.some(({ routeGeometry }) => routeGeometry.mode !== "network")) {
    return null;
  }
  let sharedDistanceKm = 0;
  for (let leftIndex = 0; leftIndex < routes.length; leftIndex += 1) {
    const leftCoordinates = routes[leftIndex]!.routeGeometry.coordinates;
    for (let rightIndex = leftIndex + 1; rightIndex < routes.length; rightIndex += 1) {
      const rightCoordinates = routes[rightIndex]!.routeGeometry.coordinates;
      for (let leftSegment = 0; leftSegment < leftCoordinates.length - 1; leftSegment += 1) {
        const leftMidpoint = segmentMidpoint(leftCoordinates[leftSegment]!, leftCoordinates[leftSegment + 1]!);
        const leftDistanceKm = routeDistanceKm(
          { latitude: leftCoordinates[leftSegment]![0], longitude: leftCoordinates[leftSegment]![1] },
          { latitude: leftCoordinates[leftSegment + 1]![0], longitude: leftCoordinates[leftSegment + 1]![1] },
        );
        if (leftDistanceKm === 0) continue;
        for (let rightSegment = 0; rightSegment < rightCoordinates.length - 1; rightSegment += 1) {
          const rightMidpoint = segmentMidpoint(rightCoordinates[rightSegment]!, rightCoordinates[rightSegment + 1]!);
          if (routeDistanceKm(
            { latitude: leftMidpoint[0], longitude: leftMidpoint[1] },
            { latitude: rightMidpoint[0], longitude: rightMidpoint[1] },
          ) <= NETWORK_CORRIDOR_RADIUS_KM) {
            sharedDistanceKm += Math.min(leftDistanceKm, routeDistanceKm(
              { latitude: rightCoordinates[rightSegment]![0], longitude: rightCoordinates[rightSegment]![1] },
              { latitude: rightCoordinates[rightSegment + 1]![0], longitude: rightCoordinates[rightSegment + 1]![1] },
            ));
            break;
          }
        }
      }
    }
  }
  return round(sharedDistanceKm, 2);
}

function sharedTargetRatio(routes: readonly RouteGroupRoutingResult[]): number {
  const ids = routes.flatMap(({ finalCandidateIds }) => finalCandidateIds);
  if (ids.length === 0) return 0;
  return round((ids.length - new Set(ids).size) / ids.length);
}

function balanceRange(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

export async function routePartitionedGroups(input: {
  origin: RoutePlannerOrigin;
  candidates: readonly RoutePlannerCandidate[];
  partition: RouteGroupPartitionResult;
  travelBudgetMinutes: number;
  effectiveRiskFocus?: RouteRiskFocus;
}): Promise<RouteMultiRouteResult> {
  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const routedGroups: RouteGroupRoutingResult[] = [];
  for (const group of [...input.partition.groups].sort((left, right) => left.groupIndex - right.groupIndex)) {
    routedGroups.push(await routeGroupWithinBudget(
      input.origin,
      group,
      candidatesById,
      input.travelBudgetMinutes,
    ));
  }

  const allFinalIds = new Set(routedGroups.flatMap(({ finalCandidateIds }) => finalCandidateIds));
  const excludedCandidateIds = input.partition.groups
    .flatMap(({ candidateIds }) => candidateIds)
    .filter((candidateId) => !allFinalIds.has(candidateId));
  const sharedDistanceKm = measuredSharedDistanceKm(routedGroups);
  const totalDistanceKm = routedGroups.reduce((total, route) => total + route.routeGeometry.distanceKm, 0);
  const totalDurationMinutes = routedGroups.reduce((total, route) => total + route.routeGeometry.durationMinutes, 0);
  const groupRoutes: RouteGroupRoute[] = routedGroups.map((route) => {
    const finalGroup = {
      ...route.group,
      candidateIds: route.finalCandidateIds,
      targetCount: route.finalCandidateIds.length,
      estimatedDistanceKm: round(route.routeGeometry.distanceKm, 2),
      estimatedDurationMinutes: round(route.routeGeometry.durationMinutes, 2),
    };
    return {
      ...finalGroup,
      reservedCandidateIds: routedGroups
        .filter(({ group }) => group.groupIndex !== route.group.groupIndex)
        .flatMap(({ finalCandidateIds }) => finalCandidateIds),
      stops: routeStopsFromPlanned(route.plannedStops, route.routeGeometry),
      routeGeometry: route.routeGeometry,
      travelDistanceKm: round(route.routeGeometry.distanceKm, 2),
      travelMinutes: route.routeGeometry.durationMinutes,
      travelBudgetMinutes: input.travelBudgetMinutes,
      withinBudget: route.routeGeometry.durationMinutes <= input.travelBudgetMinutes,
    };
  });
  const metrics: RouteMultiRouteMetrics = {
    groupCount: input.partition.groupCount,
    volunteers: input.partition.volunteers,
    totalDistanceKm: round(totalDistanceKm, 2),
    totalDurationMinutes,
    coverageGain: round(groupRoutes.reduce(
      (total, route) => total + route.candidateIds.reduce((sum, candidateId) => {
        const candidate = input.candidates.find(({ id }) => id === candidateId);
        return sum + (candidate?.finalPlannerContribution ?? candidate?.score ?? 0) / 100;
      }, 0),
      0,
    )),
    sharedTargetRatio: sharedTargetRatio(routedGroups),
    sharedDistanceKm,
    sharedDistanceRatio: sharedDistanceKm === null || totalDistanceKm === 0
      ? null
      : round(sharedDistanceKm / totalDistanceKm),
    balanceDistance: round(balanceRange(groupRoutes.map(({ travelDistanceKm }) => travelDistanceKm)), 2),
    balanceDuration: round(balanceRange(groupRoutes.map(({ travelMinutes }) => travelMinutes)), 2),
    balanceTargetCount: balanceRange(groupRoutes.map(({ targetCount }) => targetCount)),
    balanceVolunteerCount: balanceRange(groupRoutes.map(({ volunteerCount }) => volunteerCount)),
    fallbackGroupCount: groupRoutes.filter(({ routeGeometry }) => routeGeometry.mode === "fallback").length,
    networkDistanceMeasured: sharedDistanceKm !== null,
  };
  const partition: RouteGroupPartitionResult = {
      ...input.partition,
    groups: groupRoutes.map((group) => ({
      groupIndex: group.groupIndex,
      volunteerCount: group.volunteerCount,
      origin: { ...group.origin },
      candidateIds: [...group.candidateIds],
      estimatedDistanceKm: group.estimatedDistanceKm,
      estimatedDurationMinutes: group.estimatedDurationMinutes,
      targetCount: group.targetCount,
    })),
    metrics: {
      ...input.partition.metrics,
      sharedTargetRatio: metrics.sharedTargetRatio,
      balanceDistance: metrics.balanceDistance,
      balanceDuration: metrics.balanceDuration,
      balanceTargetCount: metrics.balanceTargetCount,
    },
    audit: {
      ...input.partition.audit,
      excludedByPartitionBoundCandidateIds: [
        ...new Set([
          ...input.partition.audit.excludedByPartitionBoundCandidateIds,
          ...excludedCandidateIds,
        ]),
      ],
      assignments: input.partition.audit.assignments.filter(({ candidateId }) =>
        allFinalIds.has(candidateId),
      ),
      overlapCosts: {
        ...input.partition.audit.overlapCosts,
        networkSharedDistanceKm: sharedDistanceKm,
        networkDistanceMeasured: metrics.networkDistanceMeasured,
      },
    },
  };
  return {
    effectiveRiskFocus: input.effectiveRiskFocus ?? input.partition.audit.effectiveRiskFocus ?? "all",
    partition,
    groupRoutes,
    plannedStops: routedGroups.flatMap(({ plannedStops }) => plannedStops),
    metrics,
    excludedCandidateIds,
    providerCalls: routedGroups.reduce((total, route) => total + route.providerCalls, 0),
    firstProviderMode: routedGroups[0]?.firstProviderMode ?? null,
    degraded: routedGroups.some(({ degraded }) => degraded),
    warning: routedGroups.map(({ warning }) => warning).find(Boolean) ?? null,
    budgetPrefixApplied: routedGroups.some(({ budgetPrefixApplied }) => budgetPrefixApplied),
  };
}

export function buildSingleGroupRoute(input: {
  group: RouteGroupAssignment;
  plannedStops: PlannedRouteStop[];
  routeGeometry: RouteGeometry;
  travelBudgetMinutes: number;
}): RouteGroupRoute {
  return {
    ...input.group,
    reservedCandidateIds: [],
    stops: routeStopsFromPlanned(input.plannedStops, input.routeGeometry),
    routeGeometry: input.routeGeometry,
    travelDistanceKm: input.routeGeometry.distanceKm,
    travelMinutes: input.routeGeometry.durationMinutes,
    travelBudgetMinutes: input.travelBudgetMinutes,
    withinBudget: input.routeGeometry.durationMinutes <= input.travelBudgetMinutes,
  };
}
