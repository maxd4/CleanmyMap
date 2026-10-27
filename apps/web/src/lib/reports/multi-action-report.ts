import { randomUUID } from "node:crypto";
import type { DetailLevelId, ModuleState } from "@/lib/reports/report-pdf-data";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import type { ReportGenerationPeriodSelection } from "@/lib/reports/generation-period";
import type { ReportAdvancedFilters } from "@/lib/reports/report-advanced-filters";
import type { ReportScope, ReportScopeKind } from "@/lib/reports/scope";
import { resolveMultiActionReportSelection } from "@/lib/reports/multi-action-report-selection";
import { buildMultiActionReportGenerationResult } from "@/lib/reports/multi-action-report-builder";
import { buildWasteProfile } from "@/lib/reports/report-model/waste-profile";

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
    wasteProfile: buildWasteProfile(
      selection.filteredContracts,
      (contract) => contract.metadata.wasteBreakdown,
    ),
  });
}
