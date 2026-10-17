import type { ReportDataAvailability } from "@/lib/reports/data-availability";
import type { DetailLevelId, ModuleState, PeriodId } from "@/lib/reports/report-pdf-data";

export const REPORT_SNAPSHOT_SCHEMA_VERSION = 2 as const;
export const REPORT_TEMPLATE_VERSION = "reports-template-v1" as const;
export const REPORT_RENDERER_VERSION = "official-report-html-v1" as const;

export type ReportGenerationSnapshotScopeKind =
  | "global"
  | "account"
  | "association"
  | "arrondissement"
  | "single_action";

export type ReportGenerationSnapshotProvenance =
  | {
      type: "single_action";
      actionId: string;
      source: "public.actions";
      resolvedAt: string;
    }
  | {
      type: "multi_action";
      source: "public.actions";
      resolvedAt: string;
      actionCount: number;
    };

export type ReportGenerationSnapshotMetadata = {
  snapshotSchemaVersion: typeof REPORT_SNAPSHOT_SCHEMA_VERSION;
  templateVersion: typeof REPORT_TEMPLATE_VERSION;
  rendererVersion: typeof REPORT_RENDERER_VERSION;
  generatedAt: string;
  period: {
    id: PeriodId;
    from: string | null;
    to: string;
    timeZone: "UTC";
  };
  scope: {
    kind: ReportGenerationSnapshotScopeKind;
    value: string;
    label: string;
  };
  detailLevel: DetailLevelId;
  modules: ModuleState;
  provenance: ReportGenerationSnapshotProvenance;
  methodology: {
    proxyVersion: string;
    qualityRulesVersion: string;
  };
  dataAvailability: {
    truncated: boolean;
    availableSources: string[];
    failedSources: string[];
    communityEvents: NonNullable<ReportDataAvailability["communityEventsAvailability"]>;
  };
};

export function buildReportGenerationSnapshotMetadata(params: {
  generatedAt: string;
  period: ReportGenerationSnapshotMetadata["period"];
  scope: ReportGenerationSnapshotMetadata["scope"];
  detailLevel: DetailLevelId;
  modules: ModuleState;
  provenance: ReportGenerationSnapshotProvenance;
  methodology: ReportGenerationSnapshotMetadata["methodology"];
  dataAvailability: ReportDataAvailability & {
    communityEventsAvailability: NonNullable<ReportDataAvailability["communityEventsAvailability"]>;
    sourceHealth: NonNullable<ReportDataAvailability["sourceHealth"]>;
  };
}): ReportGenerationSnapshotMetadata {
  return {
    snapshotSchemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION,
    templateVersion: REPORT_TEMPLATE_VERSION,
    rendererVersion: REPORT_RENDERER_VERSION,
    generatedAt: params.generatedAt,
    period: params.period,
    scope: params.scope,
    detailLevel: params.detailLevel,
    modules: params.modules,
    provenance: params.provenance,
    methodology: params.methodology,
    dataAvailability: {
      truncated: params.dataAvailability.isTruncated === true,
      availableSources: [...(params.dataAvailability.sourceHealth?.availableSources ?? [])],
      failedSources: [...(params.dataAvailability.sourceHealth?.failedSources ?? [])],
      communityEvents: params.dataAvailability.communityEventsAvailability,
    },
  };
}
