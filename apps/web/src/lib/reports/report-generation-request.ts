import type { ReportAdvancedFilters } from "./report-advanced-filters";
import type { ReportGenerationPeriodSelection } from "./generation-period";
import type { ReportScopeKind } from "./scope";
import type { DetailLevelId, ModuleState } from "./report-pdf-data";

type ReportGenerationRequestOptions = {
  detailLevel: DetailLevelId;
  modules: ModuleState;
  theme?: "impact" | "scientific";
};

export type SingleActionReportGenerationRequest = ReportGenerationRequestOptions & {
  input: { type: "single_action"; actionId: string };
};

export type MultiActionReportGenerationRequest = ReportGenerationRequestOptions & {
  input: {
    type: "multi_action";
    period: ReportGenerationPeriodSelection;
    scope: { kind: ReportScopeKind; value?: string | null };
    filters?: ReportAdvancedFilters;
  };
};

export type ReportGenerationRequest =
  | SingleActionReportGenerationRequest
  | MultiActionReportGenerationRequest;
