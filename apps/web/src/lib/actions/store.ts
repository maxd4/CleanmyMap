import type {
  ActionDrawing,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedActionOrganizer } from "@/lib/actions/organizers";
import { DRAWING_NOTE_PREFIX } from "@/lib/actions/drawing";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/derived-geometry";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import { computeButtsCount } from "@/lib/actions/impact-calculators";
import {
  buildTrainingExampleInsert,
  recordTrainingExample,
} from "@/lib/actions/training";
import { logFailure } from "@/lib/logging/failure-log";
import { runActionQuery } from "@/lib/actions/query";

/** @deprecated Use ActionRow from @/types/database */
export type StoredAction = ActionRow;

export function resolveActionCreationStatus(
  isAutoApprovedSubmission: boolean,
): ActionStatus {
  return isAutoApprovedSubmission ? "approved" : "pending";
}

export function buildPersistedNotes(payload: CreateActionPayload): string | null {
  const baseWithMetadata = appendActionMetadataToNotes(payload.notes, {
    submissionMode: payload.submissionMode,
    wasteBreakdown: payload.wasteBreakdown,
    associationName: payload.associationName,
    groupJoinEnabled: payload.groupJoinEnabled,
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

export function resolvePersistedCigaretteButts(
  payload: CreateActionPayload,
): number {
  const megotsKg = payload.wasteBreakdown?.megotsKg ?? null;
  const megotsCondition = payload.wasteBreakdown?.megotsCondition ?? "propre";

  if (typeof megotsKg === "number" && Number.isFinite(megotsKg) && megotsKg > 0) {
    return computeButtsCount(megotsKg, megotsCondition);
  }

  if (typeof payload.cigaretteButtsCount === "number" && Number.isFinite(payload.cigaretteButtsCount)) {
    return Math.max(0, Math.trunc(payload.cigaretteButtsCount));
  }

  return Math.max(0, Math.trunc(payload.cigaretteButts));
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
  const rows = await runActionQuery<StoredAction>(supabase, (query) => {
    let nextQuery = query
      .select(
        "id, created_at, updated_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
      )
      .order("action_date", { ascending: false })
      .limit(params.limit);

    if (params.status) {
      nextQuery = nextQuery.eq("status", params.status);
    }
    if (params.floorDate) {
      nextQuery = nextQuery.gte("action_date", params.floorDate);
    }
    if (params.requireCoordinates) {
      nextQuery = nextQuery.not("latitude", "is", null).not("longitude", "is", null);
    }
    return nextQuery;
  });
  return rows.map((row) => ({
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
  const rows = await runActionQuery<StoredAction>(supabase, (query) =>
    query
      .select(
        "id, created_at, updated_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
      )
      .eq("created_by_clerk_id", params.userId)
      .order("action_date", { ascending: false })
      .limit(params.limit),
  );

  return rows.map((row) => ({
    ...row,
    waste_kg: Number(row.waste_kg ?? 0),
    cigarette_butts: Number(row.cigarette_butts ?? 0),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
  }));
}

async function resolveCreateActionDrawing(
  payload: CreateActionPayload,
): Promise<ActionDrawing | null> {
  const manualDrawing = payload.manualDrawing ?? null;
  if (manualDrawing && manualDrawing.coordinates.length > 0) {
    return manualDrawing;
  }

  return (
    (await deriveAutoDrawingFromLocation({
      locationLabel: payload.locationLabel,
      departureLocationLabel: payload.departureLocationLabel,
      arrivalLocationLabel: payload.arrivalLocationLabel,
      routeStyle: payload.routeStyle,
    })) ?? null
  );
}

function buildCreateActionGeometry(
  payload: CreateActionPayload,
  finalDrawing: ActionDrawing | null,
) {
  return buildPersistedGeometry({
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
}

async function insertCreatedAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
    finalDrawing: ActionDrawing | null;
    status: ActionStatus | undefined;
  },
): Promise<string> {
  const inserted = await supabase
    .from("actions")
    .insert({
      created_by_clerk_id: params.userId,
      actor_name: params.payload.actorName ?? null,
      action_date: params.payload.actionDate,
      location_label: params.payload.locationLabel,
      latitude: params.payload.latitude ?? null,
      longitude: params.payload.longitude ?? null,
      derived_geometry_kind: params.persistedGeometry.kind,
      derived_geometry_geojson: params.persistedGeometry.geojson,
      geometry_confidence: params.persistedGeometry.confidence,
      geometry_source: params.persistedGeometry.geometrySource,
      waste_kg: params.payload.wasteKg,
      cigarette_butts: resolvePersistedCigaretteButts(params.payload),
      volunteers_count: params.payload.volunteersCount,
      duration_minutes: params.payload.durationMinutes,
      notes: buildPersistedNotes({
        ...params.payload,
        manualDrawing: params.finalDrawing ?? undefined,
      }),
      status: params.status ?? "pending",
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data.id;
}

async function insertActionOrganizers(
  supabase: SupabaseClient,
  actionId: string,
  organizers: ResolvedActionOrganizer[],
): Promise<void> {
  if (organizers.length === 0) {
    throw new Error("At least one organizer is required for action creation.");
  }

  const organizerRows = organizers.map((organizer, index) => ({
    action_id: actionId,
    organizer_clerk_id: organizer.userId,
    organizer_label: organizer.displayName,
    organizer_handle: organizer.handle,
    is_primary: organizer.isPrimary || index === 0,
  }));

  const organizersInserted = await supabase
    .from("action_organizers")
    .insert(organizerRows);

  if (organizersInserted.error) {
    await supabase.from("actions").delete().eq("id", actionId);
    throw organizersInserted.error;
  }
}

async function recordCreateActionTrainingExample(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    payload: CreateActionPayload;
  },
): Promise<void> {
  try {
    const trainingExample = buildTrainingExampleInsert({
      actionId: params.actionId,
      photos: params.payload.photos ?? null,
      realWeightKg: params.payload.wasteKg ?? null,
      visionEstimate: params.payload.visionEstimate ?? null,
      metadata: {
        departureLocationLabel: params.payload.departureLocationLabel ?? null,
        arrivalLocationLabel: params.payload.arrivalLocationLabel ?? null,
        placeType: params.payload.placeType ?? null,
        submissionMode: params.payload.submissionMode ?? null,
      },
    });
    await recordTrainingExample(supabase, trainingExample);
  } catch (trainingError) {
    logFailure("Actions/Create", "Training example creation failed", trainingError, {
      actionId: params.actionId,
    });
  }
}

export async function createAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    organizers: ResolvedActionOrganizer[];
  status?: ActionStatus;
  },
): Promise<{ id: string }> {
  const payload = params.payload;

  const finalDrawing = await resolveCreateActionDrawing(payload);
  const persistedGeometry = buildCreateActionGeometry(payload, finalDrawing);
  const actionId = await insertCreatedAction(supabase, {
    userId: params.userId,
    payload,
    persistedGeometry,
    finalDrawing,
    status: params.status,
  });

  await insertActionOrganizers(supabase, actionId, params.organizers);
  await recordCreateActionTrainingExample(supabase, { actionId, payload });

  return { id: String(actionId) };
}
