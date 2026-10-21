import { toActionListItem, toActionMapItem } from "@/lib/actions/data-contract";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildReportTitle, buildPdfData, type DetailLevelId, type ModuleState } from "@/lib/reports/report-pdf-data";
import {
  getReportGenerationPeriodDateBounds,
  REPORT_GENERATION_TIME_ZONE,
} from "@/lib/reports/generation-period";
import {
  buildReportGenerationSnapshotMetadata,
  REPORT_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/reports/report-generation-snapshot";
import { toReportsExportRow } from "@/lib/reports/page-data-export";
import { computeReportModel } from "@/lib/reports/report-model";
import { computeReportAccountScopeCoverage, formatReportScopeLabel } from "@/lib/reports/scope";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import type { MultiActionReportSelection } from "@/lib/reports/multi-action-report-selection";

type MultiActionWasteProfile = {
  categories: Array<{ key: string; label: string; kg: number; actions: number }>;
  coveragePercent: number;
  dominantLabel: string;
  dominantKg: number;
};

function resolveCommunityEventsAvailability(
  availability: MultiActionReportSelection["generationData"]["communityEventsAvailability"],
  scope: MultiActionReportSelection["scope"],
) {
  if (availability === "unavailable" || scope.kind === "global") return availability;
  if (scope.kind === "association") return "partial" as const;
  return availability;
}

function buildMultiActionModel(
  selection: MultiActionReportSelection,
  now: Date,
  wasteProfile: MultiActionWasteProfile,
) {
  const listItems = selection.filteredContracts.map((contract) => toActionListItem(contract));
  const mapItems = selection.filteredContracts.map((contract) => toActionMapItem(contract));
  const report = computeReportModel({
    allItems: listItems,
    approvedItems: listItems,
    mapItems,
    events: selection.scopedEvents,
    contracts: selection.filteredContracts,
    moderationAvailability: "unavailable",
    now,
  });
  return {
    report,
    wasteProfile,
    accountScopeCoverage: computeReportAccountScopeCoverage(listItems),
    exportRows: selection.filteredContracts.map(toReportsExportRow),
    dataAvailability: {
      isTruncated: selection.generationData.isTruncated,
      sourceHealth: selection.generationData.sourceHealth,
      communityEventsAvailability: resolveCommunityEventsAvailability(
        selection.generationData.communityEventsAvailability,
        selection.scope,
      ),
    },
  };
}

function buildMultiActionPayload(params: {
  selection: MultiActionReportSelection;
  model: ReturnType<typeof buildMultiActionModel>;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
}) {
  const { selection, model, detailLevel, modules, now } = params;
  const scopeLabel = formatReportScopeLabel(selection.scope, selection.scopeOptions);
  const periodBounds = getReportGenerationPeriodDateBounds(selection.period, now);
  const periodRange = selection.period.id === "custom_range"
    ? { from: periodBounds.from!, to: periodBounds.to, timeZone: REPORT_GENERATION_TIME_ZONE }
    : undefined;
  const generatedAt = now.toISOString();
  const impactKnown = (model.report.totals.knownWasteActions ?? 0) > 0 &&
    (model.report.totals.volunteersKnownActions ?? 0) > 0;
  const surfaceProxy = impactKnown
    ? model.report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
      model.report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  const data = buildPdfData({
    reportTitle: buildReportTitle(scopeLabel, detailLevel),
    scopeLabel,
    period: selection.period.id,
    periodRange,
    detailLevel,
    modules,
    model,
    surfaceProxy,
    generatedAt,
  });
  return { scopeLabel, periodBounds, generatedAt, data };
}

export function buildMultiActionReportGenerationResult(params: {
  selection: MultiActionReportSelection;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
  generationId: string;
  wasteProfile: MultiActionWasteProfile;
}): ReportGenerationHistoryInput {
  const { selection, detailLevel, modules, now, generationId, wasteProfile } = params;
  const model = buildMultiActionModel(selection, now, wasteProfile);
  const snapshot = buildMultiActionPayload({ selection, model, detailLevel, modules, now });
  return {
    payload: {
      title: snapshot.data.title,
      rubrique: "reporting",
      periode: selection.period.id,
      organizationType: "multi_action",
      organizationName: snapshot.scopeLabel,
      snapshotSchemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION,
      snapshotMetadata: buildReportGenerationSnapshotMetadata({
        generationId,
        generatedAt: snapshot.generatedAt,
        period: {
          id: selection.period.id,
          from: snapshot.periodBounds.from,
          to: snapshot.periodBounds.to,
          timeZone: REPORT_GENERATION_TIME_ZONE,
        },
        scope: {
          kind: selection.scope.kind,
          value: selection.scope.value ?? "",
          label: snapshot.scopeLabel,
        },
        detailLevel,
        modules,
        provenance: {
          type: "multi_action",
          source: "public.actions",
          resolvedAt: snapshot.generatedAt,
          actionCount: selection.filteredContracts.length,
        },
        methodology: {
          proxyVersion: model.report.impactMethodology.proxyVersion,
          qualityRulesVersion: model.report.impactMethodology.qualityRulesVersion,
        },
        dataAvailability: model.dataAvailability,
        filters: selection.filters,
      }),
      data: snapshot.data,
    },
    scopeKind: selection.scope.kind as ReportGenerationHistoryInput["scopeKind"],
    scopeValue: selection.scope.value ?? "",
    scopeLabel: snapshot.scopeLabel,
    detailLevel,
    modules,
  };
}
