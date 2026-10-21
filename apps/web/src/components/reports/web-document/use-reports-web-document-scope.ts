"use client";

import { useMemo, useState } from "react";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  buildReportScopeOptions,
  computeReportAccountScopeCoverage,
  filterCommunityEventsByScope,
  filterReportScopeItems,
  formatReportScopeLabel,
  normalizeReportScope,
  type ReportScopeKind,
} from "@/lib/reports/scope";
import { buildAdvancedFilteredIds } from "./reports-web-document-model.helpers";
import type { ReportsWebDocumentData } from "./use-reports-web-document-data";
import type { ReportAdvancedFilters } from "@/lib/reports/report-advanced-filters";

function filterScopeItems<T extends { id: string }>(items: T[], ids: Set<string> | null): T[] {
  return ids === null ? items : items.filter((item) => ids.has(item.id));
}

type UseReportsWebDocumentScopeOptions = {
  data: ReportsWebDocumentData;
  initialContracts?: ActionDataContract[];
  initialScope?: { kind: ReportScopeKind; value: string };
  advancedFilters: ReportAdvancedFilters;
  initialNow?: Date;
  actionMediaReadyCountByActionId: Record<string, number>;
  actionMediaAvailability: "available" | "unavailable";
};

export function useReportsWebDocumentScope({
  data,
  initialContracts,
  initialScope,
  advancedFilters,
  initialNow,
  actionMediaReadyCountByActionId,
  actionMediaAvailability,
}: UseReportsWebDocumentScopeOptions) {
  const [scopeKind, setScopeKind] = useState<ReportScopeKind>(initialScope?.kind ?? "global");
  const [scopeValue, setScopeValue] = useState(initialScope?.value ?? "");
  const scopeOptions = useMemo(
    () => buildReportScopeOptions([...data.actionsAllItems, ...data.mapItems]),
    [data.actionsAllItems, data.mapItems],
  );
  const accountScopeCoverage = useMemo(
    () => computeReportAccountScopeCoverage(data.actionsAllItems),
    [data.actionsAllItems],
  );
  const scopeValueOptions = scopeKind === "account"
    ? scopeOptions.accounts
    : scopeKind === "association"
      ? scopeOptions.associations
      : scopeKind === "arrondissement"
        ? scopeOptions.arrondissements
        : [];
  const effectiveScopeValue = scopeKind === "global"
    ? ""
    : scopeValueOptions.find((option) => option.value === scopeValue)?.value ?? "";
  const scope = useMemo(
    () => scopeKind === "global" || effectiveScopeValue
      ? normalizeReportScope({ kind: scopeKind, value: effectiveScopeValue })
      : { kind: "global" as const, value: null },
    [effectiveScopeValue, scopeKind],
  );
  const scopedActionsAll = useMemo(
    () => filterReportScopeItems(data.actionsAllItems, scope),
    [data.actionsAllItems, scope],
  );
  const scopedActionsApproved = useMemo(
    () => filterReportScopeItems(data.actionsApprovedItems, scope),
    [data.actionsApprovedItems, scope],
  );
  const scopedMapAll = useMemo(
    () => filterReportScopeItems(data.mapItems, scope),
    [data.mapItems, scope],
  );
  const scopedCommunity = useMemo(
    () => filterCommunityEventsByScope(data.periodCommunityEvents, scope),
    [data.periodCommunityEvents, scope],
  );
  const advancedFilteredIds = useMemo(
    () => buildAdvancedFilteredIds({
      initialContracts,
      scopedActions: scopedActionsAll,
      filters: advancedFilters,
      now: initialNow ?? new Date(),
      actionMediaReadyCountByActionId,
      actionMediaAvailability,
    }),
    [actionMediaAvailability, actionMediaReadyCountByActionId, advancedFilters, initialContracts, initialNow, scopedActionsAll],
  );
  const filteredActionsAll = useMemo(
    () => filterScopeItems(scopedActionsAll, advancedFilteredIds),
    [advancedFilteredIds, scopedActionsAll],
  );
  const filteredActionsApproved = useMemo(
    () => filterScopeItems(scopedActionsApproved, advancedFilteredIds),
    [advancedFilteredIds, scopedActionsApproved],
  );
  const filteredMapAll = useMemo(
    () => filterScopeItems(scopedMapAll, advancedFilteredIds),
    [advancedFilteredIds, scopedMapAll],
  );
  const filteredContracts = useMemo(
    () => initialContracts?.filter((contract) => advancedFilteredIds?.has(contract.id)) ?? [],
    [advancedFilteredIds, initialContracts],
  );

  return {
    scopeKind,
    setScopeKind,
    scopeValue: effectiveScopeValue,
    setScopeValue,
    scopeOptions,
    activeScopeLabel: formatReportScopeLabel(scope, scopeOptions),
    accountScopeCoverage,
    scopedCommunity,
    filteredActionsAll,
    filteredActionsApproved,
    filteredMapAll,
    filteredContracts,
  };
}
