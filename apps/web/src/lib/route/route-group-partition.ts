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
import type { RoutePlanningMode } from "./route-planning-mode";

export const MAX_ROUTE_VOLUNTEERS = 100;
export const MAX_ROUTE_GROUP_COUNT = 12;
export const MAX_ROUTE_PARTITION_CANDIDATES = 72;
export const ROUTE_GROUP_SHARED_ORIGIN_RADIUS_KM = 0.35;
export const ROUTE_GROUP_CORRIDOR_OVERLAP_RADIUS_KM = 0.35;

export type RouteGroupPartitionInput = {
  origin: RoutePlannerOrigin;
  candidates: readonly RoutePlannerCandidate[];
  volunteers: number;
  groupCount: number;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  planningMode?: RoutePlanningMode;
  plannerResult?: RoutePlannerResult;
};

export type RouteGroupAssignment = {
  groupIndex: number;
  volunteerCount: number;
  origin: RoutePlannerOrigin;
  candidateIds: string[];
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  targetCount: number;
};

export type RoutePartitionMetrics = {
  /** Ratio of selected targets assigned to more than one group. */
  sharedTargetRatio: number;
  /** Sum of selected planner contribution points, expressed in 0-1 units. */
  coverageGain: number;
  /** Max-min estimated closed-loop distance between groups. */
  balanceDistance: number;
  /** Max-min estimated closed-loop travel duration between groups. */
  balanceDuration: number;
  /** Max-min number of targets between groups. */
  balanceTargetCount: number;
};

export type RoutePartitionAssignmentAudit = {
  candidateId: string;
  groupIndex: number;
  plannerValue: number;
  estimatedLoopDistanceKm: number;
  estimatedLoopDurationMinutes: number;
  overlapCost: number;
  sameTargetCost: number;
  samePredictiveZoneCost: number;
  nearbyCorridorCost: number;
  balancePenalty: number;
};

export type RoutePartitionAudit = {
  mode: "single-group-compatible" | "coordinated-multi-group";
  planningMode: RoutePlanningMode["type"];
  consideredCandidateIds: string[];
  excludedUnsafeCandidateIds: string[];
  excludedByPartitionBoundCandidateIds: string[];
  assignments: RoutePartitionAssignmentAudit[];
  overlapCosts: {
    sameTarget: number;
    samePredictiveZone: number;
    nearbyCorridor: number;
    networkSharedDistanceKm: number | null;
    networkDistanceMeasured: false;
  };
};

export type RouteGroupPartitionResult = {
  volunteers: number;
  groupCount: number;
  groups: RouteGroupAssignment[];
  metrics: RoutePartitionMetrics;
  audit: RoutePartitionAudit;
};

type InternalGroup = {
  groupIndex: number;
  volunteerCount: number;
  stops: PlannedRouteStop[];
};

