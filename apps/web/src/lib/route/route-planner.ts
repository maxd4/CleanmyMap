import {
  isVolunteerRouteEligible,
  type TrashSpotterActionableCandidate,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { RouteGeometry } from "./route-contract";
import {
  buildRouteCalibrationContext,
  type RouteCalibrationContext,
} from "./route-calibration";
import {
  buildRouteOperationalBudget,
  type RouteOperationalBudget,
  type RouteOperationalBudgetDependency,
} from "./route-operational-budget";
import { buildCleanupWorkload } from "./route-cleanup-workload";
import type { RoutePlannerContribution } from "./route-additionality";
import type {
  RouteObservedEvidence,
  RoutePredictedCandidate,
  RouteRiskFocus,
} from "./route-target-contract";

export const ROUTE_PLANNER_ENGINE_VERSION = "route-planner-v2" as const;
export const WALKING_SPEED_KM_PER_HOUR = 4.5;

export type RoutePlannerOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map" | "approximate_saved_area";
};

export type RoutePlannerCandidate =
  | (TrashSpotterActionableCandidate & {
      score: number;
      reason: string;
      family: "observed";
      evidence: RouteObservedEvidence;
    } & Partial<RoutePlannerContribution>)
  | RoutePredictedCandidate;

export type PlannedRouteStop = {
  candidate: RoutePlannerCandidate;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
  returnDistanceKm: number;
  returnTravelMinutes: number;
  loopDistanceKm: number;
  loopTravelMinutes: number;
  loopOperationalMinutes?: number | null;
  operationalBudget?: RouteOperationalBudget | null;
};

