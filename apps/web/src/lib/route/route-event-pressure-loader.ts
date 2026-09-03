import "server-only";

import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCommunityEventDescription } from "@/lib/community/event-ops";
import {
  buildRouteEventPressureByCandidate,
  isValidRouteEventCoordinatePair,
  ROUTE_EVENT_SIGNAL_HORIZON_DAYS,
  type RouteEventAttendance,
  type RouteEventCandidateLocation,
  type RouteEventRecord,
  type RouteEventSignalContext,
} from "./route-event-pressure";

type RouteEventDatabaseRow = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
};

type RouteEventSnapshot = {
  events: RouteEventRecord[];
  attendanceByEventId: Map<string, RouteEventAttendance>;
};

function todayIsoDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function isoDateDaysFromNow(now: Date, days: number): string {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isoDateDaysAgo(now: Date, days: number): string {
  return isoDateDaysFromNow(now, -days);
}

function toEventRecord(row: RouteEventDatabaseRow): RouteEventRecord {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

async function loadRouteEventSnapshot(
  supabase: SupabaseClient,
): Promise<RouteEventSnapshot> {
  const now = new Date();
  const result = await supabase
    .from("community_events")
    .select("id, title, event_date, location_label, latitude, longitude, description")
    .gte("event_date", isoDateDaysAgo(now, ROUTE_EVENT_SIGNAL_HORIZON_DAYS))
    .lte("event_date", isoDateDaysFromNow(now, 21))
    .order("event_date", { ascending: true })
    .order("id", { ascending: true })
    .limit(560);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const events = (result.data ?? []) as RouteEventDatabaseRow[];
  const attendanceByEventId = new Map<string, RouteEventAttendance>();
  if (events.length === 0) {
    return { events: [], attendanceByEventId };
  }

  const rsvpsResult = await supabase
    .from("event_rsvps")
    .select("event_id, status")
    .in("event_id", events.map((event) => event.id))
    .limit(4000);
  if (rsvpsResult.error) {
    throw new Error(rsvpsResult.error.message);
  }

  for (const event of events) {
    attendanceByEventId.set(event.id, {
      yes: 0,
      maybe: 0,
      no: 0,
      capacityTarget: parseCommunityEventDescription(event.description).ops.capacityTarget,
    });
  }
  for (const row of (rsvpsResult.data ?? []) as Array<{
    event_id: string;
    status: "yes" | "maybe" | "no";
  }>) {
    const attendance = attendanceByEventId.get(row.event_id);
    if (!attendance) continue;
    if (row.status === "yes") attendance.yes += 1;
    if (row.status === "maybe") attendance.maybe += 1;
    if (row.status === "no") attendance.no += 1;
  }

  return {
    events: events.map(toEventRecord),
    attendanceByEventId,
  };
}

function buildRouteEventSignalContext(
  snapshot: RouteEventSnapshot,
  candidates: RouteEventCandidateLocation[],
  now: Date,
): RouteEventSignalContext {
  const today = todayIsoDate(now);
  const completedEvents = snapshot.events.filter((event) => event.eventDate < today);
  const futureEvents = snapshot.events.filter((event) => event.eventDate >= today);
  const geolocatedCompletedEvents = completedEvents.filter((event) =>
    isValidRouteEventCoordinatePair(event.latitude, event.longitude),
  );

  return {
    candidatePressureById: buildRouteEventPressureByCandidate(
      geolocatedCompletedEvents,
      snapshot.attendanceByEventId,
      candidates,
      now,
    ),
    completedEventsConsidered: completedEvents.length,
    geolocatedCompletedEvents: geolocatedCompletedEvents.length,
    eventsWithoutCoordinates:
      completedEvents.length - geolocatedCompletedEvents.length,
    futureEventSignals: futureEvents.slice(0, 3).map(
      (event) =>
        `Événement à venir : ${event.title} (${event.eventDate}) à ${event.locationLabel}, signal d’anticipation distinct.`,
    ),
    sourceAvailable: true,
    warnings: [],
  };
}

export async function loadRouteEventSignalContext(
  supabase: SupabaseClient,
  candidates: RouteEventCandidateLocation[],
  now = new Date(),
): Promise<RouteEventSignalContext> {
  return buildRouteEventSignalContext(
    await loadRouteEventSnapshot(supabase),
    candidates,
    now,
  );
}

export async function loadCachedRouteEventSignalContext(
  getSupabaseClient: () => SupabaseClient,
  candidates: RouteEventCandidateLocation[],
  now = new Date(),
): Promise<RouteEventSignalContext> {
  const cached = unstable_cache(
    async () => loadRouteEventSnapshot(getSupabaseClient()),
    ["route-recommendation-event-snapshot"],
    {
      revalidate: 300,
      tags: ["route-recommendation-event-pressure"],
    },
  );
  return buildRouteEventSignalContext(await cached(), candidates, now);
}
