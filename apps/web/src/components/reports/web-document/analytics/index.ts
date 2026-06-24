import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";
import { extractArrondissement } from "@/components/sections/rubriques/helpers";
import type { ReportModel, ReportModelInput } from "../types";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";

import { normalizeListType } from "./helpers";
import { average, median } from "./math";
import { buildRouteSteps, buildMonthRows, buildCalendarRows, buildExecutiveNarrative } from "./builders";
import { toFrInt, toFrNumber } from "./formatters";

export * from "./formatters";
export * from "./math";
export * from "./helpers";
export * from "./builders";

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

function computeModerationStats(allItems: ActionListItem[]) {
  const allStatuses = {
    pending: allItems.filter((item) => item.status === "pending").length,
    approved: allItems.filter((item) => item.status === "approved").length,
    rejected: allItems.filter((item) => item.status === "rejected").length,
  };

  const moderationProcessed = allStatuses.approved + allStatuses.rejected;
  const moderationConversion =
    moderationProcessed > 0 ? (allStatuses.approved / moderationProcessed) * 100 : 0;

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

  return { allStatuses, moderationConversion, delayDays: average(moderationDelayDays) };
}

function computeMapMetrics(mapItems: ActionMapItem[]) {
  const mapApproved = mapItems.filter((item) => item.status === "approved");
  const mapApprovedActions = mapApproved.filter((item) => mapItemType(item) === "action");
  const mapSpots = mapItems.filter((item) => mapItemType(item) === "spot");
  const mapCleanPlaces = mapItems.filter((item) => mapItemType(item) === "clean_place");

  const geolocatedCount = mapApproved.filter((item) => {
    const coordinates = mapItemCoordinates(item);
    return coordinates.latitude !== null && coordinates.longitude !== null;
  }).length;

  const traceCount = mapApproved.filter((item) =>
    Boolean(item.manual_drawing || item.manual_drawing_geojson || item.contract?.geometry.kind !== "point"),
  ).length;
  const polylineCount = mapApproved.filter((item) => {
    const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
    return kind === "polyline";
  }).length;
  const polygonCount = mapApproved.filter((item) => {
    const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
    return kind === "polygon";
  }).length;

  const geoCoverage = mapApproved.length > 0 ? (geolocatedCount / mapApproved.length) * 100 : 0;
  const traceCoverage = mapApproved.length > 0 ? (traceCount / mapApproved.length) * 100 : 0;

  return {
    mapApprovedActions, mapSpots, mapCleanPlaces, geolocatedCount, traceCount, polylineCount, polygonCount, geoCoverage, traceCoverage
  };
}

function computeQualityMetrics(approvedActions: ActionListItem[], nowMs: number) {
  const completenessChecks = approvedActions.map((item) => {
    const hasDate = Boolean(item.action_date);
    const hasLocation = item.location_label.trim().length > 2;
    const hasDuration = Number(item.duration_minutes || 0) > 0;
    const hasVolunteers = Number(item.volunteers_count || 0) > 0;
    const hasWaste = Number(item.waste_kg || 0) >= 0;
    return hasDate && hasLocation && hasDuration && hasVolunteers && hasWaste;
  });
  const completenessScore =
    completenessChecks.length > 0
      ? (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
      : 0;

  const coherenceChecks = approvedActions.map((item) => {
    const waste = Number(item.waste_kg || 0);
    const butts = Number(item.cigarette_butts || 0);
    const volunteers = Number(item.volunteers_count || 0);
    const minutes = Number(item.duration_minutes || 0);
    return waste >= 0 && butts >= 0 && volunteers >= 1 && minutes >= 5;
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

  const leaderboard = [...approvedActions]
    .reduce((map, item) => {
      const actor = item.actor_name?.trim() || "Anonyme";
      const previous = map.get(actor) ?? { actions: 0, kg: 0, butts: 0 };
      map.set(actor, {
        actions: previous.actions + 1,
        kg: previous.kg + Number(item.waste_kg || 0),
        butts: previous.butts + Number(item.cigarette_butts || 0),
      });
      return map;
    }, new Map<string, { actions: number; kg: number; butts: number }>())
    .entries();

  const topLeaderboard = [...leaderboard]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
    .slice(0, 8);

  const badgeConfirmed = topLeaderboard.filter((entry) => entry.actions >= 5).length;
  const badgeExpert = topLeaderboard.filter((entry) => entry.actions >= 10).length;

  const sourceBuckets = allItems.reduce(
    (acc, item) => {
      const source = (item.source ?? item.contract?.source ?? "web_form").toLowerCase();
      if (source.includes("community")) acc.associatif += 1;
      else if (source.includes("admin") || source.includes("import")) acc.institutionnel += 1;
      else acc.citoyen += 1;
      return acc;
    },
    { citoyen: 0, associatif: 0, institutionnel: 0 },
  );

  return {
    totalEvents: events.length,
    upcomingEvents: eventUpcoming.length,
    pastEvents: eventPast.length,
    rsvp,
    participationRate,
    topLeaderboard,
    badgeConfirmed,
    badgeExpert,
    sourceBuckets
  };
}

function computeAreaStats(mapApprovedActions: ActionMapItem[]) {
  const byAreaMap = new Map<string, { actions: number; kg: number; butts: number; labels: Set<string> }>();
  for (const item of mapApprovedActions) {
    const area = extractArrondissement(mapItemLocationLabel(item));
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
  const allItems = input.allItems.filter((item) => item.status === "approved");
  const approvedItems = input.approvedItems.filter((item) => item.status === "approved");
  const mapItems = input.mapItems.filter((item) => item.status === "approved");
  const events = input.events;

  const approvedActions = approvedItems.filter((item) => normalizeListType(item) === "action");

  const totals = computeTotals(approvedActions);
  const moderationStats = computeModerationStats(allItems);
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

  const recyclableKg = totals.totalKg * 0.55;
  const triIndex =
    totals.totalKg > 0 ? Math.max(0, Math.min(100, 100 - (totals.totalButts / Math.max(totals.totalKg, 1)) * 0.7)) : 0;

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

  const waterProtectedLiters = Math.round(totals.totalButts * 500);
  const co2AvoidedKg = totals.totalButts * 0.0014;

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
      ...moderationStats.allStatuses,
      conversion: moderationStats.moderationConversion,
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
    recycling: { recyclableKg, triIndex },
    climate: {
      six: climate6,
      twelve: climate12,
      waterProtectedLiters,
      co2AvoidedKg,
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
