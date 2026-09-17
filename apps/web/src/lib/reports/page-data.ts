import { toActionListItem, toActionMapItem } from "@/lib/actions/data-contract";
import { loadCachedReportCommunityEvents } from "@/lib/community/report-events";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { filterContractsToWindow } from "@/lib/pilotage/metrics";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { REPORT_DATA_BUDGET } from "@/lib/reports/budget";
import { computeReportModel } from "@/lib/reports/report-model";
import { loadLandingSummary } from "@/lib/accueil/data";
export { toReportsExportRow } from "./page-data-export";

export type ReportsSummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

export type ReportsPublicSummary = {
  visibleActions: number;
  distinctLocations: number;
  wasteKg: number;
  cigaretteButts: number;
  volunteers: number;
};

export async function loadReportsPublicSummary(): Promise<ReportsPublicSummary> {
  const summary = await loadLandingSummary();
  return {
    visibleActions: summary.activity.visibleActions,
    distinctLocations: summary.activity.distinctLocations,
    wasteKg: summary.counters.wasteKg,
    cigaretteButts: summary.counters.butts,
    volunteers: summary.counters.volunteers,
  };
}

export async function loadReportsAnalysisData(now = new Date()) {
  const [overview, communityEventsResult] = await Promise.all([
    loadPilotageOverview({
      periodDays: REPORT_DATA_BUDGET.pilotage.periodDays,
      limit: REPORT_DATA_BUDGET.pilotage.contractLimit,
    }),
    loadCachedReportCommunityEvents(REPORT_DATA_BUDGET.communityEvents.limit)
      .then((items) => ({ items, availability: "available" as const }))
      .catch(() => ({ items: [], availability: "unavailable" as const })),
  ]);
  const communityEvents = communityEventsResult.items;
  const activeContracts = filterContractsToWindow(overview.contracts, overview.periodDays, now);
  const historicalContracts = filterContractsToWindow(overview.contracts, 365, now);

  const actionListItems = activeContracts.map((contract) =>
    toActionListItem(contract),
  );
  const actionMapItems = activeContracts.map((contract) =>
    toActionMapItem(contract),
  );

  return {
    overview,
    communityEvents,
    communityEventsAvailability: communityEventsResult.availability,
    report: computeReportModel({
      allItems: actionListItems,
      approvedItems: actionListItems,
      mapItems: actionMapItems,
      events: communityEvents,
      moderationAvailability: "unavailable",
      now,
    }),
    monthlyData: aggregateMonthlyAnalytics(historicalContracts),
  };
}

export async function loadReportsGenerationData() {
  const [contractsResult, communityEventsResult] = await Promise.all([
    import("@/lib/actions/unified-source/unified-source-cache").then(
      ({ fetchCachedUnifiedActionContracts }) =>
        fetchCachedUnifiedActionContracts({
          limit: null,
          status: "approved",
          floorDate: null,
          requireCoordinates: false,
          types: null,
        }),
    ),
    loadCachedReportCommunityEvents(REPORT_DATA_BUDGET.communityEvents.limit)
      .then((items) => ({ items, availability: "available" as const }))
      .catch(() => ({ items: [], availability: "unavailable" as const })),
  ]);
  const communityEvents = communityEventsResult.items;

  return {
    contracts: contractsResult.items,
    isTruncated: contractsResult.isTruncated,
    sourceHealth: contractsResult.sourceHealth,
    communityEvents,
    communityEventsAvailability: communityEventsResult.availability,
  };
}

export function buildReportsSummaryKpis(
  overview: Awaited<ReturnType<typeof loadPilotageOverview>> | null,
): [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi] {
  if (!overview) {
    return [
      {
        label: "Impact terrain",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Mobilisation",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Qualité data",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
    ];
  }

  return overview.summary.kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    previousValue: kpi.previousValue,
    deltaAbsolute: kpi.deltaAbsolute ?? "",
    deltaPercent: kpi.deltaPercent ?? "",
    interpretation: kpi.interpretation ?? "neutral",
  })) as [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
}
