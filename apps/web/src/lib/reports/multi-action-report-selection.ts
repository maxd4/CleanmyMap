import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  filterReportCommunityEventsByPeriod,
  filterReportGenerationContracts,
  isValidReportGenerationPeriodSelection,
  type ReportGenerationPeriodSelection,
} from "@/lib/reports/generation-period";
import { loadReportsGenerationData } from "@/lib/reports/page-data";
import {
  buildReportScopeOptions,
  filterActionContractsByScope,
  filterCommunityEventsByScope,
  InvalidReportScopeError,
  normalizeReportScope,
  type ReportScope,
} from "@/lib/reports/scope";
import {
  filterActionContractsByAdvancedFilters,
  normalizeReportAdvancedFilters,
  type ReportAdvancedFilters,
} from "@/lib/reports/report-advanced-filters";
import type { MultiActionReportRequest } from "@/lib/reports/multi-action-report";
import {
  MultiActionReportEmptyError,
  MultiActionReportPeriodInvalidError,
  MultiActionReportScopeUnavailableError,
  MultiActionReportSourceUnavailableError,
} from "@/lib/reports/multi-action-report-errors";

type GenerationData = Awaited<ReturnType<typeof loadReportsGenerationData>>;

export type MultiActionReportSelection = {
  generationData: GenerationData;
  scope: ReportScope;
  scopeOptions: ReturnType<typeof buildReportScopeOptions>;
  filters: ReportAdvancedFilters;
  period: ReportGenerationPeriodSelection;
  filteredContracts: ActionDataContract[];
  scopedEvents: GenerationData["communityEvents"];
};

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
  events: GenerationData["communityEvents"],
  period: ReportGenerationPeriodSelection,
  scope: ReportScope,
  now: Date,
) {
  return filterCommunityEventsByScope(
    filterReportCommunityEventsByPeriod(events, period, now),
    scope,
  );
}

export async function resolveMultiActionReportSelection(params: {
  request: MultiActionReportRequest;
  now: Date;
  readerUserId?: string;
}): Promise<MultiActionReportSelection> {
  if (!isValidReportGenerationPeriodSelection(params.request.period)) {
    throw new MultiActionReportPeriodInvalidError();
  }

  const generationData = await loadReportsGenerationData(params.readerUserId);
  if (generationData.sourceHealth.failedSources.includes("actions")) {
    throw new MultiActionReportSourceUnavailableError();
  }

  const canonicalContracts = generationData.contracts.filter(isEligibleMultiActionContract);
  let scope: ReportScope;
  try {
    scope = normalizeReportScope(params.request.scope);
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

  const periodContracts = filterReportGenerationContracts(canonicalContracts, params.request.period, params.now);
  const scopedContracts = filterActionContractsByScope(periodContracts, scope);
  const filters = normalizeReportAdvancedFilters(params.request.filters);
  const filteredContracts = filterActionContractsByAdvancedFilters({
    contracts: scopedContracts,
    filters,
    now: params.now,
    actionMediaReadyCountByActionId: new Map(
      Object.entries(generationData.actionMediaReadyCountByActionId ?? {})
        .map(([id, count]) => [id, Number(count)] as const),
    ),
    actionMediaAvailability: generationData.actionMediaAvailability ?? "available",
  });
  if (filteredContracts.length === 0) {
    throw new MultiActionReportEmptyError();
  }

  return {
    generationData,
    scope,
    scopeOptions,
    filters,
    period: params.request.period,
    filteredContracts,
    scopedEvents: filterPeriodEvents(generationData.communityEvents, params.request.period, scope, params.now),
  };
}
