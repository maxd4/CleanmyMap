import type { ActionImpactInput } from "@/lib/actions/impact-calculators";
import {
  computeActionImpactKpis,
  sumActionImpactKpis,
} from "@/lib/actions/impact-calculators";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { computeEnvironmentalProxyMetrics } from "./metrics";
import type { AreaStats } from "./types";
import { buildMonthRows, buildRouteSteps } from "./builders";
import { toFrInt, toFrNumber } from "./formatters";
import { safeImageSource } from "@/lib/security/html-escape";

export function toActionImpactInput(item: ActionListItem): ActionImpactInput {
  return item.contract ?? {
    metadata: {
      wasteKg: item.waste_kg,
      cigaretteButts: item.cigarette_butts,
      volunteersCount: item.volunteers_count,
      durationMinutes: item.duration_minutes,
      wasteBreakdown: item.waste_breakdown,
    },
  };
}

function buildTrendProjection(approvedActions: ActionListItem[], nowMs: number) {
  const currentFloor = nowMs - 30 * 24 * 60 * 60 * 1000;
  const previousFloor = nowMs - 60 * 24 * 60 * 60 * 1000;
  const currentActions = approvedActions.filter((item) => {
    const timestamp = new Date(item.action_date).getTime();
    return Number.isFinite(timestamp) && timestamp >= currentFloor;
  });
  const previousActions = approvedActions.filter((item) => {
    const timestamp = new Date(item.action_date).getTime();
    return Number.isFinite(timestamp) && timestamp >= previousFloor && timestamp < currentFloor;
  });
  const trendPercent =
    previousActions.length > 0
      ? ((currentActions.length - previousActions.length) / previousActions.length) * 100
      : currentActions.length > 0
        ? 100
        : 0;
  const monthRows = buildMonthRows(approvedActions);

  return {
    trendPercent,
    monthRows6: monthRows.slice(-6),
    monthRows12: monthRows.slice(-12),
  };
}

function buildClimateProjection(
  approvedActions: ActionListItem[],
  nowMs: number,
  totalButts: number,
  totalKg: number,
) {
  const sixMonthsFloor = nowMs - 183 * 24 * 60 * 60 * 1000;
  const twelveMonthsFloor = nowMs - 365 * 24 * 60 * 60 * 1000;
  const sixMonthsItems = approvedActions.filter((item) => {
    const timestamp = new Date(item.action_date).getTime();
    return Number.isFinite(timestamp) && timestamp >= sixMonthsFloor;
  });
  const twelveMonthsItems = approvedActions.filter((item) => {
    const timestamp = new Date(item.action_date).getTime();
    return Number.isFinite(timestamp) && timestamp >= twelveMonthsFloor;
  });
  const summarizeWindow = (items: ActionListItem[]) => {
    const impact = sumActionImpactKpis(items.map(toActionImpactInput));
    return {
      actions: items.length,
      kg: impact.wasteKg,
      butts: impact.butts,
    };
  };

  return {
    environmental: computeEnvironmentalProxyMetrics(totalButts, totalKg),
    climate6: summarizeWindow(sixMonthsItems),
    climate12: summarizeWindow(twelveMonthsItems),
  };
}

function buildReportHighlights(approvedActions: ActionListItem[]) {
  const highlightActions = approvedActions
    .filter((item) => (item.contract?.metadata.photos?.length ?? 0) > 0)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.location_label,
      kg: computeActionImpactKpis(toActionImpactInput(item)).wasteKg,
      butts: computeActionImpactKpis(toActionImpactInput(item)).butts,
      photos: item.contract?.metadata.photos
        ?.map((photo) => safeImageSource(photo.dataUrl))
        .filter((url): url is string => Boolean(url)) ?? [],
    }));

  const highlightPhotos: Array<{ url: string; label: string; date: string }> = [];
  highlightActions.forEach((action) => {
    action.photos.slice(0, 2).forEach((photoUrl) => {
      highlightPhotos.push({
        url: photoUrl,
        label: action.label,
        date: approvedActions.find((item) => item.id === action.id)?.action_date ?? "",
      });
    });
  });

  return {
    highlightActions,
    highlightPhotos: highlightPhotos.slice(0, 6),
  };
}

export function buildReportProjections(input: {
  approvedActions: ActionListItem[];
  mapApprovedActions: ActionMapItem[];
  byArea: AreaStats[];
  nowMs: number;
  totals: {
    totalKg: number;
    totalButts: number;
  };
}) {
  const trend = buildTrendProjection(input.approvedActions, input.nowMs);
  const routeSteps = buildRouteSteps(input.mapApprovedActions, 6);
  const routeDistance = routeSteps.reduce((sum, step) => sum + step.segmentKm, 0);
  const climate = buildClimateProjection(
    input.approvedActions,
    input.nowMs,
    input.totals.totalButts,
    input.totals.totalKg,
  );
  const annualRows = input.byArea.slice(0, 8).map((row) => [
    row.area,
    toFrInt(row.actions),
    `${toFrNumber(row.kg)} kg`,
    toFrInt(row.butts),
    `${toFrNumber(row.actions > 0 ? row.kg / row.actions : 0, 2)} kg/action`,
  ]);

  return {
    ...trend,
    routeSteps,
    routeDistance,
    ...climate,
    annualRows,
    ...buildReportHighlights(input.approvedActions),
  };
}
