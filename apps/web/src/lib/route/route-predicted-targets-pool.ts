import type { RoutePredictedCandidate, RouteRiskFocus } from "./route-target-contract";
import type { RoutePlannerCandidate } from "./route-planner";
import type {
  RoutePredictionPoolAudit,
  RoutePredictionSummary,
} from "./route-predicted-targets-types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function buildRoutePlannerCandidatePool(input: {
  observedCandidates: readonly RoutePlannerCandidate[];
  predictedCandidates: readonly RoutePredictedCandidate[];
  maxCandidates: number;
  effectiveRiskFocus?: RouteRiskFocus;
}): {
  candidates: RoutePlannerCandidate[];
  audit: RoutePredictionPoolAudit;
} {
  const all = [...input.observedCandidates, ...input.predictedCandidates].filter(
    (candidate) =>
      !(
        candidate.family === "predicted" &&
        candidate.volunteerSafety !== undefined &&
        candidate.volunteerSafety.status !== "safe"
      ),
  );
  const ordered = [...all].sort((left, right) => {
    const leftScore = clamp(left.score, 0, 100);
    const rightScore = clamp(right.score, 0, 100);
    if (Math.abs(leftScore - rightScore) > Number.EPSILON) {
      return rightScore - leftScore;
    }
    const leftObserved = left.family !== "predicted";
    const rightObserved = right.family !== "predicted";
    if (leftObserved !== rightObserved) return leftObserved ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  const maxCandidates = Math.max(0, Math.floor(input.maxCandidates));
  const effectiveRiskFocus = input.effectiveRiskFocus ?? "all";
  const passed = ordered.slice(0, maxCandidates);
  const excluded = ordered.slice(maxCandidates);
  return {
    candidates: passed,
    audit: {
      effectiveRiskFocus,
      admittedCandidateIds: ordered.map((candidate) => candidate.id),
      passedToPlannerCandidateIds: passed.map((candidate) => candidate.id),
      excludedByPreselectionCandidateIds: excluded.map((candidate) => candidate.id),
      excludedByPreselectionReasons: Object.fromEntries(
        excluded.map((candidate) => [candidate.id, "preselection_bound"] as const),
      ),
    },
  };
}

export function applyRoutePredictionPoolAudit(
  summary: RoutePredictionSummary,
  audit: RoutePredictionPoolAudit,
): RoutePredictionSummary {
  const predicted = new Set(summary.admittedCandidateIds);
  const admittedCandidateIds = audit.admittedCandidateIds.filter((id) => predicted.has(id));
  const passedToPlannerCandidateIds = audit.passedToPlannerCandidateIds.filter((id) => predicted.has(id));
  const excludedByPreselectionCandidateIds = audit.excludedByPreselectionCandidateIds.filter((id) => predicted.has(id));
  return {
    ...summary,
    admitted: admittedCandidateIds.length,
    passedToPlanner: passedToPlannerCandidateIds.length,
    excludedByPreselection: excludedByPreselectionCandidateIds.length,
    preselectionExcludedCandidateIds: excludedByPreselectionCandidateIds,
    preselectionExclusionReasons: Object.fromEntries(
      excludedByPreselectionCandidateIds.map((id) => [id, "preselection_bound"] as const),
    ),
  };
}
