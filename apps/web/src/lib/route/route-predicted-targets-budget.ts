import type { RoutePredictionSummary } from "./route-predicted-targets-types";

export function applyRoutePredictionPlannerBudgetAudit(
  summary: RoutePredictionSummary,
  input: {
    passedCandidateIds: readonly string[];
    evaluations: readonly { candidateId: string; feasible: boolean }[];
  },
): RoutePredictionSummary {
  const passed = new Set(input.passedCandidateIds);
  return {
    ...summary,
    excludedByPlannerBudget: new Set(
      input.evaluations
        .filter((evaluation) => passed.has(evaluation.candidateId) && !evaluation.feasible)
        .map((evaluation) => evaluation.candidateId),
    ).size,
  };
}

/** Records candidates removed only after the provider measured the final route. */
export function applyRoutePredictionFinalRoutingBudgetAudit(
  summary: RoutePredictionSummary,
  excludedCandidateIds: readonly string[],
): RoutePredictionSummary {
  const admitted = new Set(summary.admittedCandidateIds);
  const preselectionExcluded = new Set(summary.preselectionExcludedCandidateIds);
  const finalRoutingBudgetExcludedCandidateIds = [
    ...new Set(
      excludedCandidateIds.filter(
        (candidateId) =>
          admitted.has(candidateId) && !preselectionExcluded.has(candidateId),
      ),
    ),
  ];
  return {
    ...summary,
    excludedByFinalRoutingBudget: finalRoutingBudgetExcludedCandidateIds.length,
    finalRoutingBudgetExcludedCandidateIds,
  };
}
