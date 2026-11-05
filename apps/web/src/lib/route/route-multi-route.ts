import {
  type RouteGeometry,
  type RouteTopology,
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
import { FOSSGIS_QUOTA_INTERVAL_MS } from "./fossgis-foot-routing";
import type { RouteGuidedBudget } from "./route-planning-mode";
import type { PedestrianNetworkGraph } from "./pedestrian-network";

type Coordinate = [number, number];

const NETWORK_CORRIDOR_RADIUS_KM = 0.05;
// 110 km/degree is below the haversine latitude scale used by routeDistanceKm;
// the resulting latitude window is deliberately conservative.
const NETWORK_LATITUDE_KM_PER_DEGREE_LOWER_BOUND = 110;

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

type NetworkSegment = {
  midpoint: Coordinate;
  distanceKm: number;
};

function networkSegments(coordinates: readonly Coordinate[]): NetworkSegment[] {
  return coordinates.slice(0, -1).map((start, originalIndex) => {
    const end = coordinates[originalIndex + 1]!;
    return {
      midpoint: segmentMidpoint(start, end),
      distanceKm: routeDistanceKm(
        { latitude: start[0], longitude: start[1] },
        { latitude: end[0], longitude: end[1] },
      ),
    };
  });
}

function firstSegmentAtOrAboveLatitude(
  segments: readonly NetworkSegment[],
  latitude: number,
): number {
  let lower = 0;
  let upper = segments.length;
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (segments[middle]!.midpoint[0] < latitude) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

function sharedDistanceForRoute(
  leftCoordinates: readonly Coordinate[],
  rightSegments: readonly NetworkSegment[],
): number {
  const leftSegments = networkSegments(leftCoordinates).filter(({ distanceKm }) => distanceKm !== 0);
  if (leftSegments.length === 0 || rightSegments.length === 0) return 0;
  const orderedRightSegments = [...rightSegments].sort((left, right) =>
    left.midpoint[0] - right.midpoint[0] || left.midpoint[1] - right.midpoint[1],
  );
  const latitudeDelta = NETWORK_CORRIDOR_RADIUS_KM / NETWORK_LATITUDE_KM_PER_DEGREE_LOWER_BOUND;
  let sharedDistanceKm = 0;
  for (const leftSegment of leftSegments) {
    const leftLatitude = leftSegment.midpoint[0];
    const firstCandidate = firstSegmentAtOrAboveLatitude(orderedRightSegments, leftLatitude - latitudeDelta);
    for (let rightIndex = firstCandidate; rightIndex < orderedRightSegments.length; rightIndex += 1) {
      const rightSegment = orderedRightSegments[rightIndex]!;
      if (rightSegment.midpoint[0] > leftLatitude + latitudeDelta) break;
      if (routeDistanceKm(
        { latitude: leftSegment.midpoint[0], longitude: leftSegment.midpoint[1] },
        { latitude: rightSegment.midpoint[0], longitude: rightSegment.midpoint[1] },
      ) <= NETWORK_CORRIDOR_RADIUS_KM) {
        sharedDistanceKm += leftSegment.distanceKm;
        break;
      }
    }
  }
  return sharedDistanceKm;
}

export function measureSharedNetworkDistanceKm(
  routes: readonly Pick<RouteGroupRoutingResult, "routeGeometry">[],
): number | null {
  if (routes.length < 2 || routes.some(({ routeGeometry }) => routeGeometry.mode !== "network")) {
    return null;
  }
  const routeSegments = routes.map(({ routeGeometry }) => {
    const segments = networkSegments(routeGeometry.coordinates).filter(({ distanceKm }) => distanceKm !== 0);
    const coordinateDistanceKm = segments.reduce((total, segment) => total + segment.distanceKm, 0);
    return {
      segments,
      distanceScale: coordinateDistanceKm > 0 ? routeGeometry.distanceKm / coordinateDistanceKm : 0,
    };
  });
  let sharedDistanceKm = 0;
  for (let routeIndex = 0; routeIndex < routeSegments.length; routeIndex += 1) {
    const route = routeSegments[routeIndex]!;
    const otherSegments = routeSegments
      .filter((_, otherIndex) => otherIndex !== routeIndex)
      .flatMap(({ segments }) => segments);
    sharedDistanceKm += sharedDistanceForRoute(
      routes[routeIndex]!.routeGeometry.coordinates,
      otherSegments,
    ) * route.distanceScale;
  }
  return round(sharedDistanceKm, 2);
}

function measuredSharedDistanceKm(routes: readonly RouteGroupRoutingResult[]): number | null {
  return measureSharedNetworkDistanceKm(routes);
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
  const effectiveTravelBudgetMinutes = route.group.guidedBudget?.travelMaxMinutes ?? travelBudgetMinutes;
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
    travelBudgetMinutes: effectiveTravelBudgetMinutes,
    withinBudget: route.guidedRouting?.budget.withinBudget ??
      route.routeGeometry.durationMinutes <= effectiveTravelBudgetMinutes,
    ...(route.guidedSegments ? { guidedSegments: route.guidedSegments } : {}),
    ...(route.guidedRouting ? { guidedRouting: route.guidedRouting } : {}),
    meetingPoint: projectMeetingPointFromGeometry(route.routeGeometry),
  };
}

async function routeMultiGroups(input: {
  origin: RoutePlannerOrigin;
  arrival?: RoutePlannerOrigin;
  routeTopology?: RouteTopology;
  candidates: readonly RoutePlannerCandidate[];
  partition: RouteGroupPartitionResult;
  travelBudgetMinutes: number;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  guidedBudget?: RouteGuidedBudget;
  waitForQuotaInterval?: (milliseconds: number) => Promise<void>;
  pedestrianNetwork?: PedestrianNetworkGraph | null;
  signal?: AbortSignal;
}): Promise<RouteGroupRoutingResult[]> {
  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const routedGroups: RouteGroupRoutingResult[] = [];
  const guided = input.partition.audit.planningMode === "territorial-guided";
  const waitForQuotaInterval = input.waitForQuotaInterval ?? ((milliseconds) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let previousRequestStartedAt: number | null = null;
  for (const group of [...input.partition.groups].sort((left, right) => left.groupIndex - right.groupIndex)) {
    if (guided && previousRequestStartedAt !== null) {
      const elapsed = Date.now() - previousRequestStartedAt;
      const waitMilliseconds = Math.min(
        FOSSGIS_QUOTA_INTERVAL_MS,
        Math.max(0, FOSSGIS_QUOTA_INTERVAL_MS - elapsed),
      );
      if (waitMilliseconds > 0) await waitForQuotaInterval(waitMilliseconds);
    }
    previousRequestStartedAt = Date.now();
    routedGroups.push(await routeGroupWithinBudget(
      input.origin,
      group,
      candidatesById,
      group.guidedBudget?.travelMaxMinutes ?? input.travelBudgetMinutes,
      input.operationalBudget,
      input.weatherContext,
      group.volunteerCount,
      input.partition.groupCount,
      input.routeTopology ?? "loop",
      input.arrival,
      input.pedestrianNetwork,
      input.signal,
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
      ...(group.guidedBudget ? { guidedBudget: { ...group.guidedBudget } } : {}),
      ...(group.plannedWaypoints ? { plannedWaypoints: group.plannedWaypoints.map((waypoint) => ({ ...waypoint })) } : {}),
      ...(group.plannedSector ? {
        plannedSector: {
          ...group.plannedSector,
          center: { ...group.plannedSector.center },
        },
      } : {}),
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
  arrival?: RoutePlannerOrigin;
  routeTopology?: RouteTopology;
  candidates: readonly RoutePlannerCandidate[];
  partition: RouteGroupPartitionResult;
  travelBudgetMinutes: number;
  effectiveRiskFocus?: RouteRiskFocus;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  guidedBudget?: RouteGuidedBudget;
  waitForQuotaInterval?: (milliseconds: number) => Promise<void>;
  pedestrianNetwork?: PedestrianNetworkGraph | null;
  signal?: AbortSignal;
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
