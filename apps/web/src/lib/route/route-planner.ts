import {
  isVolunteerRouteEligible,
  type TrashSpotterActionableCandidate,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { RouteGeometry, RouteGeometryLeg } from "./route-contract";

export const ROUTE_PLANNER_ENGINE_VERSION = "route-planner-v1" as const;
export const WALKING_SPEED_KM_PER_HOUR = 4.5;

export type RoutePlannerOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map" | "approximate_saved_area";
};

export type RoutePlannerCandidate = TrashSpotterActionableCandidate & {
  score: number;
  reason: string;
};

export type PlannedRouteStop = {
  candidate: RoutePlannerCandidate;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
};

export type RoutePlannerCandidateEvaluation = {
  candidateId: string;
  step: number;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
  normalizedPriority: number;
  normalizedTravel: number;
  combinedScore: number;
  feasible: boolean;
};

export type RoutePlannerSelection = RoutePlannerCandidateEvaluation & {
  selectionReason: string;
};

export type RoutePlannerResult = {
  stops: PlannedRouteStop[];
  diagnostics: {
    excludedUnsafe: number;
    excludedByTravelBudget: number;
  };
  audit: {
    evaluations: RoutePlannerCandidateEvaluation[];
    selections: RoutePlannerSelection[];
    orderingCriteria: [
      "combined_score_desc",
      "priority_desc",
      "incremental_travel_asc",
      "id_lexicographic",
    ];
  };
};

