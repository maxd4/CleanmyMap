import type { ActionStatus, CreateActionPayload } from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";
import { DRAWING_NOTE_PREFIX } from "@/lib/actions/drawing";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";

/** @deprecated Use ActionRow from @/types/database */
export type StoredAction = ActionRow;

function buildPersistedNotes(payload: CreateActionPayload): string | null {
  const baseWithMetadata = appendActionMetadataToNotes(payload.notes, {
    submissionMode: payload.submissionMode,
    wasteBreakdown: payload.wasteBreakdown,
    associationName: payload.associationName,
    placeType: payload.placeType,
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
      "id, created_at, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
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
      "id, created_at, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
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

  // Injection automatique de polygone si aucun dessin n'est fourni mais que le lieu est reconnu
  let finalDrawing = payload.manualDrawing;
  if (!finalDrawing || finalDrawing.coordinates.length === 0) {
    const autoDrawing = findMatchingGeometry(payload.locationLabel);
    if (autoDrawing) {
      finalDrawing = autoDrawing;
    }
  }

  const inserted = await supabase
    .from("actions")
    .insert({
      created_by_clerk_id: params.userId,
      actor_name: payload.actorName ?? null,
      action_date: payload.actionDate,
      location_label: payload.locationLabel,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      waste_kg: payload.wasteKg,
      cigarette_butts: payload.cigaretteButts,
      volunteers_count: payload.volunteersCount,
      duration_minutes: payload.durationMinutes,
      notes: buildPersistedNotes({ ...payload, manualDrawing: finalDrawing }),
      status: "pending",
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }
  return { id: String(inserted.data.id) };
}
