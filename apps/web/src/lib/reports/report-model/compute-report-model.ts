import {
  mapItemLocationLabel,
  mapItemType,
} from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality/quality";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";
import {
  computeActionImpactKpis,
  sumActionImpactKpis,
  type ActionImpactInput,
} from "@/lib/actions/impact-calculators";
import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import { computeEventConversions } from "@/lib/community/engagement";
import type {
  ReportModel,
  ReportModelInput,
  ReportModerationAvailability,
} from "./types";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";

import { normalizeListType } from "./helpers";
import { average, median } from "./math";
import { buildCalendarRows, buildExecutiveNarrative } from "./builders";
import {
  computeCommunityEngagementMetrics,
  computeMapCoverageMetrics,
} from "./metrics";
import { computeReportRsvpSummary } from "./community";
import {
  buildReportProjections,
  toActionImpactInput,
} from "./compute-report-model.projections";

function toMapImpactInput(item: ActionMapItem): ActionImpactInput {
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

function computeTotals(approvedActions: ActionListItem[]) {
  const impact = sumActionImpactKpis(approvedActions.map(toActionImpactInput));
  const totalHours = approvedActions.reduce(
    (sum, item) => {
      const impact = computeActionImpactKpis(toActionImpactInput(item));
      const durationMinutes = Number(
        item.contract?.metadata.durationMinutes ?? item.duration_minutes ?? 0,
      );
      return sum + (durationMinutes * Math.max(1, impact.volunteers)) / 60;
    },
    0,
  );
  return {
    totalKg: impact.wasteKg,
    wasteKnownActions: impact.wasteKnownActions,
    totalButts: impact.butts,
    totalVolunteers: impact.volunteers,
    totalHours,
    co2AvoidedKg: impact.co2AvoidedKg,
    waterSavedLiters: impact.waterSavedLiters,
    streetCleaningSavings: impact.streetCleaningSavings,
    euroSaved: impact.euroSaved,
  };
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

type CommunityEvent = CommunityEventItem;

function computeCommunityStats(allItems: ActionListItem[], approvedActions: ActionListItem[], events: CommunityEvent[], now: Date) {
  const eventUpcoming = events.filter((event) => event.eventDate >= now.toISOString().slice(0, 10));
  const eventPast = events.filter((event) => event.eventDate < now.toISOString().slice(0, 10));
  const { rsvp, participationRate } = computeReportRsvpSummary(events);

  const engagement = computeCommunityEngagementMetrics({
    leaderboardItems: approvedActions,
    sourceItems: allItems,
    leaderboardLimit: 8,
  });
  const conversion = computeEventConversions(events, approvedActions).summary;

  return {
    totalEvents: events.length,
    upcomingEvents: eventUpcoming.length,
    pastEvents: eventPast.length,
    rsvp,
    participationRate,
    ...engagement,
    conversion,
  };
}

function formatAreaLabel(label: string): string {
  const arrondissement = extractArrondissementFromLabel(label);
  return arrondissement === null ? "Hors arrondissement" : `${arrondissement}e`;
}

function computeAreaStats(mapApprovedActions: ActionMapItem[]) {
  const byAreaMap = new Map<string, { actions: number; kg: number; knownWasteActions: number; butts: number; labels: Set<string> }>();
  for (const item of mapApprovedActions) {
    const area = formatAreaLabel(mapItemLocationLabel(item));
    const previous = byAreaMap.get(area) ?? {
      actions: 0,
      kg: 0,
      knownWasteActions: 0,
      butts: 0,
      labels: new Set<string>(),
    };
    previous.actions += 1;
    const impact = computeActionImpactKpis(toMapImpactInput(item));
    if (impact.wasteKnown) {
      previous.kg += impact.wasteKg;
      previous.knownWasteActions += 1;
    }
    previous.butts += impact.butts;
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
        knownWasteActions: stats.knownWasteActions,
        butts: stats.butts,
        recurrence,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return byArea;
}

type ReportAssemblyInput = {
  now: Date;
  approvedActions: ActionListItem[];
  totals: ReturnType<typeof computeTotals>;
  moderationStats: ReturnType<typeof computeModerationStats>;
  mapMetrics: ReturnType<typeof computeMapMetrics>;
  qualityMetrics: ReturnType<typeof computeQualityMetrics>;
  byArea: ReturnType<typeof computeAreaStats>;
  communityStats: ReturnType<typeof computeCommunityStats>;
  projections: ReturnType<typeof buildReportProjections>;
};

function buildReportProjectionSections(
  projections: ReportAssemblyInput["projections"],
  now: Date,
) {
  return {
    trendPercent: projections.trendPercent,
    monthRows6: projections.monthRows6,
    monthRows12: projections.monthRows12,
    routeSteps: projections.routeSteps,
    routeDistance: projections.routeDistance,
    annualRows: projections.annualRows,
    calendar: buildCalendarRows(now),
    highlightPhotos: projections.highlightPhotos,
    highlightActions: projections.highlightActions,
  };
}

function buildReportSections(input: ReportAssemblyInput) {
  const { mapMetrics, moderationStats, qualityMetrics, projections, totals } = input;
  return {
    generatedAt: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(input.now),
    totals: {
      actions: input.approvedActions.length,
      kg: totals.totalKg,
      knownWasteActions: totals.wasteKnownActions,
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
    moderation: moderationStats,
    quality: {
      completenessScore: qualityMetrics.completenessScore,
      coherenceScore: qualityMetrics.coherenceScore,
      freshnessDays: qualityMetrics.freshnessDays,
      geolocRate: mapMetrics.geoCoverage,
    },
    areas: input.byArea,
    ...buildReportProjectionSections(projections, input.now),
    terrain: {
      actionCount: mapMetrics.mapApprovedActions.length,
      spotCount: mapMetrics.mapSpots.length,
      cleanPlaceCount: mapMetrics.mapCleanPlaces.length,
    },
    recycling: {
      recyclableKg: projections.environmental.recyclableKg,
      triIndex: projections.environmental.triIndex,
    },
    climate: {
      six: projections.climate6,
      twelve: projections.climate12,
      waterProtectedLiters: totals.waterSavedLiters,
      co2AvoidedKg: totals.co2AvoidedKg,
      streetCleaningSavings: totals.streetCleaningSavings,
      streetCleaningSavingsEuros: totals.euroSaved,
    },
    community: input.communityStats,
    impactMethodology: buildPersonalImpactMethodology(qualityMetrics.pollutionScoreAverage),
  };
}

function assembleReportModel(input: ReportAssemblyInput): ReportModel {
  const report = buildReportSections(input);
  return {
    ...report,
    executive: buildExecutiveNarrative(report as Parameters<typeof buildExecutiveNarrative>[0]),
  };
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
  const projections = buildReportProjections({
    approvedActions,
    mapApprovedActions: mapMetrics.mapApprovedActions,
    byArea,
    nowMs,
    totals,
  });

  return assembleReportModel({
    now,
    approvedActions,
    totals,
    moderationStats,
    mapMetrics,
    qualityMetrics,
    byArea,
    communityStats,
    projections,
  });
}