export type RoutePlannerInput = {
  origin: RoutePlannerOrigin;
  candidates: RoutePlannerCandidate[];
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRoutePriorityScore(score: number): number {
  return clamp(score / 100, 0, 1);
}

export function normalizeRouteTravelScore(
  incrementalTravelMinutes: number,
  budgetMinutes: number,
): number {
  return clamp(
    1 - incrementalTravelMinutes / Math.max(1, budgetMinutes),
    0,
    1,
  );
}

export function combineRouteScores(
  normalizedPriority: number,
  normalizedTravel: number,
  priorityVsTravel: number,
): number {
  const priorityWeight = clamp(priorityVsTravel, 0, 100) / 100;
  return (
    priorityWeight * normalizedPriority +
    (1 - priorityWeight) * normalizedTravel
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function routeDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function travelMinutesForDistance(distanceKm: number): number {
  return (Math.max(0, distanceKm) / WALKING_SPEED_KM_PER_HOUR) * 60;
}

function compareCandidates(
  left: PlannedRouteStop,
  right: PlannedRouteStop,
  priorityWeight: number,
  budgetMinutes: number,
): number {
  const leftPriority = normalizeRoutePriorityScore(left.candidate.score);
  const rightPriority = normalizeRoutePriorityScore(right.candidate.score);
  const leftProximity = normalizeRouteTravelScore(
    left.incrementalTravelMinutes,
    budgetMinutes,
  );
  const rightProximity = normalizeRouteTravelScore(
    right.incrementalTravelMinutes,
    budgetMinutes,
  );
  const leftCombined = combineRouteScores(
    leftPriority,
    leftProximity,
    priorityWeight * 100,
  );
  const rightCombined = combineRouteScores(
    rightPriority,
    rightProximity,
    priorityWeight * 100,
  );

  if (Math.abs(leftCombined - rightCombined) > Number.EPSILON) {
    return rightCombined - leftCombined;
  }
  if (Math.abs(leftPriority - rightPriority) > Number.EPSILON) {
    return rightPriority - leftPriority;
  }
  if (
    Math.abs(left.incrementalTravelMinutes - right.incrementalTravelMinutes) >
    Number.EPSILON
  ) {
    return left.incrementalTravelMinutes - right.incrementalTravelMinutes;
  }
  if (left.candidate.id < right.candidate.id) return -1;
  if (left.candidate.id > right.candidate.id) return 1;
  return 0;
}

export function planRoute(input: RoutePlannerInput): RoutePlannerResult {
  const budgetMinutes = Math.max(0, input.travelBudgetMinutes);
  const priorityWeight = clamp(input.priorityVsTravel, 0, 100) / 100;
  const safeCandidates = input.candidates.filter(isVolunteerRouteEligible);
  const remaining = [...safeCandidates];
  const stops: PlannedRouteStop[] = [];
  const evaluations: RoutePlannerCandidateEvaluation[] = [];
  const selections: RoutePlannerSelection[] = [];
  let current: { latitude: number; longitude: number } = input.origin;
  let cumulativeTravelMinutes = 0;
  let excludedByTravelBudget = 0;

  while (stops.length < input.maxStops && remaining.length > 0) {
    const evaluated = remaining.map((candidate) => {
        const incrementalDistanceKm = routeDistanceKm(current, candidate);
        const incrementalTravelMinutes = travelMinutesForDistance(
          incrementalDistanceKm,
        );
        const cumulativeCandidateTravelMinutes =
          cumulativeTravelMinutes + incrementalTravelMinutes;
        const normalizedPriority = normalizeRoutePriorityScore(candidate.score);
        const normalizedTravel = normalizeRouteTravelScore(
          incrementalTravelMinutes,
          Math.max(1, budgetMinutes),
        );
        return {
          candidate,
          incrementalDistanceKm,
          incrementalTravelMinutes,
          cumulativeTravelMinutes: cumulativeCandidateTravelMinutes,
          normalizedPriority,
          normalizedTravel,
          combinedScore: combineRouteScores(
            normalizedPriority,
            normalizedTravel,
            input.priorityVsTravel,
          ),
          feasible:
            cumulativeCandidateTravelMinutes <= budgetMinutes + 1e-9,
        };
      });

    evaluations.push(
      ...evaluated.map(({ candidate, ...evaluation }) => ({
        candidateId: candidate.id,
        step: stops.length + 1,
        ...evaluation,
      })),
    );

    const feasible = evaluated
      .filter((stop) => stop.feasible)
      .sort((left, right) =>
        compareCandidates(
          left,
          right,
          priorityWeight,
          Math.max(1, budgetMinutes),
        ),
      );

    if (feasible.length === 0) {
      excludedByTravelBudget += remaining.length;
      break;
    }

    const next = feasible[0];
    if (!next) break;
    stops.push(next);
    selections.push({
      candidateId: next.candidate.id,
      step: stops.length,
      incrementalDistanceKm: next.incrementalDistanceKm,
      incrementalTravelMinutes: next.incrementalTravelMinutes,
      cumulativeTravelMinutes: next.cumulativeTravelMinutes,
      normalizedPriority: next.normalizedPriority,
      normalizedTravel: next.normalizedTravel,
      combinedScore: next.combinedScore,
      feasible: true,
      selectionReason:
        `Étape ${stops.length}: score combiné=${next.combinedScore.toFixed(3)}, ` +
        `priorité normalisée=${next.normalizedPriority.toFixed(3)}, ` +
        `déplacement normalisé=${next.normalizedTravel.toFixed(3)}; ` +
        `meilleur candidat dans le budget, départage par priorité, ` +
        `déplacement incrémental puis identifiant.`,
    });
    const nextIndex = remaining.findIndex(
      (candidate) => candidate.id === next.candidate.id,
    );
    if (nextIndex >= 0) remaining.splice(nextIndex, 1);
    current = next.candidate;
    cumulativeTravelMinutes = next.cumulativeTravelMinutes;
  }

  return {
    stops,
    diagnostics: {
      excludedUnsafe: input.candidates.length - safeCandidates.length,
      excludedByTravelBudget,
    },
    audit: {
      evaluations,
      selections,
      orderingCriteria: [
        "combined_score_desc",
        "priority_desc",
        "incremental_travel_asc",
        "id_lexicographic",
      ],
    },
  };
}

/** Returns the longest ordered prefix whose provider legs fit the budget. */
export function longestNetworkPrefixWithinBudget(
  legs: RouteGeometryLeg[],
  budgetMinutes: number,
): number {
  let cumulative = 0;
  let count = 0;
  for (const leg of legs) {
    if (
      !Number.isFinite(leg.estimatedMinutes) ||
      leg.estimatedMinutes < 0 ||
      cumulative + leg.estimatedMinutes > budgetMinutes + 1e-9
    ) {
      break;
    }
    cumulative += leg.estimatedMinutes;
    count += 1;
  }
  return count;
}

export function fallbackRoutePrefixWithinBudget<T extends {
  latitude: number;
  longitude: number;
}>(
  origin: RoutePlannerOrigin,
  stops: T[],
  budgetMinutes: number,
  createFallback: (coordinates: [number, number][]) => RouteGeometry,
): T[] {
  let prefix = [...stops];
  while (
    prefix.length > 0 &&
    createFallback([
      [origin.latitude, origin.longitude],
      ...prefix.map(
        (stop) => [stop.latitude, stop.longitude] as [number, number],
      ),
    ]).durationMinutes > budgetMinutes
  ) {
    prefix = prefix.slice(0, -1);
  }
  return prefix;
}
