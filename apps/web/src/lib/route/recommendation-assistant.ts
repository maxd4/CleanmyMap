import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCommunityEventDescription } from "@/lib/community/event-ops";
import { distanceToParisArrondissementKm } from "@/lib/geo/paris-arrondissements";
import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";

type StopCandidateInput = {
  label: string;
  latitude: number;
  longitude: number;
  observedAt: string;
};

export type HotspotRecommendation = {
  zoneLabel: string;
  /** Historical HTTP field name; value is now an operational signal, not severity. */
  predictedDirtScore: number;
  recentActions: number;
  recentSpots: number;
  eventPressure: number;
  distanceKm: number | null;
  reason: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDateDaysFromNow(days: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + days);
  return now.toISOString().slice(0, 10);
}

function isoDateDaysAgo(days: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  return now.toISOString().slice(0, 10);
}

function parseArrondissementFromLabel(label: string): number | null {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
  if (!matched) {
    return null;
  }
  const parsed = Number.parseInt(matched[1] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }
  return parsed;
}

function buildZoneLabel(label: string, arrondissement: number | null): string {
  if (arrondissement !== null) {
    return `Paris ${arrondissement}e`;
  }
  return label.trim() || "Zone non precisee";
}

function isParisArrondissement(value: number | null): value is ParisArrondissement {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 20;
}

export function defaultRouteAssistantPayload() {
  return {
    actNow: "Tu devrais agir ici aujourd'hui: aucun point geolocalise disponible.",
    criticalNearby:
      "Point prioritaire proche de toi: impossible a estimer pour le moment.",
    mostUsefulAction:
      "Action la plus utile en ce moment: declarer des actions geolocalisees.",
    predictedDirtyZones: [] as string[],
    eventAnticipation: [] as string[],
    hotspots: [] as HotspotRecommendation[],
  };
}

export async function loadEventPressureByArrondissement(
  supabase: SupabaseClient,
): Promise<{
  pressureByArrondissement: Map<number, number>;
  eventSignals: string[];
}> {
  const fromDate = todayIsoDate();
  const toDate = isoDateDaysFromNow(21);
  const eventsResult = await supabase
    .from("community_events")
    .select("id, title, event_date, location_label, description")
    .gte("event_date", fromDate)
    .lte("event_date", toDate)
    .order("event_date", { ascending: true })
    .limit(280);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const events = ((eventsResult.data ?? []) as Array<{
    id: string;
    title: string;
    event_date: string;
    location_label: string;
    description: string | null;
  }>).map((event) => ({
    ...event,
    capacityTarget: parseCommunityEventDescription(event.description).ops.capacityTarget,
  }));
  if (events.length === 0) {
    return { pressureByArrondissement: new Map(), eventSignals: [] };
  }

  const eventIds = events.map((event) => event.id);
  const rsvpsResult = await supabase
    .from("event_rsvps")
    .select("event_id, status")
    .in("event_id", eventIds)
    .limit(4000);

  if (rsvpsResult.error) {
    throw new Error(rsvpsResult.error.message);
  }

  const rsvpByEventId = new Map<
    string,
    { yes: number; maybe: number; no: number }
  >();
  for (const row of (rsvpsResult.data ?? []) as Array<{
    event_id: string;
    status: "yes" | "maybe" | "no";
  }>) {
    const current = rsvpByEventId.get(row.event_id) ?? {
      yes: 0,
      maybe: 0,
      no: 0,
    };
    if (row.status === "yes") current.yes += 1;
    if (row.status === "maybe") current.maybe += 1;
    if (row.status === "no") current.no += 1;
    rsvpByEventId.set(row.event_id, current);
  }

  const pressureByArrondissement = new Map<number, number>();
  const eventSignals = events
    .map((event) => {
      const arrondissement = parseArrondissementFromLabel(event.location_label);
      const rsvp = rsvpByEventId.get(event.id) ?? { yes: 0, maybe: 0, no: 0 };
      const attendancePressure =
        rsvp.yes + rsvp.maybe * 0.5 + Math.min(12, (event.capacityTarget ?? 0) / 6);
      if (arrondissement !== null) {
        const previous = pressureByArrondissement.get(arrondissement) ?? 0;
        pressureByArrondissement.set(
          arrondissement,
          Number((previous + attendancePressure).toFixed(2)),
        );
      }
      return {
        label: event.location_label,
        title: event.title,
        date: event.event_date,
        pressure: attendancePressure,
      };
    })
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 3)
    .map(
      (event) =>
        `Anticiper ${event.title} (${event.date}) a ${event.label}: pression estimee ${event.pressure.toFixed(1)}.`,
    );

  return {
    pressureByArrondissement,
    eventSignals,
  };
}

export async function loadCachedEventPressureByArrondissement(
  getSupabaseClient: () => SupabaseClient,
): Promise<{
  pressureByArrondissement: Map<number, number>;
  eventSignals: string[];
}> {
  const cached = unstable_cache(
    async () => loadEventPressureByArrondissement(getSupabaseClient()),
    ["route-recommendation-event-pressure"],
    {
      revalidate: 300,
      tags: ["route-recommendation-event-pressure"],
    },
  );

  return cached();
}

