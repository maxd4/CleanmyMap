import {
  toActionListItem,
  toActionMapItem,
  type ActionDataContract,
} from "@/lib/actions/data-contract";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildReportTitle, buildPdfData, type DetailLevelId, type ModuleState } from "@/lib/reports/report-pdf-data";
import {
  filterReportCommunityEventsByPeriod,
  filterReportGenerationContracts,
  getReportGenerationPeriodDateBounds,
  isValidReportGenerationPeriodSelection,
  REPORT_GENERATION_TIME_ZONE,
  type ReportGenerationPeriodSelection,
} from "@/lib/reports/generation-period";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import {
  buildReportGenerationSnapshotMetadata,
  REPORT_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/reports/report-generation-snapshot";
import { toReportsExportRow } from "@/lib/reports/page-data-export";
import { loadReportsGenerationData } from "@/lib/reports/page-data";
import { computeReportModel } from "@/lib/reports/report-model";
import {
  buildReportScopeOptions,
  computeReportAccountScopeCoverage,
  filterActionContractsByScope,
  filterCommunityEventsByScope,
  formatReportScopeLabel,
  InvalidReportScopeError,
  normalizeReportScope,
  type ReportScope,
  type ReportScopeKind,
} from "@/lib/reports/scope";

export type MultiActionReportRequest = {
  type: "multi_action";
  period: ReportGenerationPeriodSelection;
  scope: Partial<ReportScope> & { kind: ReportScopeKind };
};

export class MultiActionReportScopeUnavailableError extends Error {
  constructor() {
    super("The requested report scope is not present in the canonical public action corpus.");
    this.name = "MultiActionReportScopeUnavailableError";
  }
}
export class MultiActionReportSourceUnavailableError extends Error {
  constructor() {
    super("The canonical public action source is unavailable.");
    this.name = "MultiActionReportSourceUnavailableError";
  }
}

export class MultiActionReportEmptyError extends Error {
  constructor() {
    super("The requested report window contains no eligible public actions.");
    this.name = "MultiActionReportEmptyError";
  }
}

export class MultiActionReportPeriodInvalidError extends Error {
  constructor() {
    super("The requested report period is invalid.");
    this.name = "MultiActionReportPeriodInvalidError";
  }
}

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
function isEligibleMultiActionContract(contract: ActionDataContract): boolean {
  return contract.type === "action" &&
    contract.status === "approved" &&
    contract.metadata.actionPhase === "post_action_complete" &&
    Boolean(contract.publishedAt) &&
    contract.moderationVisibility === "visible";
}

function hasScopeValue(
  scope: ReportScope,
  options: ReturnType<typeof buildReportScopeOptions>,
): boolean {
  if (scope.kind === "global") return !scope.value;
  const values = options[
    scope.kind === "account"
      ? "accounts"
      : scope.kind === "association"
        ? "associations"
        : "arrondissements"
  ];
  return Boolean(scope.value && values.some((option) => option.value === scope.value));
}

function filterPeriodEvents(
  events: Awaited<ReturnType<typeof loadReportsGenerationData>>["communityEvents"],
  period: ReportGenerationPeriodSelection,
  scope: ReportScope,
  now: Date,
) {
  return filterCommunityEventsByScope(
    filterReportCommunityEventsByPeriod(events, period, now),
    scope,
  );
}

function resolveCommunityEventsAvailability(
  availability: Awaited<ReturnType<typeof loadReportsGenerationData>>["communityEventsAvailability"],
  scope: ReportScope,
) {
  if (availability === "unavailable" || scope.kind === "global") {
    return availability;
  }
  if (scope.kind === "association") {
    return "partial" as const;
  }
  return availability;
}

export async function buildMultiActionReportGenerationInput(params: {
  request: MultiActionReportRequest;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
}): Promise<ReportGenerationHistoryInput> {
  const { request, detailLevel, modules, now } = params;
  if (!isValidReportGenerationPeriodSelection(request.period)) {
    throw new MultiActionReportPeriodInvalidError();
  }

  const generationData = await loadReportsGenerationData();
  if (generationData.sourceHealth.failedSources.includes("actions")) {
    throw new MultiActionReportSourceUnavailableError();
  }

  const canonicalContracts = generationData.contracts.filter(isEligibleMultiActionContract);
  let scope: ReportScope;
  try {
    scope = normalizeReportScope(request.scope);
  } catch (error) {
    if (error instanceof InvalidReportScopeError) {
      throw new MultiActionReportScopeUnavailableError();
    }
    throw error;
  }
  const scopeOptions = buildReportScopeOptions(
    canonicalContracts.map((contract) => ({
      created_by_clerk_id: contract.createdByClerkId,
      actor_name: contract.metadata.actorName,
      association_name: contract.metadata.associationName,
      location_label: contract.location.label,
    })),
  );
  if (!hasScopeValue(scope, scopeOptions)) {
    throw new MultiActionReportScopeUnavailableError();
  }

  const periodContracts = filterReportGenerationContracts(
    canonicalContracts,
    request.period,
    now,
  );
  const scopedContracts = filterActionContractsByScope(periodContracts, scope);
  if (scopedContracts.length === 0) {
    throw new MultiActionReportEmptyError();
  }

  const scopedEvents = filterPeriodEvents(
    generationData.communityEvents,
    request.period,
    scope,
    now,
  );
  const listItems = scopedContracts.map((contract) => toActionListItem(contract));
  const mapItems = scopedContracts.map((contract) => toActionMapItem(contract));
  const report = computeReportModel({
    allItems: listItems,
    approvedItems: listItems,
    mapItems,
    events: scopedEvents,
    contracts: scopedContracts,
    moderationAvailability: "unavailable",
    now,
  });
  const model = {
    report,
    wasteProfile: buildWasteProfile(scopedContracts),
    accountScopeCoverage: computeReportAccountScopeCoverage(listItems),
    exportRows: scopedContracts.map((contract) => toReportsExportRow(contract)),
    dataAvailability: {
      isTruncated: generationData.isTruncated,
      sourceHealth: generationData.sourceHealth,
      communityEventsAvailability: resolveCommunityEventsAvailability(
        generationData.communityEventsAvailability,
        scope,
      ),
    },
  };
  const impactKnown = (report.totals.knownWasteActions ?? 0) > 0 &&
    (report.totals.volunteersKnownActions ?? 0) > 0;
  const surfaceProxy = impactKnown
    ? report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
      report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  const scopeLabel = formatReportScopeLabel(scope, scopeOptions);
  const periodBounds = getReportGenerationPeriodDateBounds(request.period, now);
  const periodRange = request.period.id === "custom_range"
    ? {
        from: periodBounds.from!,
        to: periodBounds.to,
        timeZone: REPORT_GENERATION_TIME_ZONE,
      }
    : undefined;
  const generatedAt = now.toISOString();
  const payloadData = buildPdfData({
    reportTitle: buildReportTitle(scopeLabel, detailLevel),
    scopeLabel,
    period: request.period.id,
    periodRange,
    detailLevel,
    modules,
    model,
    surfaceProxy,
    generatedAt,
  });

  return {
    payload: {
      title: payloadData.title,
      rubrique: "reporting",
      periode: request.period.id,
      organizationType: "multi_action",
      organizationName: scopeLabel,
      snapshotSchemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION,
      snapshotMetadata: buildReportGenerationSnapshotMetadata({
        generatedAt,
        period: {
          id: request.period.id,
          from: periodBounds.from,
          to: periodBounds.to,
          timeZone: REPORT_GENERATION_TIME_ZONE,
        },
        scope: {
          kind: scope.kind,
          value: scope.value ?? "",
          label: scopeLabel,
        },
        detailLevel,
        modules,
        provenance: {
          type: "multi_action",
          source: "public.actions",
          resolvedAt: generatedAt,
          actionCount: scopedContracts.length,
        },
        methodology: {
          proxyVersion: report.impactMethodology.proxyVersion,
          qualityRulesVersion: report.impactMethodology.qualityRulesVersion,
        },
        dataAvailability: model.dataAvailability,
      }),
      data: payloadData,
    },
    scopeKind: scope.kind as ReportGenerationHistoryInput["scopeKind"],
    scopeValue: scope.value ?? "",
    scopeLabel,
    detailLevel,
    modules,
  };
}

// This module owns server-side multi-action resolution for report generation.
