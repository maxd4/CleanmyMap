import type {
  ActionDrawing,
  ActionPhotoAsset,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResolvedActionOrganizer,
  ResolvedActionParticipant,
} from "@/lib/actions/organizers";
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
import type { ActionQuery } from "@/lib/actions/query";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";

const ACTION_BASE_SELECT_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "created_by_clerk_id",
  "actor_name",
  "action_date",
  "location_label",
  "latitude",
  "longitude",
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_confidence",
  "geometry_source",
  "waste_kg",
  "cigarette_butts",
  "volunteers_count",
  "duration_minutes",
  "notes",
  "status",
] as const;

const ACTION_MODERATION_SELECT_FIELDS = [
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
] as const;

const ACTION_SELECT_FIELDS = [
  ...ACTION_BASE_SELECT_FIELDS,
  ...ACTION_MODERATION_SELECT_FIELDS,
] as const;

const ACTION_SELECT_FIELDS_WITH_PHASE = [
  ...ACTION_SELECT_FIELDS,
  "action_phase",
  "preparation_data",
].join(", ");

const ACTION_SELECT_FIELDS_LEGACY = ACTION_BASE_SELECT_FIELDS.join(", ");

function isMissingActionColumnError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  const normalized = message.toLowerCase();

  return (
    normalized.includes("does not exist") &&
    (normalized.includes("action_phase") ||
      normalized.includes("preparation_data") ||
      normalized.includes("moderation_visibility") ||
      normalized.includes("hidden_at") ||
      normalized.includes("hidden_by_clerk_id") ||
      normalized.includes("hidden_reason"))
  );
}

function normalizeStoredAction(row: StoredAction): StoredAction {
  return {
    ...row,
    waste_kg: Number(row.waste_kg ?? 0),
    cigarette_butts: Number(row.cigarette_butts ?? 0),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
    action_phase: row.action_phase ?? "post_action_complete",
    preparation_data: (row.preparation_data ?? {}) as StoredAction["preparation_data"],
  };
}

function buildActionListQuery(
  query: ActionQuery,
  params: {
    limit: number;
    status: ActionStatus | null;
    floorDate?: string;
    requireCoordinates?: boolean;
  },
  selectFields: string,
) {
  let nextQuery = query
    .select(selectFields)
    .order("action_date", { ascending: false })
    .limit(params.limit);

  if (selectFields.includes("moderation_visibility")) {
    nextQuery = nextQuery.eq("moderation_visibility", "visible");
  }

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
}

async function fetchActionRows(
  supabase: SupabaseClient,
  params: {
    limit: number;
    status: ActionStatus | null;
    floorDate?: string;
    requireCoordinates?: boolean;
  },
): Promise<StoredAction[]> {
  try {
    const rows = await runActionQuery<StoredAction>(supabase, (query) =>
      buildActionListQuery(query, params, ACTION_SELECT_FIELDS_WITH_PHASE),
    );
    return rows.map(normalizeStoredAction);
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    const rows = await runActionQuery<StoredAction>(supabase, (query) =>
      buildActionListQuery(query, params, ACTION_SELECT_FIELDS_LEGACY),
    );
    return rows.map(normalizeStoredAction);
  }
}

async function fetchActionRowById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<StoredAction | null> {
  try {
    const row = await runSingleActionQuery<StoredAction>(supabase, (query) =>
      query
        .select(ACTION_SELECT_FIELDS_WITH_PHASE)
        .eq("id", actionId)
        .maybeSingle(),
    );

    if (!row) {
      return null;
    }

    return normalizeStoredAction(row);
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    const row = await runSingleActionQuery<StoredAction>(supabase, (query) =>
      query.select(ACTION_SELECT_FIELDS_LEGACY).eq("id", actionId).maybeSingle(),
    );

    if (!row) {
      return null;
    }

    return normalizeStoredAction(row);
  }
}

/** @deprecated Use ActionRow from @/types/database */
export type StoredAction = ActionRow;

type PersistedActionNotesPayload = Pick<
  CreateActionPayload,
  | "notes"
  | "submissionMode"
  | "wasteBreakdown"
  | "associationName"
  | "groupJoinEnabled"
  | "placeType"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeStyle"
  | "routeAdjustmentMessage"
  | "visionEstimate"
  | "manualDrawing"
> & {
  photos?: Array<
    Pick<
      ActionPhotoAsset,
      "id" | "name" | "mimeType" | "size" | "width" | "height"
    >
  >;
};

