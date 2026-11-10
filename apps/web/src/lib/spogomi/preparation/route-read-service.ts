import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpogomiRouteProjection } from "../route-types";
import { selectSpogomiRouteForDivision } from "../route-types";

export async function loadSpogomiRouteByDivision(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string | null;
}): Promise<SpogomiRouteProjection | null> {
  const query = params.supabase
    .from("spogomi_event_routes")
    .select("id, event_id, action_id, division_id, source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson, route_version, last_change_reason, reference_media_id, updated_at, created_at")
    .eq("event_id", params.eventId);
  const result = await query.order("division_id", { ascending: true, nullsFirst: true });
  if (result.error) throw result.error;
  return selectSpogomiRouteForDivision((result.data ?? []) as SpogomiRouteProjection[], params.divisionId);
}
