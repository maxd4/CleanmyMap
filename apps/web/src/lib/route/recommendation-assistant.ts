import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceToParisArrondissementKm } from "@/lib/geo/paris-arrondissements";
import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";

type StopCandidateInput = {
  label: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  type: "action" | "clean_place" | "spot";
  wasteKg: number;
  butts: number;
};

export type HotspotRecommendation = {
  zoneLabel: string;
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
      "Zone critique proche de toi: impossible a estimer pour le moment.",
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
    .select("id, title, event_date, location_label, capacity_target")
    .gte("event_date", fromDate)
    .lte("event_date", toDate)
    .order("event_date", { ascending: true })
    .limit(280);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const events = (eventsResult.data ?? []) as Array<{
    id: string;
    title: string;
    event_date: string;
    location_label: string;
    capacity_target: number | null;
  }>;
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
        rsvp.yes + rsvp.maybe * 0.5 + Math.min(12, (event.capacity_target ?? 0) / 6);
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
      recentActions: number;
      recentSpots: number;
      totalWasteKg: number;
      totalButts: number;
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
      recentActions: 0,
      recentSpots: 0,
      totalWasteKg: 0,
      totalButts: 0,
    };
    current.latSum += candidate.latitude;
    current.lngSum += candidate.longitude;
    current.count += 1;
    current.totalWasteKg += candidate.wasteKg;
    current.totalButts += candidate.butts;
    if (candidate.observedAt >= recentFloor) {
      if (candidate.type === "spot") {
        current.recentSpots += 1;
      } else {
        current.recentActions += 1;
      }
    }
    byZone.set(key, current);
  }

  return [...byZone.values()]
    .map((zone) => {
      const averageWasteKg = zone.count > 0 ? zone.totalWasteKg / zone.count : 0;
      const averageButts = zone.count > 0 ? zone.totalButts / zone.count : 0;
      const eventPressure =
        zone.arrondissement !== null
          ? params.pressureByArrondissement.get(zone.arrondissement) ?? 0
          : 0;
      const predictedDirtScore =
        zone.recentActions * 6 +
        zone.recentSpots * 10 +
        averageWasteKg * 2.2 +
        averageButts * 0.015 +
        eventPressure * 4;

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
        zone.recentSpots > zone.recentActions
          ? "Signalements frequents et recurrence locale elevee."
          : "Volume d'actions/megots + pression evenementielle a surveiller.";

      return {
        zoneLabel: zone.zoneLabel,
        predictedDirtScore: Number(predictedDirtScore.toFixed(1)),
        recentActions: zone.recentActions,
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
        ? `Zone critique proche de toi: ${topHotspot.zoneLabel} (${topHotspot.distanceKm} km).`
        : `Zone critique proche de toi: ${topHotspot.zoneLabel}.`
      : "Zone critique proche de toi: donnees locales insuffisantes.",
    mostUsefulAction: topStop
      ? `Action la plus utile en ce moment: intervenir sur ${topStop.label} (score ${topStop.score.toFixed(1)}).`
      : "Action la plus utile en ce moment: renforcer la collecte de donnees geolocalisees.",
    predictedDirtyZones: params.hotspots
      .slice(0, 3)
      .map(
        (zone) =>
          `${zone.zoneLabel}: risque ${zone.predictedDirtScore.toFixed(1)} (actions ${zone.recentActions}, spots ${zone.recentSpots}, pression evenement ${zone.eventPressure.toFixed(1)}).`,
      ),
    eventAnticipation: params.eventSignals,
    hotspots: params.hotspots,
  };
}

export function defaultRouteRecommendationFloorDate(): string {
  return isoDateDaysAgo(120);
}

