import { toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";
import type { ActionSourceName } from "@/lib/actions/types";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildPdfData, buildReportTitle, type DetailLevelId, type ModuleState } from "@/lib/reports/report-pdf-data";
import { getReportGenerationPeriodDateBounds, REPORT_GENERATION_TIME_ZONE } from "@/lib/reports/generation-period";
import { toReportsExportRow } from "@/lib/reports/page-data-export";
import { computeReportModel } from "@/lib/reports/report-model";
import { computeReportAccountScopeCoverage } from "@/lib/reports/scope";
import {
  buildReportGenerationSnapshotMetadata,
  REPORT_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/reports/report-generation-snapshot";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "@/lib/reports/report-advanced-filters";

function buildWasteProfile(contract: ActionDataContract) {
  const definitions = [
    ["megotsKg", "Mégots"],
    ["plastiqueKg", "Plastique"],
    ["verreKg", "Verre"],
    ["metalKg", "Métal"],
    ["mixteKg", "Déchets mixtes"],
  ] as const;
  const breakdown = contract.metadata.wasteBreakdown;
  const categories = definitions
    .map(([key, label]) => ({
      key,
      label,
      kg: Number(breakdown?.[key] ?? 0),
      actions: Number(breakdown?.[key] ?? 0) > 0 ? 1 : 0,
    }))
    .filter((category) => category.kg > 0);
  return { categories, coveragePercent: breakdown ? 100 : 0, dominantLabel: categories[0]?.label ?? "Déchets non typés" };
}

function buildSingleActionModel(contract: ActionDataContract, now: Date) {
  const listItem = toActionListItem(contract);
  const report = computeReportModel({
    allItems: [listItem],
    approvedItems: [listItem],
    mapItems: [toActionMapItem(contract)],
    events: [],
    contracts: [contract],
    moderationAvailability: "available",
    now,
  });
  const impact = computeActionImpactKpis(contract);
  const buttsKnown = contract.metadata.cigaretteButts !== null &&
    contract.metadata.cigaretteButts !== undefined &&
    Number.isFinite(Number(contract.metadata.cigaretteButts));
  const modelReport = { ...report, totals: { ...report.totals, buttsKnownActions: buttsKnown ? 1 : 0 } };
  const surfaceProxy = impact.wasteKnown && impact.volunteersKnown
    ? report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
      report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  return {
    report: modelReport,
    wasteProfile: buildWasteProfile(contract),
    accountScopeCoverage: computeReportAccountScopeCoverage([listItem]),
    exportRows: [toReportsExportRow(contract)],
    dataAvailability: {
      communityEventsAvailability: "unavailable" as const,
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [] as ActionSourceName[],
        availableSources: ["actions"] as ActionSourceName[],
        warnings: [],
      },
    },
    surfaceProxy,
  };
}

function buildSingleActionPayload(params: {
  contract: ActionDataContract;
  actionId: string;
  scopeLabel: string;
  model: ReturnType<typeof buildSingleActionModel>;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  generatedAt: string;
}) {
  const { surfaceProxy, ...model } = params.model;
  return buildPdfData({
    reportTitle: buildReportTitle(params.scopeLabel, params.detailLevel),
    scopeLabel: params.scopeLabel,
    period: "full_history",
    detailLevel: params.detailLevel,
    modules: params.modules,
    model,
    surfaceProxy,
    generatedAt: params.generatedAt,
    provenance: {
      type: "single_action",
      actionId: params.actionId,
      source: "public.actions",
      resolvedAt: params.generatedAt,
    },
  });
}

export function buildSingleActionReportGenerationResult(params: {
  contract: ActionDataContract;
  actionId: string;
  scopeLabel: string;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
  generationId: string;
}): ReportGenerationHistoryInput {
  const generatedAt = params.now.toISOString();
  const model = buildSingleActionModel(params.contract, params.now);
  const data = buildSingleActionPayload({
    contract: params.contract,
    actionId: params.actionId,
    scopeLabel: params.scopeLabel,
    model,
    detailLevel: params.detailLevel,
    modules: params.modules,
    generatedAt,
  });
  return {
    payload: {
      title: data.title,
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "single_action",
      organizationName: params.scopeLabel,
      snapshotSchemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION,
      snapshotMetadata: buildReportGenerationSnapshotMetadata({
        generationId: params.generationId,
        generatedAt,
        period: {
          id: "full_history",
          from: null,
          to: getReportGenerationPeriodDateBounds({ id: "full_history" }, params.now).to,
          timeZone: REPORT_GENERATION_TIME_ZONE,
        },
        scope: { kind: "single_action", value: params.actionId, label: params.scopeLabel },
        detailLevel: params.detailLevel,
        modules: params.modules,
        provenance: { type: "single_action", actionId: params.actionId, source: "public.actions", resolvedAt: generatedAt },
        methodology: {
          proxyVersion: model.report.impactMethodology.proxyVersion,
          qualityRulesVersion: model.report.impactMethodology.qualityRulesVersion,
        },
        filters: REPORT_ADVANCED_FILTER_DEFAULTS,
        dataAvailability: model.dataAvailability,
      }),
      provenance: { type: "single_action", actionId: params.actionId, source: "public.actions", resolvedAt: generatedAt },
      data,
    },
    scopeKind: "single_action",
    scopeValue: params.actionId,
    scopeLabel: params.scopeLabel,
    detailLevel: params.detailLevel,
    modules: params.modules,
  };
}