export function buildHotspots(params: {
  candidates: StopCandidateInput[];
  pressureByArrondissement: Map<number, number>;
  userArrondissement: number | null;
}): HotspotRecommendation[] {
  const recentFloor = isoDateDaysAgo(45);
  const byZone = new Map<
    string,
    {
      zoneLabel: string;
      arrondissement: number | null;
      latSum: number;
      lngSum: number;
      count: number;
      recentSpots: number;
      freshnessTotal: number;
    }
  >();

  for (const candidate of params.candidates) {
    const arrondissement = parseArrondissementFromLabel(candidate.label);
    const key = arrondissement !== null ? `arr:${arrondissement}` : `zone:${candidate.label.toLowerCase()}`;
    const current = byZone.get(key) ?? {
      zoneLabel: buildZoneLabel(candidate.label, arrondissement),
      arrondissement,
      latSum: 0,
      lngSum: 0,
      count: 0,
      recentSpots: 0,
      freshnessTotal: 0,
    };
    current.latSum += candidate.latitude;
    current.lngSum += candidate.longitude;
    current.count += 1;
    const ageDays = Math.max(
      0,
      (Date.now() - new Date(candidate.observedAt).getTime()) / 86_400_000,
    );
    current.freshnessTotal += Math.max(0, 1 - ageDays / 45);
    if (candidate.observedAt >= recentFloor) {
      current.recentSpots += 1;
    }
    byZone.set(key, current);
  }

  return [...byZone.values()]
    .map((zone) => {
      const averageFreshness =
        zone.count > 0 ? zone.freshnessTotal / zone.count : 0;
      const eventPressure =
        zone.arrondissement !== null
          ? params.pressureByArrondissement.get(zone.arrondissement) ?? 0
          : 0;
      // Kept under the historical response field name for HTTP compatibility.
      // This is an operational signal (validated spot freshness/count and
      // event pressure), not an environmental severity estimate.
      const predictedDirtScore = Math.min(
        10,
        zone.recentSpots * 1.5 + averageFreshness * 4 + eventPressure * 0.2,
      );

      const avgLat = zone.latSum / Math.max(1, zone.count);
      const avgLng = zone.lngSum / Math.max(1, zone.count);
      const distanceFromUserArrondissement =
        isParisArrondissement(params.userArrondissement)
          ? distanceToParisArrondissementKm(
              avgLat,
              avgLng,
              params.userArrondissement,
            )
          : null;
      const reason =
        "Signalements valides recents et arbitrage operationnel a surveiller.";

      return {
        zoneLabel: zone.zoneLabel,
        predictedDirtScore: Number(predictedDirtScore.toFixed(1)),
        recentActions: 0,
        recentSpots: zone.recentSpots,
        eventPressure: Number(eventPressure.toFixed(1)),
        distanceKm:
          distanceFromUserArrondissement === null
            ? null
            : Number(distanceFromUserArrondissement.toFixed(1)),
        reason,
      };
    })
    .sort((a, b) => b.predictedDirtScore - a.predictedDirtScore)
    .slice(0, 5);
}

export function buildProactiveAssistant(params: {
  stops: Array<{ label: string; score: number }>;
  hotspots: HotspotRecommendation[];
  eventSignals: string[];
}): {
  actNow: string;
  criticalNearby: string;
  mostUsefulAction: string;
  predictedDirtyZones: string[];
  eventAnticipation: string[];
  hotspots: HotspotRecommendation[];
} {
  const topStop = params.stops[0];
  const topHotspot = [...params.hotspots]
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, 1)[0];

  return {
    actNow: topStop
      ? `Tu devrais agir ici aujourd'hui: ${topStop.label}.`
      : "Tu devrais agir ici aujourd'hui: aucun point prioritaire n'a ete identifie.",
    criticalNearby: topHotspot
      ? topHotspot.distanceKm !== null && topHotspot.distanceKm <= 4
        ? `Point prioritaire proche de toi: ${topHotspot.zoneLabel} (${topHotspot.distanceKm} km).`
        : `Point prioritaire proche de toi: ${topHotspot.zoneLabel}.`
      : "Point prioritaire proche de toi: donnees locales insuffisantes.",
    mostUsefulAction: topStop
      ? `Intervention la plus utile en ce moment: ${topStop.label} (score operationnel ${topStop.score.toFixed(1)}).`
      : "Intervention la plus utile en ce moment: renforcer la collecte de donnees geolocalisees.",
    predictedDirtyZones: params.hotspots
      .slice(0, 3)
      .map(
        (zone) =>
          `${zone.zoneLabel}: signal operationnel ${zone.predictedDirtScore.toFixed(1)}/10 (actions legacy ${zone.recentActions}, spots valides ${zone.recentSpots}, pression evenement ${zone.eventPressure.toFixed(1)}).`,
      ),
    eventAnticipation: params.eventSignals,
    hotspots: params.hotspots,
  };
}

export function defaultRouteRecommendationFloorDate(): string {
  return isoDateDaysAgo(120);
}