export type RoutePlannerResult = {
  stops: PlannedRouteStop[];
  diagnostics: {
    excludedUnsafe: number;
    excludedByTravelBudget: number;
  };
  audit: {
    effectiveRiskFocus?: RouteRiskFocus;
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

export type RoutePlannerCandidateEvaluation = {
  candidateId: string;
  step: number;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
  returnDistanceKm: number;
  returnTravelMinutes: number;
  loopDistanceKm: number;
  loopTravelMinutes: number;
  loopOperationalMinutes?: number | null;
  operationalBudgetAvailable?: boolean;
  operationalBudgetAfterReturnMinutes?: number | null;
  operationalBudget?: RouteOperationalBudget | null;
  budgetAfterReturnMinutes: number;
  normalizedPriority: number;
  normalizedTravel: number;
  combinedScore: number;
  pollutionPriority?: number;
  volunteerAdditionality?: number | null;
  finalPlannerContribution?: number;
  additionalityWeight?: number;
  feasible: boolean;
};

export type RoutePlannerSelection = RoutePlannerCandidateEvaluation & {
  budgetBeforeMinutes: number;
  budgetAfterMinutes: number;
  selectionReason: string;
};

export type RoutePlannerInput = {
  origin: RoutePlannerOrigin;
  candidates: RoutePlannerCandidate[];
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  effectiveRiskFocus?: RouteRiskFocus;
  operationalBudget?: RouteOperationalBudgetDependency;
  volunteersExpected?: number;
  groupCount?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function plannerContribution(candidate: RoutePlannerCandidate): number {
  return clamp(
    candidate.finalPlannerContribution ?? candidate.score,
    0,
    100,
  );
}

function isPlannerSafetyExcluded(candidate: RoutePlannerCandidate): boolean {
  return candidate.volunteerSafety?.status === "excluded" ||
    (candidate.family === "predicted" &&
      candidate.volunteerSafety !== undefined &&
      candidate.volunteerSafety.status !== "safe");
}

/** Shared server-side eligibility gate used by single- and multi-group planning. */
export function isRoutePlannerCandidateEligible(
  candidate: RoutePlannerCandidate,
): boolean {
  return !isPlannerSafetyExcluded(candidate) &&
    (candidate.family === "predicted" || isVolunteerRouteEligible(candidate));
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
  const leftPriority = clamp(plannerContribution(left.candidate) / 100, 0, 1);
  const rightPriority = clamp(plannerContribution(right.candidate) / 100, 0, 1);
  const leftCost = left.loopOperationalMinutes ?? left.loopTravelMinutes;
  const rightCost = right.loopOperationalMinutes ?? right.loopTravelMinutes;
  const leftProximity = clamp(
    1 - leftCost / budgetMinutes,
    0,
    1,
  );
  const rightProximity = clamp(
    1 - rightCost / budgetMinutes,
    0,
    1,
  );
  const leftCombined =
    priorityWeight * leftPriority + (1 - priorityWeight) * leftProximity;
  const rightCombined =
    priorityWeight * rightPriority + (1 - priorityWeight) * rightProximity;

  if (Math.abs(leftCombined - rightCombined) > Number.EPSILON) {
    return rightCombined - leftCombined;
  }
  const leftIsObserved = left.candidate.family !== "predicted";
  const rightIsObserved = right.candidate.family !== "predicted";
  if (leftIsObserved !== rightIsObserved) {
    return leftIsObserved ? -1 : 1;
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
  const effectiveRiskFocus = input.effectiveRiskFocus ?? "all";
  const budgetMinutes = Math.max(0, input.travelBudgetMinutes);
  const priorityWeight = clamp(input.priorityVsTravel, 0, 100) / 100;
  const safeCandidates = input.candidates.filter(isRoutePlannerCandidateEligible);
  const remaining = [...safeCandidates];
  const stops: PlannedRouteStop[] = [];
  let current: { latitude: number; longitude: number } = input.origin;
  let cumulativeDistanceKm = 0;
  let cumulativeTravelMinutes = 0;
  let excludedByTravelBudget = 0;
  const evaluations: RoutePlannerCandidateEvaluation[] = [];
  const selections: RoutePlannerSelection[] = [];
  const calibrationGeneratedAt = input.operationalBudget?.generatedAt ?? new Date().toISOString();

  function buildOperationalBudget(
    candidates: readonly RoutePlannerCandidate[],
    travelMinutes: number,
  ): RouteOperationalBudget | null {
    if (!input.operationalBudget) return null;
    const context: RouteCalibrationContext = buildRouteCalibrationContext({
      generatedAt: calibrationGeneratedAt,
      routeEngineVersion: ROUTE_PLANNER_ENGINE_VERSION,
      volunteersExpected: input.volunteersExpected ?? 0,
      groupCount: input.groupCount ?? 1,
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.id,
        family: candidate.family,
        cleanupWorkload: buildCleanupWorkload(candidate),
      })),
    });
    return buildRouteOperationalBudget({
      travelMinutes,
      budgetMinutes,
      calibrationContext: context,
      durationDependency: input.operationalBudget,
    });
  }

  while (stops.length < input.maxStops && remaining.length > 0) {
    const evaluated = remaining
      .map((candidate) => {
        const incrementalDistanceKm = routeDistanceKm(current, candidate);
        const incrementalTravelMinutes = travelMinutesForDistance(
          incrementalDistanceKm,
        );
        const returnDistanceKm = routeDistanceKm(candidate, input.origin);
        const returnTravelMinutes = travelMinutesForDistance(returnDistanceKm);
        const loopDistanceKm =
          cumulativeDistanceKm + incrementalDistanceKm + returnDistanceKm;
        const loopTravelMinutes =
          cumulativeTravelMinutes +
          incrementalTravelMinutes +
          returnTravelMinutes;
        const operationalBudget = buildOperationalBudget(
          [...stops.map(({ candidate }) => candidate), candidate],
          loopTravelMinutes,
        );
        const loopOperationalMinutes = operationalBudget?.totalMinutes ?? null;
        const budgetCost = loopOperationalMinutes ?? loopTravelMinutes;
        const finalPlannerContribution = plannerContribution(candidate);
        const normalizedPriority = clamp(finalPlannerContribution / 100, 0, 1);
        const normalizedTravel = clamp(
          1 - loopTravelMinutes / Math.max(1, budgetMinutes),
          0,
          1,
        );
        return {
          candidate,
          incrementalDistanceKm,
          incrementalTravelMinutes,
          cumulativeTravelMinutes:
            cumulativeTravelMinutes + incrementalTravelMinutes,
          returnDistanceKm,
          returnTravelMinutes,
          loopDistanceKm,
          loopTravelMinutes,
          loopOperationalMinutes,
          operationalBudgetAvailable: loopOperationalMinutes !== null,
          budgetAfterReturnMinutes: Math.max(0, budgetMinutes - loopTravelMinutes),
          operationalBudgetAfterReturnMinutes:
            loopOperationalMinutes === null
              ? null
              : Math.max(0, budgetMinutes - loopOperationalMinutes),
          normalizedPriority,
          normalizedTravel,
          combinedScore:
            priorityWeight * normalizedPriority +
            (1 - priorityWeight) * normalizedTravel,
          pollutionPriority: clamp(candidate.pollutionPriority ?? candidate.score, 0, 100),
          volunteerAdditionality: candidate.volunteerAdditionality ?? null,
          finalPlannerContribution,
          additionalityWeight: candidate.additionalityWeight ?? 0,
          feasible:
            budgetCost <=
            budgetMinutes + 1e-9,
          operationalBudget,
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
        compareCandidates(left, right, priorityWeight, Math.max(1, budgetMinutes)),
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
      returnDistanceKm: next.returnDistanceKm,
      returnTravelMinutes: next.returnTravelMinutes,
      loopDistanceKm: next.loopDistanceKm,
      loopTravelMinutes: next.loopTravelMinutes,
      loopOperationalMinutes: next.loopOperationalMinutes,
      operationalBudgetAvailable: next.operationalBudgetAvailable,
      budgetAfterReturnMinutes: next.budgetAfterReturnMinutes,
      normalizedPriority: next.normalizedPriority,
      normalizedTravel: next.normalizedTravel,
      combinedScore: next.combinedScore,
      feasible: true,
      budgetBeforeMinutes: Math.max(
        0,
        budgetMinutes -
          (next.cumulativeTravelMinutes - next.incrementalTravelMinutes),
      ),
      budgetAfterMinutes: next.budgetAfterReturnMinutes,
      operationalBudgetAfterReturnMinutes: next.operationalBudgetAfterReturnMinutes,
      selectionReason: "score_combine_priorite_deplacement",
    });
    const nextIndex = remaining.findIndex(
      (candidate) => candidate.id === next.candidate.id,
    );
    if (nextIndex >= 0) remaining.splice(nextIndex, 1);
    current = next.candidate;
    cumulativeDistanceKm = next.loopDistanceKm - next.returnDistanceKm;
    cumulativeTravelMinutes = next.cumulativeTravelMinutes;
    stops[stops.length - 1]!.loopOperationalMinutes = next.loopOperationalMinutes;
    if (next.operationalBudget) {
      stops[stops.length - 1]!.operationalBudget = next.operationalBudget;
    }
  }

  return {
    stops,
    diagnostics: {
      excludedUnsafe: input.candidates.length - safeCandidates.length,
      excludedByTravelBudget,
    },
    audit: {
      effectiveRiskFocus,
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
      [origin.latitude, origin.longitude],
    ]).durationMinutes > budgetMinutes
  ) {
    prefix = prefix.slice(0, -1);
  }
  return prefix;
}
