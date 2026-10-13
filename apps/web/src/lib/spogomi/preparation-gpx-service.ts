import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGpxFile } from "@/lib/actions/geometry/gpx";
import type { EventRow } from "./preparation-service";

export async function attachOfficialGpx(params: { supabase: SupabaseClient; event: EventRow; userId: string; file: File }) {
  if (params.event.state === "composition_locked") throw new Error("Validation: le parcours ne peut plus être modifié après verrouillage.");
  const parsed = await parseGpxFile(params.file);
  if (parsed.drawing.kind !== "polyline") throw new Error("Validation: le GPX doit fournir une polyligne.");
  const route = {
    source: "official_reference" as const,
    fileName: parsed.metadata.fileName ?? params.file.name,
    pointCount: parsed.metadata.pointCount,
    referenceDistanceKm: parsed.metadata.observedDistanceKm,
    inferredTopology: parsed.metadata.inferredTopology,
    coordinates: parsed.drawing.coordinates,
  };
  const synchronized = await params.supabase.rpc("spogomi_attach_official_gpx", {
    p_event_id: params.event.id,
    p_expected_revision: Number(params.event.composition_revision ?? 0),
    p_file_name: route.fileName,
    p_point_count: route.pointCount,
    p_reference_distance_km: route.referenceDistanceKm,
    p_inferred_topology: route.inferredTopology,
    p_geometry_geojson: { type: "LineString", coordinates: route.coordinates },
    p_actor_clerk_id: params.userId,
  });
  if (synchronized.error) throw synchronized.error;
  return { ...route, synchronization: synchronized.data };
}
