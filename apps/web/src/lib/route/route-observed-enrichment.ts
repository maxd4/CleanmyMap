import { distanceToRouteCorridorKm } from "./route-predicted-targets-geometry";
import {
  isRoutePlannerCandidateEligible,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
} from "./route-planner";
import {
  routeThroughPedestrianNetwork,
  haversineMeters,
  type Coordinate,
  type PedestrianNetworkGraph,
} from "./pedestrian-network";
import type { RouteGeometry, RouteTopology } from "./route-contract";
import type { RouteRoutingOperationBudget } from "./route-routing-operation-budget";

/** Reuses the existing group-corridor tolerance; it is not a pollution model. */
export const OBSERVED_ROUTE_CORRIDOR_RADIUS_KM = 0.35;
export const MAX_OBSERVED_ROUTE_OPPORTUNITIES = 24;

export type RouteObservedEnrichmentRejectionReason =
  | "not_observed"
  | "invalid_proof"
  | "unsafe_or_ineligible"
  | "outside_corridor"
  | "no_interest"
  | "network_unreachable"
  | "predictive_route_not_preserved"
  | "detour_over_budget"
  | "opportunity_cap"
  | "routing_quota_exhausted";

export type RouteObservedEnrichmentEvaluation = {
  candidateId: string;
  accepted: boolean;
  distanceToCorridorKm: number | null;
  detourDistanceKm: number | null;
  detourMinutes: number | null;
  reason: RouteObservedEnrichmentRejectionReason | "accepted";
};

export type RouteObservedEnrichmentMetrics = {
  source: "validated_trash_spotter_spots";
  predictedCandidatesRetained: number;
  considered: number;
  accepted: number;
  rejected: number;
  rejectedByReason: Partial<Record<RouteObservedEnrichmentRejectionReason, number>>;
  acceptedCandidateIds: string[];
  evaluations: RouteObservedEnrichmentEvaluation[];
  totalDetourDistanceKm: number;
  totalDetourMinutes: number;
  routeBudgetMinutes: number;
  routeDurationBeforeMinutes: number;
  routeDurationAfterMinutes: number;
  observedDoesNotReplacePrediction: true;
};

export type RouteObservedEnrichmentResult = {
  candidates: RoutePlannerCandidate[];
  routeGeometry: RouteGeometry;
  metrics: RouteObservedEnrichmentMetrics;
};

