import type {
  ActionDrawing,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DRAWING_NOTE_PREFIX } from "@/lib/actions/drawing";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/derived-geometry";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import {
  buildTrainingExampleInsert,
  recordTrainingExample,
} from "@/lib/actions/training";

/** @deprecated Use ActionRow from @/types/database */
export type StoredAction = ActionRow;

function buildPersistedNotes(payload: CreateActionPayload): string | null {
  const baseWithMetadata = appendActionMetadataToNotes(payload.notes, {
    submissionMode: payload.submissionMode,
    wasteBreakdown: payload.wasteBreakdown,
    associationName: payload.associationName,
    placeType: payload.placeType,
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    photos: payload.photos,
    visionEstimate: payload.visionEstimate,
  });
  const base = baseWithMetadata?.trim() ?? "";
  if (!payload.manualDrawing) {
    return base || null;
  }

  const drawingJson = JSON.stringify({
    kind: payload.manualDrawing.kind,
    coordinates: payload.manualDrawing.coordinates,
  });
  return base
    ? `${base}\n${DRAWING_NOTE_PREFIX}${drawingJson}`
    : `${DRAWING_NOTE_PREFIX}${drawingJson}`;
}

export async function fetchActions(
  supabase: SupabaseClient,
  params: {
    limit: number;
    status: ActionStatus | null;
    floorDate?: string;
    requireCoordinates?: boolean;
  },
): Promise<StoredAction[]> {
  let query = supabase
    .from("actions")
    .select(
      "id, created_at, updated_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
    )
    .order("action_date", { ascending: false })
    .limit(params.limit);

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.floorDate) {
    query = query.gte("action_date", params.floorDate);
  }
  if (params.requireCoordinates) {
    query = query.not("latitude", "is", null).not("longitude", "is", null);
  }

  const result = await query;
  if (result.error) {
    throw result.error;
  }
  return ((result.data as StoredAction[] | null) ?? []).map((row) => ({
    ...row,
    waste_kg: Number(row.waste_kg ?? 0),
    cigarette_butts: Number(row.cigarette_butts ?? 0),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
  }));
}

export async function fetchRecentActionsByUser(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<StoredAction[]> {
  const result = await supabase
    .from("actions")
    .select(
      "id, created_at, updated_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
    )
    .eq("created_by_clerk_id", params.userId)
    .order("action_date", { ascending: false })
    .limit(params.limit);

  if (result.error) {
    throw result.error;
  }

  return ((result.data as StoredAction[] | null) ?? []).map((row) => ({
    ...row,
    waste_kg: Number(row.waste_kg ?? 0),
    cigarette_butts: Number(row.cigarette_butts ?? 0),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
  }));
}

export async function createAction(
  supabase: SupabaseClient,
  params: { userId: string; payload: CreateActionPayload },
): Promise<{ id: string }> {
  const payload = params.payload;

  // Injection automatique de géométrie si aucun dessin manuel n'est fourni.
  let finalDrawing: ActionDrawing | null = payload.manualDrawing ?? null;
  if (!finalDrawing || finalDrawing.coordinates.length === 0) {
    finalDrawing =
      (await deriveAutoDrawingFromLocation({
        locationLabel: payload.locationLabel,
        departureLocationLabel: payload.departureLocationLabel,
        arrivalLocationLabel: payload.arrivalLocationLabel,
        routeStyle: payload.routeStyle,
      })) ?? null;
  }
  const persistedGeometry = buildPersistedGeometry({
    drawing: finalDrawing,
    geojson: finalDrawing ? toGeoJsonString(finalDrawing) : null,
    confidence: finalDrawing
      ? payload.manualDrawing
        ? GEOMETRY_CONFIDENCE.MANUAL_DRAWING
        : GEOMETRY_CONFIDENCE.AUTO_ROUTE
      : GEOMETRY_CONFIDENCE.POINT_FALLBACK,
    geometrySourceHint: finalDrawing
      ? payload.manualDrawing
        ? "manual"
        : "routed"
      : "fallback_point",
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    locationLabel: payload.locationLabel,
    departureLocationLabel: payload.departureLocationLabel ?? null,
    arrivalLocationLabel: payload.arrivalLocationLabel ?? null,
    routeStyle: payload.routeStyle ?? null,
  });

  const inserted = await supabase
    .from("actions")
    .insert({
      created_by_clerk_id: params.userId,
      actor_name: payload.actorName ?? null,
      action_date: payload.actionDate,
      location_label: payload.locationLabel,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      derived_geometry_kind: persistedGeometry.kind,
      derived_geometry_geojson: persistedGeometry.geojson,
      geometry_confidence: persistedGeometry.confidence,
      geometry_source: persistedGeometry.geometrySource,
      waste_kg: payload.wasteKg,
      cigarette_butts: payload.cigaretteButts,
      volunteers_count: payload.volunteersCount,
      duration_minutes: payload.durationMinutes,
      notes: buildPersistedNotes({
        ...payload,
        manualDrawing: finalDrawing ?? undefined,
      }),
      status: "pending",
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  const trainingExample = buildTrainingExampleInsert({
    actionId: String(inserted.data.id),
    photos: payload.photos ?? null,
    realWeightKg: payload.wasteKg ?? null,
    visionEstimate: payload.visionEstimate ?? null,
    metadata: {
      departureLocationLabel: payload.departureLocationLabel ?? null,
      arrivalLocationLabel: payload.arrivalLocationLabel ?? null,
      placeType: payload.placeType ?? null,
      submissionMode: payload.submissionMode ?? null,
    },
  });
  await recordTrainingExample(supabase, trainingExample);

  return { id: String(inserted.data.id) };
}
