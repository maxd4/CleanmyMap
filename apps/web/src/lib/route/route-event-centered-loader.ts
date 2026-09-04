import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidCommunityEventCoordinatePair,
} from "@/lib/community/event-location";
import type { RouteEventCenteredAnchor } from "./route-event-centered";

type RouteEventAnchorRow = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
};

export async function loadRouteEventCenteredAnchor(
  supabase: SupabaseClient,
  eventId: string,
): Promise<RouteEventCenteredAnchor | null> {
  const result = await supabase
    .from("community_events")
    .select("id, title, event_date, location_label, latitude, longitude")
    .eq("id", eventId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = result.data as RouteEventAnchorRow | null;
  if (!row || row.latitude === null || row.longitude === null) {
    return null;
  }
  if (!isValidCommunityEventCoordinatePair(row.latitude, row.longitude)) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}
