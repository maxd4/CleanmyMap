import {
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";
import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import type {
  ReportModel,
  ReportModelInput,
  ReportModerationAvailability,
} from "./types";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";

import { normalizeListType } from "./helpers";
import { average, median } from "./math";
import { buildRouteSteps, buildMonthRows, buildCalendarRows, buildExecutiveNarrative } from "./builders";
import { toFrInt, toFrNumber } from "./formatters";
import {
  computeCommunityEngagementMetrics,
  computeEnvironmentalProxyMetrics,
  computeMapCoverageMetrics,
} from "./metrics";

export * from "./formatters";
export * from "./math";
export * from "./helpers";
export * from "./builders";
export * from "./metrics";

function computeTotals(approvedActions: ActionListItem[]) {
  const totalKg = approvedActions.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0);
  const totalButts = approvedActions.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0);
  const totalVolunteers = approvedActions.reduce((sum, item) => sum + Number(item.volunteers_count || 0), 0);
  const totalHours = approvedActions.reduce(
    (sum, item) => sum + (Number(item.duration_minutes || 0) * Number(item.volunteers_count || 0)) / 60,
    0,
  );
  return { totalKg, totalButts, totalVolunteers, totalHours };
}

function computeModerationStats(
  allItems: ActionListItem[],
  availability: ReportModerationAvailability,
) {
  const allStatuses = {
    pending: allItems.filter((item) => item.status === "pending").length,
    approved: allItems.filter((item) => item.status === "approved").length,
    rejected: allItems.filter((item) => item.status === "rejected").length,
  };

  if (availability === "unavailable") {
    return {
      availability,
      pending: null,
      approved: allStatuses.approved,
      rejected: null,
      conversion: null,
      delayDays: null,
    };
  }

  const moderationProcessed = allStatuses.approved + allStatuses.rejected;
  const moderationConversion =
    moderationProcessed > 0
      ? (allStatuses.approved / moderationProcessed) * 100
      : null;

  const moderationDelayDays = allItems
    .map((item) => {
      const created = item.contract?.dates.createdAt ?? item.created_at;
      const validated = item.contract?.dates.validatedAt ?? null;
      if (!created || !validated) return null;
      const createdMs = new Date(created).getTime();
      const validatedMs = new Date(validated).getTime();
      if (!Number.isFinite(createdMs) || !Number.isFinite(validatedMs) || validatedMs < createdMs) return null;
      return (validatedMs - createdMs) / (24 * 60 * 60 * 1000);
    })
    .filter((value): value is number => value !== null);

  return {
    availability,
    pending: allStatuses.pending,
    approved: allStatuses.approved,
    rejected: allStatuses.rejected,
    conversion: moderationConversion,
    delayDays: moderationDelayDays.length > 0 ? average(moderationDelayDays) : null,
  };
}

function computeMapMetrics(mapItems: ActionMapItem[]) {
  const mapApproved = mapItems.filter((item) => item.status === "approved");
  const mapApprovedActions = mapApproved.filter((item) => mapItemType(item) === "action");
  const mapSpots = mapItems.filter((item) => mapItemType(item) === "spot");
  const mapCleanPlaces = mapItems.filter((item) => mapItemType(item) === "clean_place");
  const coverage = computeMapCoverageMetrics(mapApproved);

  return {
    mapApprovedActions,
    mapSpots,
    mapCleanPlaces,
    ...coverage,
  };
}