export function resolveActionCreationStatus(
  isAutoApprovedSubmission: boolean,
): ActionStatus {
  return isAutoApprovedSubmission ? "approved" : "pending";
}

export function buildPersistedNotes(
  payload: PersistedActionNotesPayload,
): string | null {
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
  return fetchActionRows(supabase, params);
}

export async function fetchRecentActionsByUser(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<StoredAction[]> {
  try {
    const rows = await runActionQuery<StoredAction>(supabase, (query) =>
      query
        .select(ACTION_SELECT_FIELDS_WITH_PHASE)
        .eq("created_by_clerk_id", params.userId)
        .order("action_date", { ascending: false })
        .limit(params.limit),
    );
    return rows.map(normalizeStoredAction);
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    const rows = await runActionQuery<StoredAction>(supabase, (query) =>
      query
        .select(ACTION_SELECT_FIELDS_LEGACY)
        .eq("created_by_clerk_id", params.userId)
        .order("action_date", { ascending: false })
        .limit(params.limit),
    );
    return rows.map(normalizeStoredAction);
  }
}

export async function loadActionById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<StoredAction | null> {
  return fetchActionRowById(supabase, actionId);
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
  const baseInsert = {
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
  };

  const insertWithPhase = {
    ...baseInsert,
    action_phase: params.payload.actionPhase ?? "post_action_complete",
    preparation_data: params.payload.preparationData ?? {},
  };

  let inserted = await supabase.from("actions").insert(insertWithPhase).select("id").single();

  if (inserted.error && isMissingActionColumnError(inserted.error)) {
    inserted = await supabase.from("actions").insert(baseInsert).select("id").single();
  }

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

type ActionParticipantInsertRow = {
  action_id: string;
  user_id: string;
  joined_at: string;
  participation_status: "pending" | "confirmed";
  participation_source:
    | "group_form"
    | "manual_add"
    | "admin"
    | "admin_override"
    | "import";
};

export function buildInitialActionParticipantRows(params: {
  actionId: string;
  creatorUserId: string;
  organizers: ResolvedActionOrganizer[];
  manualParticipants?: ResolvedActionParticipant[];
  participationSource?: ActionParticipantInsertRow["participation_source"];
}): ActionParticipantInsertRow[] {
  const joinedAt = new Date().toISOString();
  const source = params.participationSource ?? "group_form";
  const rows: ActionParticipantInsertRow[] = [];
  const seenUserIds = new Set<string>();

  for (const organizer of params.organizers) {
    if (seenUserIds.has(organizer.userId)) {
      continue;
    }
    seenUserIds.add(organizer.userId);
    rows.push({
      action_id: params.actionId,
      user_id: organizer.userId,
      joined_at: joinedAt,
      participation_status: "confirmed",
      participation_source: source,
    });
  }

  if (!seenUserIds.has(params.creatorUserId)) {
    seenUserIds.add(params.creatorUserId);
    rows.push({
      action_id: params.actionId,
      user_id: params.creatorUserId,
      joined_at: joinedAt,
      participation_status: "pending",
      participation_source: source,
    });
  }

  for (const participant of params.manualParticipants ?? []) {
    if (seenUserIds.has(participant.userId)) {
      continue;
    }
    seenUserIds.add(participant.userId);
    rows.push({
      action_id: params.actionId,
      user_id: participant.userId,
      joined_at: joinedAt,
      participation_status: "confirmed",
      participation_source: "manual_add",
    });
  }

  return rows;
}

async function insertActionParticipants(
  supabase: SupabaseClient,
  actionId: string,
  rows: ActionParticipantInsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const participantsInserted = await supabase
    .from("action_participants")
    .insert(rows);

  if (participantsInserted.error) {
    await supabase.from("action_organizers").delete().eq("action_id", actionId);
    await supabase.from("actions").delete().eq("id", actionId);
    throw participantsInserted.error;
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
    manualParticipants?: ResolvedActionParticipant[];
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
  await insertActionParticipants(
    supabase,
    actionId,
    buildInitialActionParticipantRows({
      actionId,
      creatorUserId: params.userId,
      organizers: params.organizers,
      manualParticipants: params.manualParticipants ?? [],
    }),
  );
  await recordCreateActionTrainingExample(supabase, { actionId, payload });

  return { id: String(actionId) };
}
