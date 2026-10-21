"use client";

import { useMemo } from "react";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type {
  CommunityEventsAvailability,
  ReportDataAvailability,
} from "@/lib/reports/data-availability";
import type { ReportGenerationPeriodSelection } from "@/lib/reports/generation-period";
import {
  REPORT_ADVANCED_FILTER_DEFAULTS,
  type ReportAdvancedFilters,
} from "@/lib/reports/report-advanced-filters";
import { computeReportModel } from "@/lib/reports/report-model";
import type { ReportScopeKind } from "@/lib/reports/scope";
import {
  buildReportExportRows,
  buildWasteProfile,
} from "./reports-web-document-model.helpers";
import { useReportsWebDocumentData } from "./use-reports-web-document-data";
import { useReportsWebDocumentScope } from "./use-reports-web-document-scope";

type UseReportsWebDocumentModelOptions = {
  initialContracts?: ActionDataContract[];
  initialIsTruncated?: boolean;
  initialSourceHealth?: UnifiedSourceHealth;
  initialCommunityEvents?: CommunityEventItem[];
  initialCommunityEventsAvailability?: CommunityEventsAvailability;
  initialPeriod?: ReportGenerationPeriodSelection;
  initialNow?: Date;
  initialScopeContracts?: ActionDataContract[];
  initialScope?: { kind: ReportScopeKind; value: string };
  advancedFilters?: ReportAdvancedFilters;
  actionMediaReadyCountByActionId?: Record<string, number>;
  actionMediaAvailability?: "available" | "unavailable";
};

export function useReportsWebDocumentModel({
  initialContracts,
  initialIsTruncated = false,
  initialSourceHealth,
  initialCommunityEvents,
  initialCommunityEventsAvailability,
  initialPeriod = { id: "full_history" },
  initialNow,
  initialScopeContracts,
  initialScope,
  advancedFilters = REPORT_ADVANCED_FILTER_DEFAULTS,
  actionMediaReadyCountByActionId = {},
  actionMediaAvailability = "available",
}: UseReportsWebDocumentModelOptions = {}) {
  const data = useReportsWebDocumentData({
    initialContracts,
    initialScopeContracts,
    initialCommunityEvents,
    initialCommunityEventsAvailability,
    initialPeriod,
    initialNow,
  });
  const scope = useReportsWebDocumentScope({
    data,
    initialContracts,
    initialScope,
    advancedFilters,
    initialNow,
    actionMediaReadyCountByActionId,
    actionMediaAvailability,
  });
  const wasteProfile = useMemo(() => buildWasteProfile(scope.filteredActionsApproved), [scope.filteredActionsApproved]);

  const report = useMemo(
    () =>
      computeReportModel({
        allItems: scope.filteredActionsAll,
        approvedItems: scope.filteredActionsApproved,
        mapItems: scope.filteredMapAll,
        events: scope.scopedCommunity,
        moderationAvailability: "unavailable",
        now: initialNow,
      }),
    [initialNow, scope.filteredActionsAll, scope.filteredActionsApproved, scope.filteredMapAll, scope.scopedCommunity],
  );

  const exportRows = useMemo(() => buildReportExportRows(scope.filteredActionsApproved), [scope.filteredActionsApproved]);
  const dataAvailability: ReportDataAvailability = {
    isTruncated: initialIsTruncated,
    sourceHealth: initialSourceHealth,
    communityEventsAvailability: data.communityEventsAvailability,
  };

  return {
    exportRows,
    wasteProfile,
    report,
    isTruncated: initialIsTruncated,
    dataAvailability,
    isLoading: data.isLoading,
    hasError: data.hasError,
    ...scope,
    admissibleActionCount: scope.filteredContracts.length,
  };
}
