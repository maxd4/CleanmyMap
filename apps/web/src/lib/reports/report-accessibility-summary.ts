import type { ActionDataContract } from "@/lib/actions/data-contract";

export function buildReportAccessibilitySummary(contracts: readonly ActionDataContract[]) {
  const summary = {
    actionCount: contracts.length,
    informationDeclared: 0,
    conditionsReported: 0,
    obstaclesIdentified: 0,
    toConfirm: 0,
    notEvaluated: 0,
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
  }
  return summary;
}
