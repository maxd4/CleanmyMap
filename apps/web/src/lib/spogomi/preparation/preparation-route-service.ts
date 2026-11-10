import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGpxFile } from "@/lib/actions/geometry/gpx";
import { toGeoJsonString } from "@/lib/actions/geometry/geometry-core";
import type { ActionDrawing, ActionRouteTopology } from "@/lib/actions/types";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";
import type { EventRow } from "./preparation-service";
import type { SpogomiRouteInput } from "../route-types";

type RouteSynchronization = {
  already_processed: boolean;
  eventId: string;
  actionId: string;
  routeId: string;
  divisionId: string | null;
  routeVersion: number;
  compositionRevision: number;
  source: "official_reference" | "gpx_reference" | "manual_reference";
  fileName: string;
  pointCount: number;
  referenceDistanceKm: number;
  inferredTopology: ActionRouteTopology;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRouteSynchronization(value: unknown): RouteSynchronization {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || typeof value.eventId !== "string" ||
    typeof value.actionId !== "string" || typeof value.routeId !== "string" ||
    (value.divisionId !== null && typeof value.divisionId !== "string") ||
    typeof value.routeVersion !== "number" || !Number.isFinite(value.routeVersion) ||
    typeof value.compositionRevision !== "number" || !Number.isFinite(value.compositionRevision) ||
    !["official_reference", "gpx_reference", "manual_reference"].includes(String(value.source)) ||
    typeof value.fileName !== "string" || typeof value.pointCount !== "number" || !Number.isFinite(value.pointCount) ||
    typeof value.referenceDistanceKm !== "number" || !Number.isFinite(value.referenceDistanceKm) ||
    (value.inferredTopology !== "loop" && value.inferredTopology !== "point_to_point")) {
    throw new Error("La synchronisation du parcours SPOGOMI est invalide.");
  }
  return value as RouteSynchronization;
}

function assertPolyline(drawing: ActionDrawing): asserts drawing is ActionDrawing & { kind: "polyline" } {
  if (drawing.kind !== "polyline" || drawing.coordinates.length < 2) {
    throw new Error("Validation : le parcours doit fournir une polyligne d’au moins deux points.");
  }
}

export async function upsertPlannedRoute(params: {
  supabase: SupabaseClient;
  event: EventRow;
  userId: string;
  input: SpogomiRouteInput;
  expectedRevision?: number;
}) {
  assertPolyline(params.input.drawing);
  if (params.event.state === "composition_locked" || params.event.state === "certified" || params.event.state === "closed") {
    throw new Error("Validation : le parcours ne peut plus être modifié après clôture ou verrouillage.");
  }
  if (params.event.state === "in_progress" && !params.input.correctionReason?.trim()) {
    throw new Error("Validation : un motif est obligatoire pour corriger le parcours pendant l’épreuve.");
  }
  const synchronized = await params.supabase.rpc("spogomi_upsert_planned_route", {
    p_event_id: params.event.id,
    p_division_id: params.input.divisionId,
    p_expected_revision: params.expectedRevision ?? Number(params.event.composition_revision ?? 0),
    p_source: params.input.source,
    p_file_name: params.input.fileName,
    p_point_count: params.input.drawing.coordinates.length,
    p_reference_distance_km: params.input.referenceDistanceKm,
    p_inferred_topology: params.input.inferredTopology,
    p_geometry_geojson: JSON.parse(toGeoJsonString(params.input.drawing) ?? "null"),
    p_change_reason: params.input.correctionReason?.trim() || null,
    p_reference_media_id: params.input.referenceMediaId ?? null,
    p_actor_clerk_id: params.userId,
  });
  if (synchronized.error) throw synchronized.error;
  return { ...params.input, synchronization: parseRouteSynchronization(synchronized.data) };
}

export async function attachOfficialGpx(params: { supabase: SupabaseClient; event: EventRow; userId: string; file: File; divisionId?: string | null; correctionReason?: string | null; expectedRevision?: number }) {
  const parsed = await parseGpxFile(params.file);
  assertPolyline(parsed.drawing);
  return upsertPlannedRoute({
    supabase: params.supabase,
    event: params.event,
    userId: params.userId,
    expectedRevision: params.expectedRevision,
    input: {
      divisionId: params.divisionId ?? null,
      source: "gpx_reference",
      fileName: parsed.metadata.fileName ?? params.file.name,
      drawing: parsed.drawing,
      referenceDistanceKm: parsed.metadata.observedDistanceKm,
      inferredTopology: parsed.metadata.inferredTopology,
      correctionReason: params.correctionReason,
    },
  });
}

export function buildManualRouteInput(params: { drawing: ActionDrawing & { kind: "polyline" }; divisionId: string | null; correctionReason?: string | null; referenceMediaId?: string | null }): SpogomiRouteInput {
  return {
    divisionId: params.divisionId,
    source: "manual_reference",
    fileName: "Parcours dessiné sur la carte",
    drawing: params.drawing,
    referenceDistanceKm: Number(polylineDistanceKm(params.drawing.coordinates).toFixed(3)),
    inferredTopology: "point_to_point",
    correctionReason: params.correctionReason,
    referenceMediaId: params.referenceMediaId,
  };
}
