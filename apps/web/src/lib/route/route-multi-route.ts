import {
  type RouteGeometry,
} from "./route-contract";
import type {
  RouteGroupRoute,
  RouteMultiRouteMetrics,
} from "./route-response-contract";
import {
  routeDistanceKm,
  type PlannedRouteStop,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
} from "./route-planner";
import type {
  RouteGroupAssignment,
  RouteGroupPartitionResult,
} from "./route-group-partition";
import type { RouteRiskFocus } from "./route-predicted-targets";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import type { RouteOperationalBudgetDependency } from "./route-operational-budget";
import {
  routeGroupWithinBudget,
  routeStopsFromPlanned,
  type RouteGroupRoutingResult,
} from "./route-multi-route-group";
import { projectMeetingPointFromGeometry } from "./route-operational";

type Coordinate = [number, number];

const NETWORK_CORRIDOR_RADIUS_KM = 0.05;

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

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

function segmentMidpoint(left: Coordinate, right: Coordinate): Coordinate {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

function sharedDistanceForPair(
  leftCoordinates: readonly Coordinate[],
  rightCoordinates: readonly Coordinate[],
): number {
  let sharedDistanceKm = 0;
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
  return sharedDistanceKm;
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
      sharedDistanceKm += sharedDistanceForPair(leftCoordinates, rightCoordinates);
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

function buildRouteMultiGroup(
  route: RouteGroupRoutingResult,
  routedGroups: readonly RouteGroupRoutingResult[],
  travelBudgetMinutes: number,
): RouteGroupRoute {
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
    travelBudgetMinutes,
    withinBudget: route.routeGeometry.durationMinutes <= travelBudgetMinutes,
    meetingPoint: projectMeetingPointFromGeometry(route.routeGeometry),
  };
}

async function routeMultiGroups(input: {
  origin: RoutePlannerOrigin;
  candidates: readonly RoutePlannerCandidate[];
  partition: RouteGroupPartitionResult;
  travelBudgetMinutes: number;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
}): Promise<RouteGroupRoutingResult[]> {
  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const routedGroups: RouteGroupRoutingResult[] = [];
  for (const group of [...input.partition.groups].sort((left, right) => left.groupIndex - right.groupIndex)) {
    routedGroups.push(await routeGroupWithinBudget(
      input.origin,
      group,
      candidatesById,
      input.travelBudgetMinutes,
      input.operationalBudget,
      input.weatherContext,
      group.volunteerCount,
      input.partition.groupCount,
    ));
  }
  return routedGroups;
}

function buildRouteMultiMetrics(
  input: { candidates: readonly RoutePlannerCandidate[]; partition: RouteGroupPartitionResult },
  routedGroups: readonly RouteGroupRoutingResult[],
  groupRoutes: readonly RouteGroupRoute[],
  sharedDistanceKm: number | null,
  totalDistanceKm: number,
  totalDurationMinutes: number,
): RouteMultiRouteMetrics {
  return {
    groupCount: input.partition.groupCount,
    volunteers: input.partition.volunteers,
    totalDistanceKm: round(totalDistanceKm, 2),
    totalDurationMinutes,
    coverageGain: round(groupRoutes.reduce((total, route) => total + route.candidateIds.reduce((sum, candidateId) => {
      const candidate = input.candidates.find(({ id }) => id === candidateId);
      return sum + (candidate?.finalPlannerContribution ?? candidate?.score ?? 0) / 100;
    }, 0), 0)),
    sharedTargetRatio: sharedTargetRatio(routedGroups),
    sharedDistanceKm,
    sharedDistanceRatio: sharedDistanceKm === null || totalDistanceKm === 0 ? null : round(sharedDistanceKm / totalDistanceKm),
    balanceDistance: round(balanceRange(groupRoutes.map(({ travelDistanceKm }) => travelDistanceKm)), 2),
    balanceDuration: round(balanceRange(groupRoutes.map(({ travelMinutes }) => travelMinutes)), 2),
    balanceTargetCount: balanceRange(groupRoutes.map(({ targetCount }) => targetCount)),
    balanceVolunteerCount: balanceRange(groupRoutes.map(({ volunteerCount }) => volunteerCount)),
    fallbackGroupCount: groupRoutes.filter(({ routeGeometry }) => routeGeometry.mode === "fallback").length,
    networkDistanceMeasured: sharedDistanceKm !== null,
  };
}

function buildRouteMultiPartition(
  input: { partition: RouteGroupPartitionResult },
  groupRoutes: readonly RouteGroupRoute[],
  metrics: RouteMultiRouteMetrics,
  allFinalIds: ReadonlySet<string>,
  excludedCandidateIds: readonly string[],
  sharedDistanceKm: number | null,
): RouteGroupPartitionResult {
  return {
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
      excludedByPartitionBoundCandidateIds: [...new Set([
        ...input.partition.audit.excludedByPartitionBoundCandidateIds,
        ...excludedCandidateIds,
      ])],
      assignments: input.partition.audit.assignments.filter(({ candidateId }) => allFinalIds.has(candidateId)),
      overlapCosts: {
        ...input.partition.audit.overlapCosts,
        networkSharedDistanceKm: sharedDistanceKm,
        networkDistanceMeasured: metrics.networkDistanceMeasured,
      },
    },
  };
}

export async function routePartitionedGroups(input: {
  origin: RoutePlannerOrigin;
  candidates: readonly RoutePlannerCandidate[];
  partition: RouteGroupPartitionResult;
  travelBudgetMinutes: number;
  effectiveRiskFocus?: RouteRiskFocus;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
}): Promise<RouteMultiRouteResult> {
  const routedGroups = await routeMultiGroups(input);

  const allFinalIds = new Set(routedGroups.flatMap(({ finalCandidateIds }) => finalCandidateIds));
  const excludedCandidateIds = input.partition.groups
    .flatMap(({ candidateIds }) => candidateIds)
    .filter((candidateId) => !allFinalIds.has(candidateId));
  const sharedDistanceKm = measuredSharedDistanceKm(routedGroups);
  const totalDistanceKm = routedGroups.reduce((total, route) => total + route.routeGeometry.distanceKm, 0);
  const totalDurationMinutes = routedGroups.reduce((total, route) => total + route.routeGeometry.durationMinutes, 0);
  const groupRoutes = routedGroups.map((route) =>
    buildRouteMultiGroup(route, routedGroups, input.travelBudgetMinutes),
  );
  const metrics = buildRouteMultiMetrics(input, routedGroups, groupRoutes, sharedDistanceKm, totalDistanceKm, totalDurationMinutes);
  const partition = buildRouteMultiPartition(input, groupRoutes, metrics, allFinalIds, excludedCandidateIds, sharedDistanceKm);
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
    meetingPoint: projectMeetingPointFromGeometry(input.routeGeometry),
  };
}
