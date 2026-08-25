import { getActionOperationalContext, toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { loadCachedReportCommunityEvents } from "@/lib/community/report-events";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { REPORT_DATA_BUDGET } from "@/lib/reports/budget";
import { computeReportModel } from "@/lib/reports/report-model";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";

export type ReportsSummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

export async function loadReportsAnalysisData() {
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

  const actionListItems = overview.contracts.map((contract) =>
    toActionListItem(contract),
  );
  const actionMapItems = overview.contracts.map((contract) =>
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
    }),
    monthlyData: aggregateMonthlyAnalytics(overview.contracts),
  };
}

export async function loadReportsGenerationData() {
  const [contractsResult, weather, communityEventsResult] = await Promise.all([
    import("@/lib/actions/unified-source-cache").then(
      ({ fetchCachedUnifiedActionContracts }) =>
        fetchCachedUnifiedActionContracts({
          limit: REPORT_DATA_BUDGET.generation.approvedContractLimit,
          status: "approved",
          floorDate: null,
          requireCoordinates: false,
          types: null,
        }),
    ),
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { next: { revalidate: REPORT_DATA_BUDGET.weather.revalidateSeconds } },
    )
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<{
          current?: {
            temperature_2m?: number;
            precipitation?: number;
            wind_speed_10m?: number;
          };
        }>;
      })
      .catch(() => null),
    loadCachedReportCommunityEvents(REPORT_DATA_BUDGET.communityEvents.limit)
      .then((items) => ({ items, availability: "available" as const }))
      .catch(() => ({ items: [], availability: "unavailable" as const })),
  ]);
  const communityEvents = communityEventsResult.items;

  return {
    contracts: contractsResult.items,
    isTruncated: contractsResult.isTruncated,
    sourceHealth: contractsResult.sourceHealth,
    weather,
    communityEvents,
    communityEventsAvailability: communityEventsResult.availability,
  };
}

export function toReportsExportRow(contract: ActionDataContract) {
  const operational = getActionOperationalContext(contract);
  const impact = computeActionImpactKpis(contract);
  return {
    Date: contract.dates.observedAt,
    Lieu: contract.location.label,
    Masse_Kg: contract.metadata.wasteKg || 0,
    Masse_Kg_Declaree: contract.metadata.wasteKg || 0,
    Masse_Kg_Impact: impact.wasteKg,
    Origine_Masse: impact.wasteKgSource,
    Megots: contract.metadata.cigaretteButts || 0,
    Bénévoles: impact.volunteers,
    CO2e_Proxy_Kg: impact.co2AvoidedKg,
    Eau_Proxy_L: impact.waterSavedLiters,
    Economie_Voirie_Proxy_EUR: impact.euroSaved,
    Durée_Min: operational.durationMinutes,
    Charge_Terrain_Min: operational.engagementMinutes,
    Type_Lieu: operational.placeTypeLabel,
    Trajet: operational.routeStyleLabel,
    Ajustement_Trajet: operational.routeAdjustmentMessage ?? "",
    Type: contract.type,
    Source: contract.source,
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

export function buildEmptyReportsModel() {
  return computeReportModel({
    allItems: [],
    approvedItems: [],
    mapItems: [],
    events: [],
    moderationAvailability: "unavailable",
  });
}