export function mergeRouteObservedEnrichmentMetrics(
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

type EnrichmentInput = {
  origin: RoutePlannerOrigin;
  arrival?: RoutePlannerOrigin;
  routeTopology: RouteTopology;
  baseCandidates: readonly RoutePlannerCandidate[];
  observedCandidates: readonly RoutePlannerCandidate[];
  baseGeometry: RouteGeometry;
  /** Ordered network edges selected as predictive targets; connectors are excluded. */
  predictiveEdgeKeys: readonly string[];
  pedestrianNetwork: PedestrianNetworkGraph;
  travelBudgetMinutes: number;
  maxObserved?: number;
  routingBudget?: RouteRoutingOperationBudget;
};

function increment(
  target: Partial<Record<RouteObservedEnrichmentRejectionReason, number>>,
  reason: RouteObservedEnrichmentRejectionReason,
): void {
  target[reason] = (target[reason] ?? 0) + 1;
}

function nearestBaseGeometryCoordinate(
  candidate: RoutePlannerCandidate,
  baseGeometry: RouteGeometry,
): Coordinate | null {
  const point: Coordinate = [candidate.latitude, candidate.longitude];
  return baseGeometry.coordinates.reduce<Coordinate | null>((nearest, coordinate) => {
    if (!nearest || haversineMeters(point, coordinate) < haversineMeters(point, nearest)) return coordinate;
    return nearest;
  }, null);
}

function coordinatesForRoute(
  input: EnrichmentInput,
  candidates: readonly RoutePlannerCandidate[],
): Coordinate[] {
  const coordinates: Coordinate[] = [
    [input.origin.latitude, input.origin.longitude],
    ...candidates.map((candidate) => candidate.family === "predicted"
      ? nearestBaseGeometryCoordinate(candidate, input.baseGeometry) ?? [candidate.latitude, candidate.longitude] as Coordinate
      : [candidate.latitude, candidate.longitude] as Coordinate),
  ];
  if (input.routeTopology === "loop") {
    coordinates.push([input.origin.latitude, input.origin.longitude]);
  } else if (input.arrival) {
    coordinates.push([input.arrival.latitude, input.arrival.longitude]);
  }
  return coordinates;
}

function routeWithCandidates(
  input: EnrichmentInput,
  candidates: readonly RoutePlannerCandidate[],
): RouteGeometry | null {
  return routeThroughPedestrianNetwork(
    input.pedestrianNetwork,
    coordinatesForRoute(input, candidates),
    { topology: input.routeTopology, maxSnapDistanceM: 75 },
  );
}

function networkEdgeReferences(geometry: RouteGeometry): string[] {
  return geometry.legs.flatMap((leg) => leg.steps ?? [])
    .map((step) => step.segmentReference)
    .filter((reference): reference is string => Boolean(reference));
}

function preservesPredictiveRoute(
  required: readonly string[],
  tentativeGeometry: RouteGeometry,
): boolean {
  if (required.length === 0) return true;
  let requiredIndex = 0;
  for (const reference of networkEdgeReferences(tentativeGeometry)) {
    if (reference === required[requiredIndex]) requiredIndex += 1;
    if (requiredIndex === required.length) return true;
  }
  return false;
}

/**
 * Add validated observations to an already selected predictive graph route.
 * The predictive candidates are always the prefix of the requested graph route;
 * observations are accepted only when their validated proof, safety eligibility,
 * corridor proximity and incremental network cost all pass.
 */
export function enrichTheoreticalRouteWithObservedCandidates(
  input: EnrichmentInput,
): RouteObservedEnrichmentResult {
  const evaluations: RouteObservedEnrichmentEvaluation[] = [];
  const rejectedByReason: Partial<Record<RouteObservedEnrichmentRejectionReason, number>> = {};
  const acceptedCandidates: RoutePlannerCandidate[] = [];
  const candidateIds = new Set(input.baseCandidates.map((candidate) => candidate.id));
  const candidates = input.observedCandidates
    .filter((candidate) => !candidateIds.has(candidate.id))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const maxObserved = Math.max(0, Math.min(
    input.maxObserved ?? MAX_OBSERVED_ROUTE_OPPORTUNITIES,
    MAX_OBSERVED_ROUTE_OPPORTUNITIES,
  ));
  const remainingDetourMinutes = Math.max(
    0,
    input.travelBudgetMinutes - input.baseGeometry.durationMinutes,
  );
  let currentGeometry = input.baseGeometry;

  for (const candidate of candidates) {
    if (evaluations.length >= MAX_OBSERVED_ROUTE_OPPORTUNITIES) {
      increment(rejectedByReason, "opportunity_cap");
      evaluations.push({
        candidateId: candidate.id,
        accepted: false,
        distanceToCorridorKm: null,
        detourDistanceKm: null,
        detourMinutes: null,
        reason: "opportunity_cap",
      });
      continue;
    }
    if (candidate.family !== "observed") {
      increment(rejectedByReason, "not_observed");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm: null, detourDistanceKm: null, detourMinutes: null, reason: "not_observed" });
      continue;
    }
    if (candidate.evidence.proof !== "validated" || candidate.evidence.source !== "trash_spotter_spots") {
      increment(rejectedByReason, "invalid_proof");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm: null, detourDistanceKm: null, detourMinutes: null, reason: "invalid_proof" });
      continue;
    }
    if (!isRoutePlannerCandidateEligible(candidate) || !Number.isFinite(candidate.score) || candidate.score <= 0) {
      const reason = !isRoutePlannerCandidateEligible(candidate) ? "unsafe_or_ineligible" : "no_interest";
      increment(rejectedByReason, reason);
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm: null, detourDistanceKm: null, detourMinutes: null, reason });
      continue;
    }
    const distanceToCorridorKm = distanceToRouteCorridorKm(
      { latitude: candidate.latitude, longitude: candidate.longitude },
      currentGeometry.coordinates.map(([latitude, longitude]) => ({ latitude, longitude })),
    );
    if (distanceToCorridorKm > OBSERVED_ROUTE_CORRIDOR_RADIUS_KM) {
      increment(rejectedByReason, "outside_corridor");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm: null, detourMinutes: null, reason: "outside_corridor" });
      continue;
    }
    if (acceptedCandidates.length >= maxObserved) {
      increment(rejectedByReason, "opportunity_cap");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm: null, detourMinutes: null, reason: "opportunity_cap" });
      continue;
    }

    const tentativeCandidates = [...input.baseCandidates, ...acceptedCandidates, candidate];
    if (input.routingBudget && !input.routingBudget.tryConsume()) {
      increment(rejectedByReason, "routing_quota_exhausted");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm: null, detourMinutes: null, reason: "routing_quota_exhausted" });
      continue;
    }
    const tentativeGeometry = routeWithCandidates(input, tentativeCandidates);
    if (!tentativeGeometry) {
      increment(rejectedByReason, "network_unreachable");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm: null, detourMinutes: null, reason: "network_unreachable" });
      continue;
    }
    if (!preservesPredictiveRoute(input.predictiveEdgeKeys, tentativeGeometry)) {
      increment(rejectedByReason, "predictive_route_not_preserved");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm: null, detourMinutes: null, reason: "predictive_route_not_preserved" });
      continue;
    }
    const detourDistanceKm = Math.max(0, tentativeGeometry.distanceKm - currentGeometry.distanceKm);
    const detourMinutes = Math.max(0, tentativeGeometry.durationMinutes - currentGeometry.durationMinutes);
    const totalDetourMinutes = Math.max(0, tentativeGeometry.durationMinutes - input.baseGeometry.durationMinutes);
    if (totalDetourMinutes > remainingDetourMinutes || tentativeGeometry.durationMinutes > input.travelBudgetMinutes) {
      increment(rejectedByReason, "detour_over_budget");
      evaluations.push({ candidateId: candidate.id, accepted: false, distanceToCorridorKm, detourDistanceKm, detourMinutes, reason: "detour_over_budget" });
      continue;
    }
    acceptedCandidates.push(candidate);
    currentGeometry = tentativeGeometry;
    evaluations.push({ candidateId: candidate.id, accepted: true, distanceToCorridorKm, detourDistanceKm, detourMinutes, reason: "accepted" });
  }

  const acceptedCandidateIds = acceptedCandidates.map((candidate) => candidate.id);
  const finalGeometry = acceptedCandidates.length > 0 ? currentGeometry : input.baseGeometry;
  return {
    candidates: [...input.baseCandidates, ...acceptedCandidates],
    routeGeometry: finalGeometry,
    metrics: {
      source: "validated_trash_spotter_spots",
      predictedCandidatesRetained: input.baseCandidates.filter((candidate) => candidate.family === "predicted").length,
      considered: candidates.length,
      accepted: acceptedCandidates.length,
      rejected: evaluations.length - acceptedCandidates.length,
      rejectedByReason,
      acceptedCandidateIds,
      evaluations,
      totalDetourDistanceKm: Number(Math.max(0, finalGeometry.distanceKm - input.baseGeometry.distanceKm).toFixed(2)),
      totalDetourMinutes: Math.max(0, finalGeometry.durationMinutes - input.baseGeometry.durationMinutes),
      routeBudgetMinutes: input.travelBudgetMinutes,
      routeDurationBeforeMinutes: input.baseGeometry.durationMinutes,
      routeDurationAfterMinutes: finalGeometry.durationMinutes,
      observedDoesNotReplacePrediction: true,
    },
  };
}
