import type { RouteGroupAssignment, InternalGroup } from "./route-group-partition";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

export function plannerValue(candidate: RoutePlannerCandidate): number {
  return clamp(candidate.finalPlannerContribution ?? candidate.score, 0, 100);
}

function candidateSort(left: RoutePlannerCandidate, right: RoutePlannerCandidate): number {
  const leftValue = plannerValue(left);
  const rightValue = plannerValue(right);
  if (Math.abs(leftValue - rightValue) > Number.EPSILON) return rightValue - leftValue;
  const leftObserved = left.family !== "predicted";
  const rightObserved = right.family !== "predicted";
  if (leftObserved !== rightObserved) return leftObserved ? -1 : 1;
  if (Math.abs(left.score - right.score) > Number.EPSILON) return right.score - left.score;
  return left.id.localeCompare(right.id);
}

export function uniqueOrderedCandidates(candidates: readonly RoutePlannerCandidate[]): RoutePlannerCandidate[] {
  const ordered = [...candidates].sort(candidateSort);
  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

export function predictiveZoneId(candidate: RoutePlannerCandidate): string | null {
  if (candidate.family !== "predicted") return null;
  const zoneId = (candidate.evidence as { zoneId?: unknown } | undefined)?.zoneId;
  return typeof zoneId === "string" && zoneId.length > 0 ? zoneId : null;
}

export function groupDistance(group: InternalGroup): number {
  return group.stops.at(-1)?.loopDistanceKm ?? 0;
}

export function groupDuration(group: InternalGroup): number {
  return group.stops.at(-1)?.loopTravelMinutes ?? 0;
}

export function groupOperationalDuration(group: InternalGroup): number | null {
  return group.stops.at(-1)?.loopOperationalMinutes ?? null;
}

export function groupAssignment(group: InternalGroup, origin: RoutePlannerOrigin): RouteGroupAssignment {
  return {
    groupIndex: group.groupIndex,
    volunteerCount: group.volunteerCount,
    origin: { ...origin },
    candidateIds: group.stops.map(({ candidate }) => candidate.id),
    estimatedDistanceKm: round(groupDistance(group)),
    estimatedDurationMinutes: round(groupDuration(group)),
    estimatedOperationalDurationMinutes: groupOperationalDuration(group),
    targetCount: group.stops.length,
  };
}
