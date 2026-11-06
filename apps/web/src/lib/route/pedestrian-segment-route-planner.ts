import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import {
  type Coordinate,
  type PedestrianNetworkPointResolution,
  type PedestrianNetworkEdge,
  type PedestrianNetworkGraph,
  resolvePedestrianNetworkPoint,
} from "./pedestrian-network";
import type { RouteGeometry, RouteTopology } from "./route-contract";
import {
  isRoutePlannerCandidateEligible,
  planRoute,
  routeDistanceKm,
  travelMinutesForDistance,
  type PlannedRouteStop,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "./route-planner";
import type { RouteGroupRoute } from "./route-response-contract";
import {
  enrichTheoreticalRouteWithObservedCandidates,
  type RouteObservedEnrichmentMetrics,
} from "./route-observed-enrichment";
import {
  partitionRouteCandidates,
  type RouteGroupPartitionResult,
} from "./route-group-partition";
import { plannerValue } from "./route-group-partition-helpers";

export const PEDESTRIAN_SEGMENT_ROUTE_PLANNER_VERSION =
  "pedestrian-segment-route-planner-v1" as const;
export const MAX_SEGMENT_ROUTE_CANDIDATES = 600;
const MAX_SEGMENTS_PER_GROUP = 32;

export type SegmentRouteSelectionMetrics = {
  plannerVersion: typeof PEDESTRIAN_SEGMENT_ROUTE_PLANNER_VERSION;
  source: "materialized_pedestrian_risk_projection";
  consideredSegments: number;
  candidateCap: number;
  selectedSegments: number;
  selectedProjectionSegmentIds: string[];
  uniqueStreetCount: number;
  duplicateStreetCandidatesSkipped: number;
  unavailableSegmentsSkipped: number;
  connectorSegments: number;
  groupCount: number;
  routeMode: "network" | "fallback";
  safetyStatus: "network_access_allowed_safety_unknown";
  originResolution: "exact_node" | "exact_edge" | "nearest_verified_node";
  originSnapDistanceM: number;
  arrivalResolution: "exact_node" | "exact_edge" | "nearest_verified_node" | "not_applicable";
  arrivalSnapDistanceM: number;
};

export type PedestrianSegmentRoutePlan = {
  plannerResult: RoutePlannerResult;
  partition: RouteGroupPartitionResult;
  plannedStops: PlannedRouteStop[];
  groupRoutes: RouteGroupRoute[];
  routeGeometry: RouteGeometry;
  metrics: SegmentRouteSelectionMetrics;
  warning: string | null;
  degraded: boolean;
  excludedCandidateIds: string[];
  observedEnrichment: RouteObservedEnrichmentMetrics;
};

type SegmentCandidate = {
  candidate: RoutePlannerCandidate;
  edge: PedestrianNetworkEdge;
  projectionSegmentId: string;
  streetKey: string;
  wasteRisk: number;
  cigaretteButtRisk: number;
  mixedRisk: number;
};

type Path = {
  edges: PedestrianNetworkEdge[];
  distanceM: number;
};

type GroupRouteBuild = {
  groupIndex: number;
  candidates: RoutePlannerCandidate[];
  geometry: RouteGeometry;
  plannedStops: PlannedRouteStop[];
  selectedEdges: PedestrianNetworkEdge[];
  routedCandidates: SegmentCandidate[];
  connectorSegments: number;
  originResolution: PedestrianNetworkPointResolution;
  arrivalResolution: PedestrianNetworkPointResolution | null;
};

export function isPedestrianRiskProjectionCompatible(
  graph: PedestrianNetworkGraph,
  projection: PedestrianRiskProjectionSnapshot,
): boolean {
  return projection.networkVersionId !== null && projection.networkVersionId === graph.versionId;
}

function finiteRisk(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function coordinateKey(point: Coordinate): string {
  return `${point[0].toFixed(7)}:${point[1].toFixed(7)}`;
}

function streetKey(edge: PedestrianNetworkEdge): string {
  const name = edge.name?.trim().toLocaleLowerCase();
  return name ? `name:${name}` : `way:${edge.osmWayId}`;
}

function candidateRisk(candidate: RoutePlannerCandidate): Pick<SegmentCandidate, "wasteRisk" | "cigaretteButtRisk" | "mixedRisk"> {
  const evidence = candidate.family === "predicted" ? candidate.evidence : null;
  const wasteRisk = finiteRisk(evidence?.wasteRisk);
  const cigaretteButtRisk = finiteRisk(evidence?.cigaretteButtRisk);
  return {
    wasteRisk,
    cigaretteButtRisk,
    mixedRisk: (wasteRisk + cigaretteButtRisk) / 2,
  };
}

function focusValue(segment: SegmentCandidate, focus: "all" | "waste" | "cigaretteButts"): number {
  if (focus === "waste") return segment.wasteRisk;
  if (focus === "cigaretteButts") return segment.cigaretteButtRisk;
  return segment.mixedRisk;
}

function segmentSortValue(segment: SegmentCandidate, focus: "all" | "waste" | "cigaretteButts"): number {
  if (focus !== "all") return focusValue(segment, focus);
  // Balanced is a circuit-level average. The minimum adds a deterministic
  // preference for segments that contribute to both categories without using max().
  return segment.mixedRisk + Math.min(segment.wasteRisk, segment.cigaretteButtRisk) * 0.25;
}

function buildAdjacency(graph: PedestrianNetworkGraph): Map<string, PedestrianNetworkEdge[]> {
  const adjacency = new Map<string, PedestrianNetworkEdge[]>();
  for (const edge of graph.edges) {
    const outgoing = adjacency.get(edge.fromNodeId) ?? [];
    outgoing.push(edge);
    adjacency.set(edge.fromNodeId, outgoing);
  }
  for (const edges of adjacency.values()) {
    edges.sort((left, right) =>
      left.lengthM - right.lengthM || left.edgeKey.localeCompare(right.edgeKey),
    );
  }
  return adjacency;
}

function buildNodeCoordinates(graph: PedestrianNetworkGraph): Map<string, Coordinate> {
  const nodes = new Map<string, Coordinate>();
  for (const edge of graph.edges) {
    const first = edge.coordinates[0];
    const last = edge.coordinates.at(-1);
    if (first) nodes.set(edge.fromNodeId, first);
    if (last) nodes.set(edge.toNodeId, last);
  }
  return nodes;
}

function shortestPath(
  fromNodeId: string,
  toNodeId: string,
  adjacency: ReadonlyMap<string, PedestrianNetworkEdge[]>,
): Path | null {
  const distances = new Map<string, number>([[fromNodeId, 0]]);
  const previous = new Map<string, { nodeId: string; edge: PedestrianNetworkEdge }>();
  const pending = new Set([fromNodeId]);
  while (pending.size > 0) {
    const current = [...pending].sort((left, right) =>
      (distances.get(left) ?? Number.POSITIVE_INFINITY) -
        (distances.get(right) ?? Number.POSITIVE_INFINITY) || left.localeCompare(right),
    )[0]!;
    pending.delete(current);
    if (current === toNodeId) break;
    for (const edge of adjacency.get(current) ?? []) {
      const candidateDistance = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.lengthM;
      const knownDistance = distances.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY;
      if (candidateDistance < knownDistance ||
        (candidateDistance === knownDistance && edge.edgeKey.localeCompare(previous.get(edge.toNodeId)?.edge.edgeKey ?? "") < 0)) {
        distances.set(edge.toNodeId, candidateDistance);
        previous.set(edge.toNodeId, { nodeId: current, edge });
        pending.add(edge.toNodeId);
      }
    }
  }
  if (!distances.has(toNodeId)) return null;
  const edges: PedestrianNetworkEdge[] = [];
  let current = toNodeId;
  while (current !== fromNodeId) {
    const step = previous.get(current);
    if (!step) return null;
    edges.unshift(step.edge);
    current = step.nodeId;
  }
  return { edges, distanceM: distances.get(toNodeId) ?? 0 };
}

function appendCoordinates(target: Coordinate[], edges: readonly PedestrianNetworkEdge[]): void {
  for (const edge of edges) {
    if (target.length === 0) target.push(...edge.coordinates);
    else target.push(...edge.coordinates.slice(1));
  }
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function geometryFromEdges(
  topology: RouteTopology,
  routeEdges: readonly PedestrianNetworkEdge[],
  selectedEdgeIndexes: readonly number[],
  networkOrigin: Coordinate,
  networkDestination: Coordinate,
): RouteGeometry | null {
  const coordinates: Coordinate[] = [];
  appendCoordinates(coordinates, routeEdges);
  const originCoordinate = networkOrigin;
  const destinationCoordinate = topology === "loop" ? networkOrigin : networkDestination;
  if (coordinates.length === 0) coordinates.push(networkOrigin);
  if (coordinateKey(coordinates[0]!) !== coordinateKey(originCoordinate) ||
    coordinateKey(coordinates.at(-1)!) !== coordinateKey(destinationCoordinate)) {
    return null;
  }

  const boundaries = [
    -1,
    ...selectedEdgeIndexes,
    routeEdges.length - 1,
  ];
  const legs = boundaries.slice(1).map((edgeIndex, legIndex) => {
    const startEdge = boundaries[legIndex]! + 1;
    const endEdge = edgeIndex;
    const edges = routeEdges.slice(startEdge, endEdge + 1);
    const distanceKm = edges.reduce((total, edge) => total + edge.lengthM, 0) / 1000;
    return {
      fromStopIndex: legIndex,
      toStopIndex: legIndex + 1,
      distanceKm: round(distanceKm),
      estimatedMinutes: Math.max(0, Math.round(travelMinutesForDistance(distanceKm))),
      steps: edges.map((edge) => ({
        name: edge.name,
        distanceKm: round(edge.lengthM / 1000),
        durationMinutes: Math.max(0, Math.round(travelMinutesForDistance(edge.lengthM / 1000))),
        maneuver: null,
        segmentReference: edge.edgeKey,
        geometry: edge.coordinates,
      })),
    };
  });
  const distanceM = routeEdges.reduce((total, edge) => total + edge.lengthM, 0);
  return {
    isLoop: topology === "loop",
    origin: originCoordinate,
    returnLeg: topology === "loop" ? legs.at(-1) ?? null : null,
    coordinates,
    distanceKm: round(distanceM / 1000),
    durationMinutes: Math.max(0, Math.round(travelMinutesForDistance(distanceM / 1000))),
    legs,
    provider: "stored-network",
    profile: "foot",
    mode: "network",
    estimated: true,
  };
}

function plannedStopsForGeometry(
  origin: RoutePlannerOrigin,
  candidates: readonly RoutePlannerCandidate[],
  geometry: RouteGeometry,
): PlannedRouteStop[] {
  let cumulativeDistanceKm = 0;
  let cumulativeTravelMinutes = 0;
  return candidates.map((candidate, index) => {
    const leg = geometry.legs[index];
    const incrementalDistanceKm = leg?.distanceKm ?? routeDistanceKm(
      index === 0 ? origin : candidates[index - 1]!,
      candidate,
    );
    const incrementalTravelMinutes = leg?.estimatedMinutes ?? Math.round(travelMinutesForDistance(incrementalDistanceKm));
    cumulativeDistanceKm += incrementalDistanceKm;
    cumulativeTravelMinutes += incrementalTravelMinutes;
    const returnLeg = geometry.isLoop ? geometry.legs.at(-1) : undefined;
    const returnDistanceKm = returnLeg?.distanceKm ?? routeDistanceKm(candidate, origin);
    const returnTravelMinutes = returnLeg?.estimatedMinutes ?? Math.round(travelMinutesForDistance(returnDistanceKm));
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

function fallbackGeometry(origin: RoutePlannerOrigin, topology: RouteTopology, arrival?: RoutePlannerOrigin): RouteGeometry {
  const coordinates: Coordinate[] = [
    [origin.latitude, origin.longitude],
    ...(topology === "loop" ? [[origin.latitude, origin.longitude] as Coordinate] : arrival ? [[arrival.latitude, arrival.longitude] as Coordinate] : []),
  ];
  const distanceKm = coordinates.length > 1
    ? routeDistanceKm({ latitude: coordinates[0]![0], longitude: coordinates[0]![1] }, { latitude: coordinates[1]![0], longitude: coordinates[1]![1] })
    : 0;
  const leg = coordinates.length > 1 ? {
    fromStopIndex: 0,
    toStopIndex: 1,
    distanceKm: round(distanceKm),
    estimatedMinutes: Math.round(travelMinutesForDistance(distanceKm)),
  } : null;
  return {
    isLoop: topology === "loop",
    origin: coordinates[0] ?? null,
    returnLeg: topology === "loop" ? leg : null,
    coordinates,
    distanceKm: round(distanceKm),
    durationMinutes: Math.round(travelMinutesForDistance(distanceKm)),
    legs: leg ? [leg] : [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function buildSegmentCandidates(
  candidates: readonly RoutePlannerCandidate[],
  graph: PedestrianNetworkGraph,
  projection: PedestrianRiskProjectionSnapshot,
  focus: "all" | "waste" | "cigaretteButts",
): { segments: SegmentCandidate[]; totalSegments: number; unavailableSegmentsSkipped: number; duplicateStreetCandidatesSkipped: number } {
  const edgesByKey = new Map(graph.edges.map((edge) => [edge.edgeKey, edge]));
  const projectionById = new Map(projection.segments.map((segment) => [segment.projectionSegmentId, segment]));
  const byStreet = new Map<string, SegmentCandidate>();
  let unavailableSegmentsSkipped = 0;
  let duplicateStreetCandidatesSkipped = 0;
  let totalSegments = 0;
  for (const candidate of candidates) {
    if (candidate.family !== "predicted" || !isRoutePlannerCandidateEligible(candidate, {
      allowUnknownPredictedSafety: true,
    })) continue;
    const segmentId = candidate.evidence.segmentId;
    const projectionSegment = segmentId ? projectionById.get(segmentId) : undefined;
    const edge = projectionSegment ? edgesByKey.get(projectionSegment.edgeKey) : undefined;
    if (!projectionSegment || !edge || projectionSegment.riskStatus !== "predicted" ||
      projectionSegment.wasteRisk === null || projectionSegment.cigaretteButtRisk === null) {
      unavailableSegmentsSkipped += 1;
      continue;
    }
    const risks = candidateRisk(candidate);
    const segment = {
      candidate,
      edge,
      projectionSegmentId: projectionSegment.projectionSegmentId,
      streetKey: streetKey(edge),
      ...risks,
    };
    totalSegments += 1;
    const previous = byStreet.get(segment.streetKey);
    if (!previous || segmentSortValue(segment, focus) > segmentSortValue(previous, focus) ||
      (segmentSortValue(segment, focus) === segmentSortValue(previous, focus) && edge.edgeKey.localeCompare(previous.edge.edgeKey) < 0)) {
      if (previous) duplicateStreetCandidatesSkipped += 1;
      byStreet.set(segment.streetKey, segment);
    } else {
      duplicateStreetCandidatesSkipped += 1;
    }
  }
  const segments = [...byStreet.values()].sort((left, right) =>
    segmentSortValue(right, focus) - segmentSortValue(left, focus) ||
    right.edge.lengthM - left.edge.lengthM ||
    left.edge.edgeKey.localeCompare(right.edge.edgeKey),
  );
  return {
    segments: segments.slice(0, MAX_SEGMENT_ROUTE_CANDIDATES),
    totalSegments,
    unavailableSegmentsSkipped,
    duplicateStreetCandidatesSkipped,
  };
}

function buildGroupRoute(
  group: { groupIndex: number; volunteerCount: number; candidateIds: string[]; origin: RoutePlannerOrigin; targetCount: number; estimatedDistanceKm: number; estimatedDurationMinutes: number },
  candidatesById: ReadonlyMap<string, RoutePlannerCandidate>,
  geometry: RouteGeometry,
  travelBudgetMinutes: number,
): { route: RouteGroupRoute; plannedStops: PlannedRouteStop[] } {
  const candidates = group.candidateIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is RoutePlannerCandidate => Boolean(candidate));
  const plannedStops = plannedStopsForGeometry(group.origin, candidates, geometry);
  const stops = plannedStops.map(({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
    id: candidate.id,
    label: candidate.label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    segmentKm: incrementalDistanceKm,
    estimatedMinutes: incrementalTravelMinutes,
    priorityReason: candidate.reason,
    score: Number(candidate.score.toFixed(2)),
    evidence: candidate.evidence,
  }));
  return {
    plannedStops,
    route: {
      ...group,
      targetCount: candidates.length,
      estimatedDistanceKm: geometry.distanceKm,
      estimatedDurationMinutes: geometry.durationMinutes,
      reservedCandidateIds: [],
      stops,
      routeGeometry: geometry,
      travelDistanceKm: geometry.distanceKm,
      travelMinutes: geometry.durationMinutes,
      travelBudgetMinutes,
      withinBudget: geometry.durationMinutes <= travelBudgetMinutes,
      meetingPoint: undefined,
    },
  };
}

function buildGroupGeometry(
  origin: RoutePlannerOrigin,
  arrival: RoutePlannerOrigin | undefined,
  topology: RouteTopology,
  candidates: readonly SegmentCandidate[],
  graph: PedestrianNetworkGraph,
): {
  geometry: RouteGeometry;
  selectedEdges: PedestrianNetworkEdge[];
  routedCandidates: SegmentCandidate[];
  connectorSegments: number;
  originResolution: PedestrianNetworkPointResolution;
  arrivalResolution: PedestrianNetworkPointResolution | null;
} | null {
  const adjacency = buildAdjacency(graph);
  const nodes = buildNodeCoordinates(graph);
  const originResolution = resolvePedestrianNetworkPoint([origin.latitude, origin.longitude], nodes);
  const arrivalResolution = topology === "loop"
    ? null
    : arrival ? resolvePedestrianNetworkPoint([arrival.latitude, arrival.longitude], nodes) : null;
  if (!originResolution || (arrival && !arrivalResolution)) return null;
  const originNodeId = originResolution.nodeId;
  const destinationResolution = topology === "loop" ? originResolution : arrivalResolution ?? originResolution;
  const destinationNodeId = destinationResolution.nodeId;
  const originNode = originResolution.coordinate;
  const destinationNode = destinationResolution.coordinate;
  const routeEdges: PedestrianNetworkEdge[] = [];
  const selectedEdgeIndexes: number[] = [];
  const routedCandidates: SegmentCandidate[] = [];
  let currentNodeId = originNodeId;
  let connectorSegments = 0;
  for (const segment of candidates) {
    const connector = shortestPath(currentNodeId, segment.edge.fromNodeId, adjacency);
    if (!connector) continue;
    if (topology === "loop" && !shortestPath(segment.edge.toNodeId, destinationNodeId, adjacency)) {
      continue;
    }
    connectorSegments += connector.edges.length;
    routeEdges.push(...connector.edges);
    routeEdges.push(segment.edge);
    selectedEdgeIndexes.push(routeEdges.length - 1);
    routedCandidates.push(segment);
    currentNodeId = segment.edge.toNodeId;
  }
  const closing = shortestPath(currentNodeId, destinationNodeId, adjacency);
  if (!closing) return null;
  connectorSegments += closing.edges.length;
  routeEdges.push(...closing.edges);
  const geometry = geometryFromEdges(topology, routeEdges, selectedEdgeIndexes, originNode, destinationNode);
  if (!geometry) return null;
  return {
    geometry,
    selectedEdges: routedCandidates.map(({ edge }) => edge),
    routedCandidates,
    connectorSegments,
    originResolution,
    arrivalResolution,
  };
}

function candidateIdsFromGroups(groups: readonly { candidateIds: string[] }[]): Set<string> {
  return new Set(groups.flatMap(({ candidateIds }) => candidateIds));
}

function mergeObservedEnrichmentMetrics(
  metrics: readonly RouteObservedEnrichmentMetrics[],
  travelBudgetMinutes: number,
): RouteObservedEnrichmentMetrics {
  const evaluations = metrics.flatMap((item) => item.evaluations);
  const acceptedCandidateIds = [...new Set(metrics.flatMap((item) => item.acceptedCandidateIds))];
  const rejectedByReason: RouteObservedEnrichmentMetrics["rejectedByReason"] = {};
  for (const item of metrics) {
    for (const [reason, count] of Object.entries(item.rejectedByReason)) {
      if (count === undefined) continue;
      const key = reason as keyof RouteObservedEnrichmentMetrics["rejectedByReason"];
      rejectedByReason[key] = (rejectedByReason[key] ?? 0) + count;
    }
  }
  return {
    source: "validated_trash_spotter_spots",
    predictedCandidatesRetained: metrics.reduce((total, item) => total + item.predictedCandidatesRetained, 0),
    considered: metrics.reduce((total, item) => total + item.considered, 0),
    accepted: acceptedCandidateIds.length,
    rejected: evaluations.length - acceptedCandidateIds.length,
    rejectedByReason,
    acceptedCandidateIds,
    evaluations,
    totalDetourDistanceKm: Number(metrics.reduce((total, item) => total + item.totalDetourDistanceKm, 0).toFixed(2)),
    totalDetourMinutes: metrics.reduce((total, item) => total + item.totalDetourMinutes, 0),
    routeBudgetMinutes: travelBudgetMinutes,
    routeDurationBeforeMinutes: metrics.reduce((total, item) => total + item.routeDurationBeforeMinutes, 0),
    routeDurationAfterMinutes: metrics.reduce((total, item) => total + item.routeDurationAfterMinutes, 0),
    observedDoesNotReplacePrediction: true,
  };
}

export function planPredictedPedestrianSegmentRoutes(input: {
  origin: RoutePlannerOrigin;
  arrival?: RoutePlannerOrigin;
  routeTopology: RouteTopology;
  candidates: readonly RoutePlannerCandidate[];
  projection: PedestrianRiskProjectionSnapshot;
  pedestrianNetwork: PedestrianNetworkGraph;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  volunteers: number;
  groupCount: number;
  effectiveRiskFocus: "all" | "waste" | "cigaretteButts";
}): PedestrianSegmentRoutePlan | null {
  if (!isPedestrianRiskProjectionCompatible(input.pedestrianNetwork, input.projection)) return null;
  const segmentData = buildSegmentCandidates(
    input.candidates,
    input.pedestrianNetwork,
    input.projection,
    input.effectiveRiskFocus,
  );
  if (segmentData.segments.length === 0) return null;
  const orderedCandidates = segmentData.segments.map(({ candidate }) => candidate);
  const plannerResult = planRoute({
    origin: input.origin,
    arrival: input.arrival,
    routeTopology: input.routeTopology,
    candidates: orderedCandidates,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: Math.min(input.maxStops, MAX_SEGMENTS_PER_GROUP),
    priorityVsTravel: input.priorityVsTravel,
    effectiveRiskFocus: input.effectiveRiskFocus,
    volunteersExpected: input.volunteers,
    groupCount: input.groupCount,
    allowUnknownPredictedSafety: true,
  });
  const partition = partitionRouteCandidates({
    origin: input.origin,
    arrival: input.arrival,
    routeTopology: input.routeTopology,
    candidates: orderedCandidates,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: Math.min(input.maxStops, MAX_SEGMENTS_PER_GROUP),
    priorityVsTravel: input.priorityVsTravel,
    plannerResult,
    effectiveRiskFocus: input.effectiveRiskFocus,
    allowUnknownPredictedSafety: true,
  });
  const segmentByCandidateId = new Map(segmentData.segments.map((segment) => [segment.candidate.id, segment]));
  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const builtGroups: GroupRouteBuild[] = [];
  const observedEnrichmentMetrics: RouteObservedEnrichmentMetrics[] = [];
  const assignedObservedCandidateIds = new Set<string>();
  const excludedCandidateIds = new Set<string>();
  const observedCandidates = input.candidates.filter((candidate) => candidate.family === "observed");
  for (const group of partition.groups) {
    let selected = group.candidateIds
      .map((id) => segmentByCandidateId.get(id))
      .filter((segment): segment is SegmentCandidate => Boolean(segment));
    const requestedCandidateIds = new Set(selected.map(({ candidate }) => candidate.id));
    let built = buildGroupGeometry(input.origin, input.arrival, input.routeTopology, selected, input.pedestrianNetwork);
    if (!built) return null;
    const initialBuilt = built;
    requestedCandidateIds.forEach((candidateId) => {
      if (!initialBuilt.routedCandidates.some(({ candidate }) => candidate.id === candidateId)) {
        excludedCandidateIds.add(candidateId);
      }
    });
    selected = initialBuilt.routedCandidates;
    while (selected.length > 0 && built.geometry.durationMinutes > input.travelBudgetMinutes) {
      selected = built.routedCandidates.slice(0, -1);
      const retainedCandidateIds = new Set(selected.map(({ candidate }) => candidate.id));
      requestedCandidateIds.forEach((candidateId) => {
        if (!retainedCandidateIds.has(candidateId)) excludedCandidateIds.add(candidateId);
      });
      built = buildGroupGeometry(input.origin, input.arrival, input.routeTopology, selected, input.pedestrianNetwork);
      if (!built) return null;
    }
    const finalBuilt = built;
    const enrichment = enrichTheoreticalRouteWithObservedCandidates({
      origin: group.origin,
      arrival: input.arrival,
      routeTopology: input.routeTopology,
      baseCandidates: selected.map(({ candidate }) => candidate),
      observedCandidates: observedCandidates.filter((candidate) => !assignedObservedCandidateIds.has(candidate.id)),
      baseGeometry: finalBuilt.geometry,
      predictiveEdgeKeys: finalBuilt.selectedEdges.map((edge) => edge.edgeKey),
      pedestrianNetwork: input.pedestrianNetwork,
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxObserved: Math.max(0, Math.min(MAX_SEGMENTS_PER_GROUP - selected.length, input.maxStops - selected.length)),
    });
    enrichment.metrics.acceptedCandidateIds.forEach((id) => assignedObservedCandidateIds.add(id));
    observedEnrichmentMetrics.push(enrichment.metrics);
    const groupWithActualCandidates = {
      ...group,
      candidateIds: enrichment.candidates.map((candidate) => candidate.id),
    };
    const groupBuild = buildGroupRoute(groupWithActualCandidates, candidatesById, enrichment.routeGeometry, input.travelBudgetMinutes);
    builtGroups.push({
      groupIndex: group.groupIndex,
      candidates: enrichment.candidates,
      geometry: enrichment.routeGeometry,
      plannedStops: groupBuild.plannedStops,
      selectedEdges: finalBuilt.selectedEdges,
      routedCandidates: finalBuilt.routedCandidates,
      connectorSegments: finalBuilt.connectorSegments,
      originResolution: finalBuilt.originResolution,
      arrivalResolution: finalBuilt.arrivalResolution,
    });
  }
  const effectiveGroups = builtGroups.map((builtGroup, index) => ({
    ...partition.groups[index]!,
    candidateIds: builtGroup.candidates.map(({ id }) => id),
  }));
  const allSelectedIds = candidateIdsFromGroups(effectiveGroups);
  if (allSelectedIds.size === 0) return null;
  const groupRoutes = builtGroups.map((group, index) => {
    const route = buildGroupRoute(
      effectiveGroups[index]!,
      candidatesById,
      group.geometry,
      input.travelBudgetMinutes,
    ).route;
    return {
      ...route,
      reservedCandidateIds: builtGroups
        .filter((other) => other.groupIndex !== group.groupIndex)
        .flatMap(({ candidates }) => candidates.map(({ id }) => id)),
    };
  });
  const routeGeometry = groupRoutes[0]?.routeGeometry ?? fallbackGeometry(input.origin, input.routeTopology, input.arrival);
  const groupDistances = groupRoutes.map(({ travelDistanceKm }) => travelDistanceKm);
  const groupDurations = groupRoutes.map(({ travelMinutes }) => travelMinutes);
  const plannedStops = builtGroups.flatMap(({ plannedStops: stops }) => stops);
  const uniqueStreetCount = new Set(builtGroups.flatMap(({ selectedEdges }) => selectedEdges.map(streetKey))).size;
  const uniqueSelectedProjectionSegmentIds = new Set(
    builtGroups.flatMap(({ routedCandidates }) => routedCandidates.map(({ projectionSegmentId }) => projectionSegmentId)),
  );
  const finalCoverageGain = groupRoutes.reduce(
    (total, route) => total + route.candidateIds.reduce(
      (routeTotal, candidateId) => routeTotal + (candidatesById.has(candidateId)
        ? plannerValue(candidatesById.get(candidateId)!) / 100
        : 0),
      0,
    ),
    0,
  );
  const partitionWithActualRoutes: RouteGroupPartitionResult = {
    ...partition,
    groups: groupRoutes.map((route) => ({
      ...partition.groups.find(({ groupIndex }) => groupIndex === route.groupIndex)!,
      candidateIds: [...route.candidateIds],
      targetCount: route.targetCount,
      estimatedDistanceKm: route.travelDistanceKm,
      estimatedDurationMinutes: route.travelMinutes,
    })),
    metrics: {
      ...partition.metrics,
      coverageGain: Number(finalCoverageGain.toFixed(3)),
      balanceDistance: groupDistances.length > 0 ? Math.max(...groupDistances) - Math.min(...groupDistances) : 0,
      balanceDuration: groupDurations.length > 0 ? Math.max(...groupDurations) - Math.min(...groupDurations) : 0,
      balanceTargetCount: groupRoutes.length > 0 ? Math.max(...groupRoutes.map(({ targetCount }) => targetCount)) - Math.min(...groupRoutes.map(({ targetCount }) => targetCount)) : 0,
    },
    audit: {
      ...partition.audit,
      assignments: partition.audit.assignments.filter(({ candidateId }) => allSelectedIds.has(candidateId)),
      excludedByPartitionBoundCandidateIds: [...new Set([
        ...partition.audit.excludedByPartitionBoundCandidateIds,
        ...excludedCandidateIds,
      ])],
    },
  };
  return {
    plannerResult,
    partition: partitionWithActualRoutes,
    plannedStops,
    groupRoutes,
    routeGeometry,
    metrics: {
      plannerVersion: PEDESTRIAN_SEGMENT_ROUTE_PLANNER_VERSION,
      source: "materialized_pedestrian_risk_projection",
      consideredSegments: segmentData.totalSegments,
      candidateCap: MAX_SEGMENT_ROUTE_CANDIDATES,
      selectedSegments: uniqueSelectedProjectionSegmentIds.size,
      selectedProjectionSegmentIds: [...uniqueSelectedProjectionSegmentIds].sort(),
      uniqueStreetCount,
      duplicateStreetCandidatesSkipped: segmentData.duplicateStreetCandidatesSkipped,
      unavailableSegmentsSkipped: segmentData.unavailableSegmentsSkipped,
      connectorSegments: builtGroups.reduce((total, group) => total + group.connectorSegments, 0),
      groupCount: input.groupCount,
      routeMode: "network",
      safetyStatus: "network_access_allowed_safety_unknown",
      originResolution: builtGroups[0]?.originResolution?.resolution ?? "exact_node",
      originSnapDistanceM: round(builtGroups[0]?.originResolution?.distanceM ?? 0, 1),
      arrivalResolution: builtGroups[0]?.arrivalResolution?.resolution ??
        (input.routeTopology === "loop" ? "not_applicable" : "exact_node"),
      arrivalSnapDistanceM: round(builtGroups[0]?.arrivalResolution?.distanceM ?? 0, 1),
    },
    warning: excludedCandidateIds.size > 0
      ? "Certains segments prédictifs n’ont pas pu être reliés au graphe piéton ou respecter le budget ; ils ont été exclus du parcours final."
      : null,
    degraded: excludedCandidateIds.size > 0,
    excludedCandidateIds: [...excludedCandidateIds].sort(),
    observedEnrichment: mergeObservedEnrichmentMetrics(observedEnrichmentMetrics, input.travelBudgetMinutes),
  };
}