type CandidateAssignmentEvaluation = {
  candidate: RoutePlannerCandidate;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  returnDistanceKm: number;
  returnTravelMinutes: number;
  loopDistanceKm: number;
  loopTravelMinutes: number;
  plannerValue: number;
  overlapCost: number;
  sameTargetCost: number;
  samePredictiveZoneCost: number;
  nearbyCorridorCost: number;
  balancePenalty: number;
  pairScore: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function plannerValue(candidate: RoutePlannerCandidate): number {
  return clamp(candidate.finalPlannerContribution ?? candidate.score, 0, 100);
}

function candidateSort(left: RoutePlannerCandidate, right: RoutePlannerCandidate): number {
  const leftValue = plannerValue(left);
  const rightValue = plannerValue(right);
  if (Math.abs(leftValue - rightValue) > Number.EPSILON) {
    return rightValue - leftValue;
  }
  const leftObserved = left.family !== "predicted";
  const rightObserved = right.family !== "predicted";
  if (leftObserved !== rightObserved) return leftObserved ? -1 : 1;
  if (Math.abs(left.score - right.score) > Number.EPSILON) {
    return right.score - left.score;
  }
  return left.id.localeCompare(right.id);
}

function uniqueOrderedCandidates(
  candidates: readonly RoutePlannerCandidate[],
): RoutePlannerCandidate[] {
  const ordered = [...candidates].sort(candidateSort);
  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

function predictiveZoneId(candidate: RoutePlannerCandidate): string | null {
  if (candidate.family !== "predicted") return null;
  const zoneId = (candidate.evidence as { zoneId?: unknown } | undefined)?.zoneId;
  return typeof zoneId === "string" && zoneId.length > 0 ? zoneId : null;
}

function groupDistance(group: InternalGroup): number {
  return group.stops.at(-1)?.loopDistanceKm ?? 0;
}

function groupDuration(group: InternalGroup): number {
  return group.stops.at(-1)?.loopTravelMinutes ?? 0;
}

function balanceRange(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function groupAssignment(group: InternalGroup, origin: RoutePlannerOrigin): RouteGroupAssignment {
  return {
    groupIndex: group.groupIndex,
    volunteerCount: group.volunteerCount,
    origin: { ...origin },
    candidateIds: group.stops.map(({ candidate }) => candidate.id),
    estimatedDistanceKm: round(groupDistance(group)),
    estimatedDurationMinutes: round(groupDuration(group)),
    targetCount: group.stops.length,
  };
}

export function balancedVolunteerCounts(
  volunteers: number,
  groupCount: number,
): number[] {
  validateRouteGroupInput(volunteers, groupCount);
  const quotient = Math.floor(volunteers / groupCount);
  const remainder = volunteers % groupCount;
  return Array.from({ length: groupCount }, (_, index) =>
    quotient + (index < remainder ? 1 : 0),
  );
}

export function validateRouteGroupInput(
  volunteers: number,
  groupCount: number,
): void {
  if (!Number.isInteger(volunteers) || volunteers < 1 || volunteers > MAX_ROUTE_VOLUNTEERS) {
    throw new RangeError(`volunteers must be an integer between 1 and ${MAX_ROUTE_VOLUNTEERS}`);
  }
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > MAX_ROUTE_GROUP_COUNT) {
    throw new RangeError(`groupCount must be an integer between 1 and ${MAX_ROUTE_GROUP_COUNT}`);
  }
  if (groupCount > volunteers) {
    throw new RangeError("groupCount cannot exceed volunteers");
  }
}

function buildSingleGroupResult(
  input: RouteGroupPartitionInput,
  plannerResult: RoutePlannerResult,
): RouteGroupPartitionResult {
  const group: InternalGroup = {
    groupIndex: 1,
    volunteerCount: input.volunteers,
    stops: plannerResult.stops,
  };
  const orderedCandidates = uniqueOrderedCandidates(input.candidates);
  const selectedValue = plannerResult.stops.reduce(
    (total, stop) => total + plannerValue(stop.candidate) / 100,
    0,
  );
  return {
    volunteers: input.volunteers,
    groupCount: 1,
    groups: [groupAssignment(group, input.origin)],
    metrics: {
      sharedTargetRatio: 0,
      coverageGain: round(selectedValue),
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
    },
    audit: {
      mode: "single-group-compatible",
      planningMode: input.planningMode?.type ?? "free",
      consideredCandidateIds: orderedCandidates.map(({ id }) => id),
      excludedUnsafeCandidateIds: orderedCandidates
        .filter((candidate) => !isRoutePlannerCandidateEligible(candidate))
        .map(({ id }) => id),
      excludedByPartitionBoundCandidateIds: [],
      assignments: plannerResult.stops.map((stop) => ({
        candidateId: stop.candidate.id,
        groupIndex: 1,
        plannerValue: round(plannerValue(stop.candidate)),
        estimatedLoopDistanceKm: round(stop.loopDistanceKm),
        estimatedLoopDurationMinutes: round(stop.loopTravelMinutes),
        overlapCost: 0,
        sameTargetCost: 0,
        samePredictiveZoneCost: 0,
        nearbyCorridorCost: 0,
        balancePenalty: 0,
      })),
      overlapCosts: {
        sameTarget: 0,
        samePredictiveZone: 0,
        nearbyCorridor: 0,
        networkSharedDistanceKm: null,
        networkDistanceMeasured: false,
      },
    },
  };
}

function overlapEvaluation(
  candidate: RoutePlannerCandidate,
  group: InternalGroup,
  groups: readonly InternalGroup[],
  origin: RoutePlannerOrigin,
): Pick<
  CandidateAssignmentEvaluation,
  "overlapCost" | "sameTargetCost" | "samePredictiveZoneCost" | "nearbyCorridorCost"
> {
  const zoneId = predictiveZoneId(candidate);
  const sameTargetCost = groups.some((otherGroup) =>
    otherGroup.stops.some(({ candidate: assigned }) => assigned.id === candidate.id),
  ) ? 1000 : 0;
  let samePredictiveZoneCost = 0;
  let nearbyCorridorCost = 0;
  for (const otherGroup of groups) {
    if (otherGroup.groupIndex === group.groupIndex) continue;
    for (const stop of otherGroup.stops) {
      if (zoneId !== null && zoneId === predictiveZoneId(stop.candidate)) {
        samePredictiveZoneCost += 40;
      }
      const candidateNearOrigin = routeDistanceKm(candidate, origin) <= ROUTE_GROUP_SHARED_ORIGIN_RADIUS_KM;
      const stopNearOrigin = routeDistanceKm(stop.candidate, origin) <= ROUTE_GROUP_SHARED_ORIGIN_RADIUS_KM;
      if (!candidateNearOrigin && !stopNearOrigin &&
        routeDistanceKm(candidate, stop.candidate) <= ROUTE_GROUP_CORRIDOR_OVERLAP_RADIUS_KM) {
        nearbyCorridorCost += 12;
      }
    }
  }
  return {
    overlapCost: sameTargetCost + samePredictiveZoneCost + nearbyCorridorCost,
    sameTargetCost,
    samePredictiveZoneCost,
    nearbyCorridorCost,
  };
}

function evaluateCandidateForGroup(
  candidate: RoutePlannerCandidate,
  group: InternalGroup,
  groups: readonly InternalGroup[],
  input: RouteGroupPartitionInput,
): CandidateAssignmentEvaluation | null {
  if (group.stops.length >= input.maxStops) return null;
  const current = group.stops.at(-1)?.candidate ?? input.origin;
  const incrementalDistanceKm = routeDistanceKm(current, candidate);
  const incrementalTravelMinutes = travelMinutesForDistance(incrementalDistanceKm);
  const returnDistanceKm = routeDistanceKm(candidate, input.origin);
  const returnTravelMinutes = travelMinutesForDistance(returnDistanceKm);
  const cumulativeDistanceKm = groupDistance(group) - (group.stops.at(-1)?.returnDistanceKm ?? 0);
  const cumulativeTravelMinutes = groupDuration(group) - (group.stops.at(-1)?.returnTravelMinutes ?? 0);
  const loopDistanceKm = cumulativeDistanceKm + incrementalDistanceKm + returnDistanceKm;
  const loopTravelMinutes = cumulativeTravelMinutes + incrementalTravelMinutes + returnTravelMinutes;
  if (loopTravelMinutes > Math.max(0, input.travelBudgetMinutes) + 1e-9) return null;

  const overlap = overlapEvaluation(candidate, group, groups, input.origin);
  const projectedDistances = groups.map((item) =>
    item.groupIndex === group.groupIndex ? loopDistanceKm : groupDistance(item),
  );
  const projectedDurations = groups.map((item) =>
    item.groupIndex === group.groupIndex ? loopTravelMinutes : groupDuration(item),
  );
  const projectedTargetCounts = groups.map((item) =>
    item.groupIndex === group.groupIndex ? item.stops.length + 1 : item.stops.length,
  );
  const balancePenalty =
    balanceRange(projectedDistances) * 2 +
    balanceRange(projectedDurations) * 0.2 +
    balanceRange(projectedTargetCounts) * 8;
  const priorityWeight = clamp(input.priorityVsTravel, 0, 100) / 100;
  const normalizedTravel = clamp(
    1 - loopTravelMinutes / Math.max(1, input.travelBudgetMinutes),
    0,
    1,
  );
  const baseValue = priorityWeight * plannerValue(candidate) +
    (1 - priorityWeight) * normalizedTravel * 100;
  return {
    candidate,
    incrementalDistanceKm,
    incrementalTravelMinutes,
    returnDistanceKm,
    returnTravelMinutes,
    loopDistanceKm,
    loopTravelMinutes,
    plannerValue: plannerValue(candidate),
    ...overlap,
    balancePenalty,
    pairScore: baseValue - overlap.overlapCost - balancePenalty,
  };
}

function assignCandidate(
  evaluation: CandidateAssignmentEvaluation,
  group: InternalGroup,
): void {
  const cumulativeTravelMinutes = groupDuration(group) -
    (group.stops.at(-1)?.returnTravelMinutes ?? 0) +
    evaluation.incrementalTravelMinutes;
  group.stops.push({
    candidate: evaluation.candidate,
    incrementalDistanceKm: evaluation.incrementalDistanceKm,
    incrementalTravelMinutes: evaluation.incrementalTravelMinutes,
    cumulativeTravelMinutes,
    returnDistanceKm: evaluation.returnDistanceKm,
    returnTravelMinutes: evaluation.returnTravelMinutes,
    loopDistanceKm: evaluation.loopDistanceKm,
    loopTravelMinutes: evaluation.loopTravelMinutes,
  });
}

export function partitionRouteCandidates(
  input: RouteGroupPartitionInput,
): RouteGroupPartitionResult {
  validateRouteGroupInput(input.volunteers, input.groupCount);
  if (!Number.isInteger(input.maxStops) || input.maxStops < 1) {
    throw new RangeError("maxStops must be a positive integer");
  }

  if (input.groupCount === 1) {
    const compatiblePlannerResult = input.plannerResult ?? planRoute({
      origin: input.origin,
      candidates: [...input.candidates],
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxStops: input.maxStops,
      priorityVsTravel: input.priorityVsTravel,
    });
    return buildSingleGroupResult(input, compatiblePlannerResult);
  }

  const orderedCandidates = uniqueOrderedCandidates(input.candidates);
  const eligibleCandidates = orderedCandidates.filter(isRoutePlannerCandidateEligible);
  const preselectedCandidates = eligibleCandidates.slice(0, MAX_ROUTE_PARTITION_CANDIDATES);
  const preselectionExcluded = eligibleCandidates.slice(MAX_ROUTE_PARTITION_CANDIDATES);
  const volunteerCounts = balancedVolunteerCounts(input.volunteers, input.groupCount);
  const groups: InternalGroup[] = volunteerCounts.map((volunteerCount, index) => ({
    groupIndex: index + 1,
    volunteerCount,
    stops: [],
  }));
  const remaining = [...preselectedCandidates];
  const assignmentAudits: RoutePartitionAssignmentAudit[] = [];
  const activeGroups = new Set(groups.map(({ groupIndex }) => groupIndex));

  while (activeGroups.size > 0 && remaining.length > 0) {
    const minimumTargetCount = Math.min(
      ...groups
        .filter(({ groupIndex }) => activeGroups.has(groupIndex))
        .map(({ stops }) => stops.length),
    );
    const roundGroups = new Set(
      groups
        .filter(({ groupIndex, stops }) =>
          activeGroups.has(groupIndex) && stops.length === minimumTargetCount,
        )
        .map(({ groupIndex }) => groupIndex),
    );
    if (roundGroups.size === 0) break;
    let assignedInRound = false;

    while (roundGroups.size > 0 && remaining.length > 0) {
      const options = groups.flatMap((group) => {
        if (!roundGroups.has(group.groupIndex)) return [];
        return remaining.flatMap((candidate) => {
          const evaluation = evaluateCandidateForGroup(candidate, group, groups, input);
          return evaluation ? [{ group, evaluation }] : [];
        });
      });
      if (options.length === 0) {
        for (const groupIndex of roundGroups) activeGroups.delete(groupIndex);
        break;
      }
      options.sort((left, right) =>
        right.evaluation.pairScore - left.evaluation.pairScore ||
        right.evaluation.plannerValue - left.evaluation.plannerValue ||
        left.evaluation.candidate.id.localeCompare(right.evaluation.candidate.id) ||
        left.group.groupIndex - right.group.groupIndex,
      );
      const chosen = options[0];
      if (!chosen) break;
      assignCandidate(chosen.evaluation, chosen.group);
      assignmentAudits.push({
        candidateId: chosen.evaluation.candidate.id,
        groupIndex: chosen.group.groupIndex,
        plannerValue: round(chosen.evaluation.plannerValue),
        estimatedLoopDistanceKm: round(chosen.evaluation.loopDistanceKm),
        estimatedLoopDurationMinutes: round(chosen.evaluation.loopTravelMinutes),
        overlapCost: round(chosen.evaluation.overlapCost),
        sameTargetCost: round(chosen.evaluation.sameTargetCost),
        samePredictiveZoneCost: round(chosen.evaluation.samePredictiveZoneCost),
        nearbyCorridorCost: round(chosen.evaluation.nearbyCorridorCost),
        balancePenalty: round(chosen.evaluation.balancePenalty),
      });
      const candidateIndex = remaining.findIndex(
        ({ id }) => id === chosen.evaluation.candidate.id,
      );
      if (candidateIndex >= 0) remaining.splice(candidateIndex, 1);
      roundGroups.delete(chosen.group.groupIndex);
      assignedInRound = true;
    }

    if (!assignedInRound) break;
  }

  const selectedIds = new Set(groups.flatMap(({ stops }) => stops.map(({ candidate }) => candidate.id)));
  const samePredictiveZone = assignmentAudits.reduce(
    (total, assignment) => total + assignment.samePredictiveZoneCost,
    0,
  );
  const sameTarget = assignmentAudits.reduce(
    (total, assignment) => total + assignment.sameTargetCost,
    0,
  );
  const nearbyCorridor = assignmentAudits.reduce(
    (total, assignment) => total + assignment.nearbyCorridorCost,
    0,
  );
  const selectedValue = groups.reduce(
    (total, group) => total + group.stops.reduce(
      (groupTotal, stop) => groupTotal + plannerValue(stop.candidate) / 100,
      0,
    ),
    0,
  );
  const groupAssignments = groups.map((group) => groupAssignment(group, input.origin));
  return {
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    groups: groupAssignments,
    metrics: {
      sharedTargetRatio: 0,
      coverageGain: round(selectedValue),
      balanceDistance: round(balanceRange(groupAssignments.map(({ estimatedDistanceKm }) => estimatedDistanceKm))),
      balanceDuration: round(balanceRange(groupAssignments.map(({ estimatedDurationMinutes }) => estimatedDurationMinutes))),
      balanceTargetCount: balanceRange(groupAssignments.map(({ targetCount }) => targetCount)),
    },
    audit: {
      mode: "coordinated-multi-group",
      planningMode: input.planningMode?.type ?? "free",
      consideredCandidateIds: orderedCandidates.map(({ id }) => id),
      excludedUnsafeCandidateIds: orderedCandidates
        .filter((candidate) => !isRoutePlannerCandidateEligible(candidate))
        .map(({ id }) => id),
      excludedByPartitionBoundCandidateIds: [
        ...preselectionExcluded.map(({ id }) => id),
        ...remaining.filter(({ id }) => !selectedIds.has(id)).map(({ id }) => id),
      ],
      assignments: assignmentAudits,
      overlapCosts: {
        sameTarget: round(sameTarget),
        samePredictiveZone: round(samePredictiveZone),
        nearbyCorridor: round(nearbyCorridor),
        networkSharedDistanceKm: null,
        networkDistanceMeasured: false,
      },
    },
  };
}
