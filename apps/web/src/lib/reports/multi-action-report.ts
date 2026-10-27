import { randomUUID } from "node:crypto";
import type { DetailLevelId, ModuleState } from "@/lib/reports/report-pdf-data";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import type { ReportGenerationPeriodSelection } from "@/lib/reports/generation-period";
import type { ReportAdvancedFilters } from "@/lib/reports/report-advanced-filters";
import type { ReportScope, ReportScopeKind } from "@/lib/reports/scope";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import { resolveMultiActionReportSelection } from "@/lib/reports/multi-action-report-selection";
import { buildMultiActionReportGenerationResult } from "@/lib/reports/multi-action-report-builder";

export type MultiActionReportRequest = {
  type: "multi_action";
  period: ReportGenerationPeriodSelection;
  scope: Partial<ReportScope> & { kind: ReportScopeKind };
  filters?: ReportAdvancedFilters;
};

export {
  MultiActionReportEmptyError,
  MultiActionReportPeriodInvalidError,
  MultiActionReportScopeUnavailableError,
  MultiActionReportSourceUnavailableError,
} from "@/lib/reports/multi-action-report-errors";

type WasteProfileCategory = {
  key: "megotsKg" | "plastiqueKg" | "verreKg" | "metalKg" | "mixteKg";
  label: string;
  kg: number;
  actions: number;
};

function buildWasteProfile(contracts: ActionDataContract[]) {
  const totals: Record<WasteProfileCategory["key"], WasteProfileCategory> = {
    megotsKg: { key: "megotsKg", label: "Mégots", kg: 0, actions: 0 },
    plastiqueKg: { key: "plastiqueKg", label: "Plastique", kg: 0, actions: 0 },
    verreKg: { key: "verreKg", label: "Verre", kg: 0, actions: 0 },
    metalKg: { key: "metalKg", label: "Métal", kg: 0, actions: 0 },
    mixteKg: { key: "mixteKg", label: "Déchets mixtes", kg: 0, actions: 0 },
  };
  let coveredActions = 0;
  for (const contract of contracts) {
    const breakdown = contract.metadata.wasteBreakdown;
    if (!breakdown) continue;
    coveredActions += 1;
    for (const key of Object.keys(totals) as WasteProfileCategory["key"][]) {
      const value = Number(breakdown[key] ?? 0);
      if (value > 0) {
        totals[key].kg += value;
        totals[key].actions += 1;
      }
    }
  }
  const categories = Object.values(totals)
    .filter((category) => category.kg > 0)
    .sort((left, right) => right.kg - left.kg || right.actions - left.actions);
  const dominant = categories[0] ?? null;
  return {
    categories,
    coveragePercent: contracts.length > 0 ? (coveredActions / contracts.length) * 100 : 0,
    dominantLabel: dominant?.label ?? "Déchets non typés",
    dominantKg: dominant?.kg ?? 0,
  };
}

export async function buildMultiActionReportGenerationInput(params: {
  request: MultiActionReportRequest;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
  generationId?: string;
  readerUserId?: string;
}): Promise<ReportGenerationHistoryInput> {
  const selection = await resolveMultiActionReportSelection({
    request: params.request,
    now: params.now,
    readerUserId: params.readerUserId,
  });
  return buildMultiActionReportGenerationResult({
    selection,
    detailLevel: params.detailLevel,
    modules: params.modules,
    now: params.now,
    generationId: params.generationId ?? randomUUID(),
    wasteProfile: buildWasteProfile(selection.filteredContracts),
  });
}
