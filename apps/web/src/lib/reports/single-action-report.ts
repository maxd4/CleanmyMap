import { toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { loadActionById } from "@/lib/actions/store-queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { computeReportModel } from "@/lib/reports/report-model";
import { computeReportAccountScopeCoverage } from "@/lib/reports/scope";
import { toReportsExportRow } from "@/lib/reports/page-data-export";
import { buildPdfData, buildReportTitle, type DetailLevelId, type ModuleState } from "@/lib/reports/report-pdf-data";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";

export type SingleActionReportRequest = {
  type: "single_action";
  actionId: string;
};

export class SingleActionReportTargetUnavailableError extends Error {
  constructor() {
    super("The requested action is not an eligible public completed action.");
    this.name = "SingleActionReportTargetUnavailableError";
  }
}

function isEligibleSingleAction(row: { status: string; action_phase?: string | null; published_at?: string | null; moderation_visibility?: string | null }): boolean {
  return row.status === "approved" &&
    row.action_phase === "post_action_complete" &&
    Boolean(row.published_at) &&
    row.moderation_visibility === "visible";
}

export async function resolveSingleActionReportContract(actionId: string): Promise<ActionDataContract> {
  const row = await loadActionById(getSupabaseServerClient(true), actionId);
  if (!row || !isEligibleSingleAction(row)) {
    throw new SingleActionReportTargetUnavailableError();
  }
  const contract = toActionContract(row);
  if (contract.type !== "action" || contract.status !== "approved" || contract.metadata.actionPhase !== "post_action_complete") {
    throw new SingleActionReportTargetUnavailableError();
  }
  return contract;
}

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
    .map(([key, label]) => ({ key, label, kg: Number(breakdown?.[key] ?? 0), actions: Number(breakdown?.[key] ?? 0) > 0 ? 1 : 0 }))
    .filter((category) => category.kg > 0);
  return {
    categories,
    coveragePercent: breakdown ? 100 : 0,
    dominantLabel: categories[0]?.label ?? "Déchets non typés",
  };
}

function actionLabel(contract: ActionDataContract): string {
  const preparedTitle = contract.metadata.preparationData?.actionTitle;
  return typeof preparedTitle === "string" && preparedTitle.trim()
    ? preparedTitle.trim()
    : contract.location.label.trim() || contract.id;
}

export function buildSingleActionReportGenerationInput(params: {
  request: SingleActionReportRequest;
  contract: ActionDataContract;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
}): ReportGenerationHistoryInput {
  const { contract, detailLevel, modules, now, request } = params;
  const listItem = toActionListItem(contract);
  const mapItem = toActionMapItem(contract);
  const report = computeReportModel({
    allItems: [listItem],
    approvedItems: [listItem],
    mapItems: [mapItem],
    events: [],
    contracts: [contract],
    moderationAvailability: "available",
    now,
  });
  const impact = computeActionImpactKpis(contract);
  const wasteKnown = impact.wasteKnown;
  const buttsKnown = contract.metadata.cigaretteButts !== null && contract.metadata.cigaretteButts !== undefined && Number.isFinite(Number(contract.metadata.cigaretteButts));
  const volunteersKnown = impact.volunteersKnown;
  const reportWithKnownness = {
    ...report,
    totals: {
      ...report.totals,
      buttsKnownActions: buttsKnown ? 1 : 0,
    },
  };
  const surfaceProxy = wasteKnown && volunteersKnown
    ? report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
      report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  const scopeLabel = actionLabel(contract);
  const generatedAt = now.toISOString();
  const payloadData = buildPdfData({
    reportTitle: buildReportTitle(scopeLabel, detailLevel),
    scopeLabel,
    period: "full_history",
    detailLevel,
    modules,
    model: {
      report: reportWithKnownness,
      wasteProfile: buildWasteProfile(contract),
      accountScopeCoverage: computeReportAccountScopeCoverage([listItem]),
      exportRows: [toReportsExportRow(contract)],
      dataAvailability: {
        communityEventsAvailability: "unavailable",
        isTruncated: false,
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      },
    },
    surfaceProxy,
    generatedAt,
    provenance: {
      type: "single_action",
      actionId: request.actionId,
      source: "public.actions",
      resolvedAt: generatedAt,
    },
  });

  return {
    payload: {
      title: payloadData.title,
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "single_action",
      organizationName: scopeLabel,
      provenance: {
        type: "single_action",
        actionId: request.actionId,
        source: "public.actions",
        resolvedAt: generatedAt,
      },
      data: payloadData,
    },
    scopeKind: "single_action",
    scopeValue: request.actionId,
    scopeLabel,
    detailLevel,
    modules,
  };
}