function computeQualityMetrics(approvedActions: ActionListItem[], nowMs: number) {
  const completenessChecks = approvedActions.map((item) => {
    const hasDate = Boolean(item.action_date);
    const hasLocation = item.location_label.trim().length > 2;
    const hasDuration = Number(item.duration_minutes || 0) > 0;
    const hasVolunteers = Number(item.volunteers_count || 0) > 0;
    const hasWaste =
      item.waste_kg !== null &&
      Number.isFinite(item.waste_kg) &&
      item.waste_kg >= 0;
    return hasDate && hasLocation && hasDuration && hasVolunteers && hasWaste;
  });
  const completenessScore =
    completenessChecks.length > 0
      ? (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
      : 0;

  const coherenceChecks = approvedActions.map((item) => {
    const waste = item.waste_kg;
    const butts = item.cigarette_butts;
    const volunteers = Number(item.volunteers_count || 0);
    const minutes = Number(item.duration_minutes || 0);
    return (
      waste !== null &&
      Number.isFinite(waste) &&
      waste >= 0 &&
      butts !== null &&
      Number.isFinite(butts) &&
      butts >= 0 &&
      volunteers >= 1 &&
      minutes >= 5
    );
  });
  const coherenceScore =
    coherenceChecks.length > 0 ? (coherenceChecks.filter(Boolean).length / coherenceChecks.length) * 100 : 0;

  const freshnessDays = median(
    approvedActions
      .map((item) => {
        const timestamp = new Date(item.action_date).getTime();
        if (!Number.isFinite(timestamp)) return null;
        return (nowMs - timestamp) / (24 * 60 * 60 * 1000);
      })
      .filter((value): value is number => value !== null && value >= 0),
  );
  const pollutionScoreAverage = average(
    approvedActions.map((item) => evaluateActionQuality(item).score),
  );

  return { completenessScore, coherenceScore, freshnessDays, pollutionScoreAverage };
}

type CommunityEvent = {
  eventDate: string;
  rsvpCounts: {
    yes: number;
    maybe: number;
    no: number;
  };
};

function computeCommunityStats(allItems: ActionListItem[], approvedActions: ActionListItem[], events: CommunityEvent[], now: Date) {
  const eventUpcoming = events.filter((event) => event.eventDate >= now.toISOString().slice(0, 10));
  const eventPast = events.filter((event) => event.eventDate < now.toISOString().slice(0, 10));
  const rsvp = events.reduce(
    (acc, event) => {
      acc.yes += event.rsvpCounts.yes;
      acc.maybe += event.rsvpCounts.maybe;
      acc.no += event.rsvpCounts.no;
      return acc;
    },
    { yes: 0, maybe: 0, no: 0 },
  );
  const rsvpTotal = rsvp.yes + rsvp.maybe + rsvp.no;
  const participationRate = rsvpTotal > 0 ? (rsvp.yes / rsvpTotal) * 100 : 0;

  const engagement = computeCommunityEngagementMetrics({
    leaderboardItems: approvedActions,
    sourceItems: allItems,
    leaderboardLimit: 8,
  });

  return {
    totalEvents: events.length,
    upcomingEvents: eventUpcoming.length,
    pastEvents: eventPast.length,
    rsvp,
    participationRate,
    ...engagement,
  };
}

function formatAreaLabel(label: string): string {
  const arrondissement = extractArrondissementFromLabel(label);
  return arrondissement === null ? "Hors arrondissement" : `${arrondissement}e`;
}

function computeAreaStats(mapApprovedActions: ActionMapItem[]) {
  const byAreaMap = new Map<string, { actions: number; kg: number; butts: number; labels: Set<string> }>();
  for (const item of mapApprovedActions) {
    const area = formatAreaLabel(mapItemLocationLabel(item));
    const previous = byAreaMap.get(area) ?? {
      actions: 0,
      kg: 0,
      butts: 0,
      labels: new Set<string>(),
    };
    previous.actions += 1;
    previous.kg += (mapItemWasteKg(item) ?? 0);
    previous.butts += (mapItemCigaretteButts(item) ?? 0);
    previous.labels.add(mapItemLocationLabel(item).trim().toLowerCase());
    byAreaMap.set(area, previous);
  }

  const byArea = [...byAreaMap.entries()]
    .map(([area, stats]) => {
      const recurrence = Math.max(0, stats.actions - stats.labels.size);
      const score = stats.kg * 1.4 + stats.actions * 2 + stats.butts * 0.01 + recurrence * 5;
      return {
        area,
        actions: stats.actions,
        kg: stats.kg,
        butts: stats.butts,
        recurrence,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return byArea;
}

export function computeReportModel(input: ReportModelInput): ReportModel {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const allItems = input.allItems;
  const approvedItems = input.approvedItems.filter((item) => item.status === "approved");
  const mapItems = input.mapItems.filter((item) => item.status === "approved");
  const events = input.events;

  const approvedActions = approvedItems.filter((item) => normalizeListType(item) === "action");

  const totals = computeTotals(approvedActions);
  const moderationStats = computeModerationStats(
    allItems,
    input.moderationAvailability ?? "available",
  );
  const mapMetrics = computeMapMetrics(mapItems);
  const qualityMetrics = computeQualityMetrics(approvedActions, nowMs);
  const byArea = computeAreaStats(mapMetrics.mapApprovedActions);
  const communityStats = computeCommunityStats(allItems, approvedActions, events, now);

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
  const monthRows6 = monthRows.slice(-6);
  const monthRows12 = monthRows.slice(-12);
  const routeSteps = buildRouteSteps(mapMetrics.mapApprovedActions, 6);
  const routeDistance = routeSteps.reduce((sum, step) => sum + step.segmentKm, 0);

  const environmental = computeEnvironmentalProxyMetrics(totals.totalButts, totals.totalKg);

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

  const climate6 = {
    actions: sixMonthsItems.length,
    kg: sixMonthsItems.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0),
    butts: sixMonthsItems.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0),
  };
  const climate12 = {
    actions: twelveMonthsItems.length,
    kg: twelveMonthsItems.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0),
    butts: twelveMonthsItems.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0),
  };


  const annualRows = byArea.slice(0, 8).map((row) => [
    row.area,
    toFrInt(row.actions),
    `${toFrNumber(row.kg)} kg`,
    toFrInt(row.butts),
    `${toFrNumber(row.actions > 0 ? row.kg / row.actions : 0, 2)} kg/action`,
  ]);

  const highlightActions = approvedActions
    .filter((item) => (item.contract?.metadata.photos?.length ?? 0) > 0)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.location_label,
      kg: Number(item.waste_kg || 0),
      butts: Number(item.cigarette_butts || 0),
      photos: item.contract?.metadata.photos?.map((p) => p.dataUrl) ?? [],
    }));

  const highlightPhotos: Array<{ url: string; label: string; date: string }> = [];
  highlightActions.forEach((action) => {
    action.photos.slice(0, 2).forEach((photoUrl) => {
      highlightPhotos.push({
        url: photoUrl,
        label: action.label,
        date: approvedActions.find((a) => a.id === action.id)?.action_date ?? "",
      });
    });
  });

  const report = {
    generatedAt: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(now),
    totals: {
      actions: approvedActions.length,
      kg: totals.totalKg,
      butts: totals.totalButts,
      volunteers: totals.totalVolunteers,
      hours: totals.totalHours,
    },
    map: {
      points: mapMetrics.geolocatedCount,
      traces: mapMetrics.traceCount,
      polylines: mapMetrics.polylineCount,
      polygons: mapMetrics.polygonCount,
      geoCoverage: mapMetrics.geoCoverage,
      traceCoverage: mapMetrics.traceCoverage,
    },
    moderation: {
      availability: moderationStats.availability,
      pending: moderationStats.pending,
      approved: moderationStats.approved,
      rejected: moderationStats.rejected,
      conversion: moderationStats.conversion,
      delayDays: moderationStats.delayDays,
    },
    quality: {
      completenessScore: qualityMetrics.completenessScore,
      coherenceScore: qualityMetrics.coherenceScore,
      freshnessDays: qualityMetrics.freshnessDays,
      geolocRate: mapMetrics.geoCoverage,
    },
    areas: byArea,
    trendPercent,
    monthRows6,
    monthRows12,
    routeSteps,
    routeDistance,
    terrain: {
      actionCount: mapMetrics.mapApprovedActions.length,
      spotCount: mapMetrics.mapSpots.length,
      cleanPlaceCount: mapMetrics.mapCleanPlaces.length,
    },
    recycling: {
      recyclableKg: environmental.recyclableKg,
      triIndex: environmental.triIndex,
    },
    climate: {
      six: climate6,
      twelve: climate12,
      waterProtectedLiters: environmental.waterProtectedLiters,
      co2AvoidedKg: environmental.co2AvoidedKg,
    },
    community: communityStats,
    impactMethodology: buildPersonalImpactMethodology(qualityMetrics.pollutionScoreAverage),
    annualRows,
    calendar: buildCalendarRows(now),
    highlightPhotos: highlightPhotos.slice(0, 6),
    highlightActions,
  };

  return {
    ...report,
    executive: buildExecutiveNarrative(report as Parameters<typeof buildExecutiveNarrative>[0]),
  };
}
