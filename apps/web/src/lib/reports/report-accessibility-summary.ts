import "server-only";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import { getCurrentAccessibilityObservations } from "@/lib/actions/accessibility-observations";

export function buildReportAccessibilitySummary(contracts: readonly ActionDataContract[]) {
  const summary = {
    actionCount: contracts.length,
    informationDeclared: 0,
    conditionsReported: 0,
    obstaclesIdentified: 0,
    toConfirm: 0,
    notEvaluated: 0,
    declaredPlanMeasures: 0,
    observedMeasures: 0,
    observedByOrganizer: 0,
    observedByParticipantFeedback: 0,
  };
  for (const contract of contracts) {
    const preparation = contract.metadata.preparationData;
    if (preparation?.accessibility?.trim() || (preparation?.accessibilityStatus && preparation.accessibilityStatus !== "not_evaluated")) {
      summary.informationDeclared += 1;
    }
    switch (preparation?.accessibilityStatus ?? "not_evaluated") {
      case "conditions_reported": summary.conditionsReported += 1; break;
      case "obstacles_identified": summary.obstaclesIdentified += 1; break;
      case "to_confirm": summary.toConfirm += 1; break;
      default: summary.notEvaluated += 1;
    }
    summary.declaredPlanMeasures += Number(Boolean(preparation?.accessibilityPausePlan))
      + Number(Boolean(preparation?.accessibilityEarlyDeparturePlan))
      + (preparation?.accessibilityAlternativeMissions?.length ?? 0)
      + Number(Boolean(preparation?.accessibilityAlternativeRouteVersionId));
    for (const measure of getCurrentAccessibilityObservations(preparation)) {
      summary.observedMeasures += 1;
      if (measure.evidenceKind === "organizer_observation") summary.observedByOrganizer += 1;
      if (measure.evidenceKind === "participant_feedback") summary.observedByParticipantFeedback += 1;
    }
  }
  return summary;
}
