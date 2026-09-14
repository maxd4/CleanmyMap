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
} from "@/lib/actions/participation/organizers";
import {
  buildInitialActionParticipantRows,
  insertActionOrganizers,
  insertActionParticipants,
} from "./store-participants";
export { buildInitialActionParticipantRows } from "./store-participants";
import type { ActionMapViewportQuery } from "@/lib/actions/types";
import { DRAWING_NOTE_PREFIX } from "@/lib/actions/geometry/drawing";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/geometry/derived-geometry";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/geometry/route-geometry";
import {
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import {
  normalizeVolunteerParticipation,
  resolveParticipantsCount,
  type ActionVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";
import {
  buildTrainingExampleInsert,
  recordTrainingExample,
} from "@/lib/actions/training";
import { logFailure } from "@/lib/logging/failure-log";
import type { ActionQuery } from "@/lib/actions/query";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { evaluateRepollutionPredictionBeforeObservation } from "@/lib/actions/pollution/repollution-prediction-evaluation";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { persistRepollutionPredictionEvaluation } from "@/lib/actions/pollution/repollution-prediction-evaluation-store";
import {
  resolveActionDepartmentForPersistence,
  resolveTrustedActionDepartmentForPersistence,
} from "@/lib/geo/action-department-resolver";
import { isPublishedFuturePreAction } from "./temporal";

const ACTION_BASE_SELECT_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "created_by_clerk_id",
  "actor_name",
  "organizer_type",
  "action_date",
  "location_label",
  "department_code",
  "department_name",
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
  "event_start_time",
  "event_end_time",
  "notes",
  "status",
  "published_at",
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

const ACTION_SELECT_FIELDS_LEGACY = ACTION_BASE_SELECT_FIELDS
  .filter((field) => field !== "published_at")
  .join(", ");
const ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT = ACTION_BASE_SELECT_FIELDS
  .filter(
    (field) =>
      field !== "department_code" &&
      field !== "department_name" &&
      field !== "event_start_time" &&
      field !== "event_end_time" &&
      field !== "published_at",
  )
  .join(", ");

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
      normalized.includes("hidden_reason") ||
      normalized.includes("department_code") ||
      normalized.includes("department_name") ||
      normalized.includes("event_start_time") ||
      normalized.includes("event_end_time") ||
      normalized.includes("published_at"))
  );
}

function normalizeStoredAction(row: ActionRow): ActionRow {
  return {
    ...row,
    department_code: row.department_code ?? null,
    department_name: row.department_name ?? null,
    waste_kg: normalizeNullableStoredNumber(row.waste_kg),
    cigarette_butts: normalizeNullableStoredNumber(row.cigarette_butts),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
    action_phase: row.action_phase ?? "post_action_complete",
    preparation_data: (row.preparation_data ?? {}) as ActionRow["preparation_data"],
  };
}

function normalizeNullableStoredNumber(value: number | null): number | null {
  return value === null || !Number.isFinite(Number(value)) ? null : Number(value);
}

function buildActionListQuery(
  query: ActionQuery,
  params: {
    limit: number;
    status: ActionStatus | null;
    includeFuturePublicActions?: boolean;
    futureOnly?: boolean;
    floorDate?: string;
    requireCoordinates?: boolean;
    viewport?: ActionMapViewportQuery;
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

  if (params.includeFuturePublicActions && params.status === "approved") {
    const today = new Date().toISOString().slice(0, 10);
    nextQuery = nextQuery.or(
      `and(status.eq.approved,action_phase.neq.pre_action),and(action_phase.eq.pre_action,published_at.not.is.null,status.in.(approved,pending),action_date.gte.${today})`,
    );
  } else if (params.status === "approved" && selectFields.includes("action_phase")) {
    // Public approved reads must never expose an unclassified/private
    // pre-action, including one auto-approved for an admin creator.
    nextQuery = nextQuery.eq("status", "approved").or("action_phase.neq.pre_action");
  } else if (params.status) {
    nextQuery = nextQuery.eq("status", params.status);
  }
  if (params.floorDate) {
    nextQuery = nextQuery.gte("action_date", params.floorDate);
  }
  if (params.requireCoordinates) {
    nextQuery = nextQuery.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (params.viewport) {
    nextQuery = nextQuery
      .gte("latitude", params.viewport.south)
      .lte("latitude", params.viewport.north)
      .gte("longitude", params.viewport.west)
      .lte("longitude", params.viewport.east);
  }

  return nextQuery;
}

async function fetchActionRows(
  supabase: SupabaseClient,
  params: {
    limit: number;
    status: ActionStatus | null;
    includeFuturePublicActions?: boolean;
    futureOnly?: boolean;
    floorDate?: string;
    requireCoordinates?: boolean;
    viewport?: ActionMapViewportQuery;
  },
): Promise<ActionRow[]> {
  try {
    const rows = await runActionQuery<ActionRow>(supabase, (query) =>
      buildActionListQuery(query, params, ACTION_SELECT_FIELDS_WITH_PHASE),
    );
    const normalized = rows.map(normalizeStoredAction);
    return params.futureOnly
      ? normalized.filter((row) => isPublishedFuturePreAction(row))
      : normalized;
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    try {
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        buildActionListQuery(
          query,
          { ...params, includeFuturePublicActions: false },
          ACTION_SELECT_FIELDS_LEGACY,
        ),
      );
      const normalized = rows.map(normalizeStoredAction);
      return params.futureOnly
        ? normalized.filter((row) => isPublishedFuturePreAction(row))
        : normalized;
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        buildActionListQuery(
          query,
          { ...params, includeFuturePublicActions: false },
          ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT,
        ),
      );
      const normalized = rows.map(normalizeStoredAction);
      return params.futureOnly
        ? normalized.filter((row) => isPublishedFuturePreAction(row))
        : normalized;
    }
  }
}

async function fetchActionRowById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRow | null> {
  try {
    const row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
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

    let row: ActionRow | null;
    try {
      row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
        query.select(ACTION_SELECT_FIELDS_LEGACY).eq("id", actionId).maybeSingle(),
      );
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT)
          .eq("id", actionId)
          .maybeSingle(),
      );
    }

    if (!row) {
      return null;
    }

    return normalizeStoredAction(row);
  }
}

type PersistedActionNotesPayload = Partial<Pick<
  CreateActionPayload,
  | "notes"
  | "submissionMode"
  | "wasteBreakdown"
  | "wasteMeasurementMethod"
  | "cigaretteButtsKg"
  | "cigaretteButtsMeasurements"
  | "associationName"
  | "groupJoinEnabled"
  | "placeType"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeStyle"
  | "routeAdjustmentMessage"
  | "visionEstimate"
  | "manualDrawing"
  | "cigaretteButts"
  | "cigaretteButtsCount"
  | "cigaretteButtsMassKg"
  | "cigaretteButtsVolumeLiters"
  | "cigaretteButtsCondition"
  | "volunteerParticipation"
>> & {
  photos?: Array<
    Pick<
      ActionPhotoAsset,
      "id" | "name" | "mimeType" | "size" | "width" | "height"
    >
  >;
};

type PersistedActionNotesOptions = {
  /** Internal server resolution; never sourced from an HTTP payload. */
  resolvedCigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
};

export function resolveActionCreationStatus(
  isAutoApprovedSubmission: boolean,
): ActionStatus {
  return isAutoApprovedSubmission ? "approved" : "pending";
}

export function buildPersistedNotes(
  payload: PersistedActionNotesPayload,
  options: PersistedActionNotesOptions = {},
): string | null {
  const cigaretteButtsMeasurements =
    options.resolvedCigaretteButtsMeasurements !== undefined
      ? options.resolvedCigaretteButtsMeasurements
      : resolveActionCigaretteButtsMeasurements(payload);
  const baseWithMetadata = appendActionMetadataToNotes(payload.notes, {
    submissionMode: payload.submissionMode,
    wasteBreakdown: payload.wasteBreakdown,
    wasteMeasurementMethod: payload.wasteMeasurementMethod ?? undefined,
    cigaretteButtsKg: payload.cigaretteButtsKg,
    cigaretteButtsMeasurements,
    volunteerParticipation: resolveActionVolunteerParticipation(payload),
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

function resolveActionVolunteerParticipation(
  payload: Partial<Pick<CreateActionPayload, "volunteerParticipation">>,
): ActionVolunteerParticipation | null {
  return payload.volunteerParticipation
    ? normalizeVolunteerParticipation(payload.volunteerParticipation)
    : null;
}

function resolveActionCigaretteButtsMeasurements(
  payload: Partial<Pick<
    CreateActionPayload,
    | "cigaretteButtsMeasurements"
    | "cigaretteButtsCount"
    | "cigaretteButts"
    | "cigaretteButtsMassKg"
    | "cigaretteButtsVolumeLiters"
    | "cigaretteButtsCondition"
    | "cigaretteButtsKg"
    | "wasteBreakdown"
  >>,
): ActionCigaretteButtsMeasurements {
  if (payload.cigaretteButtsMeasurements) {
    return normalizeCigaretteButtsMeasurementsFromUserInput(
      payload.cigaretteButtsMeasurements,
    );
  }

  return normalizeCigaretteButtsMeasurementsFromUserInput({
    cigaretteButtsCount: payload.cigaretteButtsCount ?? payload.cigaretteButts,
    cigaretteButtsMassKg:
      payload.cigaretteButtsMassKg ??
      payload.cigaretteButtsKg ??
      payload.wasteBreakdown?.megotsKg ??
      null,
    cigaretteButtsVolumeLiters: payload.cigaretteButtsVolumeLiters ?? null,
    cigaretteButtsCondition:
      payload.cigaretteButtsCondition ?? payload.wasteBreakdown?.megotsCondition ?? null,
  });
}

export function resolvePersistedCigaretteButts(
  payload: CreateActionPayload,
): number | null {
  const measurements = resolveActionCigaretteButtsMeasurements(payload);

  return measurements.cigaretteButtsCount;
}

export async function fetchActions(
  supabase: SupabaseClient,
  params: {
    limit: number;
    status: ActionStatus | null;
    includeFuturePublicActions?: boolean;
    futureOnly?: boolean;
    floorDate?: string;
    requireCoordinates?: boolean;
    viewport?: ActionMapViewportQuery;
  },
): Promise<ActionRow[]> {
  return fetchActionRows(supabase, params);
}

export async function fetchRecentActionsByUser(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<ActionRow[]> {
  try {
    const rows = await runActionQuery<ActionRow>(supabase, (query) =>
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

    try {
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY)
          .eq("created_by_clerk_id", params.userId)
          .order("action_date", { ascending: false })
          .limit(params.limit),
      );
      return rows.map(normalizeStoredAction);
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT)
          .eq("created_by_clerk_id", params.userId)
          .order("action_date", { ascending: false })
          .limit(params.limit),
      );
      return rows.map(normalizeStoredAction);
    }
  }
}

export async function loadActionById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRow | null> {
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

export function buildCreateActionGeometry(
  payload: CreateActionPayload,
  finalDrawing: ActionDrawing | null,
) {
  const geometrySource = finalDrawing
    ? finalDrawing.kind === "polygon"
      ? "manual"
      : payload.geometrySource === "manual" || payload.geometrySource === "routed"
        ? payload.geometrySource
        : payload.manualDrawing
          ? "manual"
          : "routed"
    : "fallback_point";

  return buildPersistedGeometry({
    drawing: finalDrawing,
    geojson: finalDrawing ? toGeoJsonString(finalDrawing) : null,
    confidence: finalDrawing
      ? geometrySource === "manual"
        ? GEOMETRY_CONFIDENCE.MANUAL_DRAWING
        : geometrySource === "routed"
          ? GEOMETRY_CONFIDENCE.AUTO_ROUTE
          : null
      : GEOMETRY_CONFIDENCE.POINT_FALLBACK,
    geometrySourceHint: geometrySource,
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
  const baseInsert = buildActionInsertPayload(params);

  const insertWithPhase = {
    ...baseInsert,
    action_phase: params.payload.actionPhase ?? "post_action_complete",
    preparation_data: normalizeActionPreparationData(params.payload.preparationData ?? {}),
  };

  let inserted = await supabase.from("actions").insert(insertWithPhase).select("id").single();

  if (inserted.error && isMissingActionColumnError(inserted.error)) {
    const errorMessage = inserted.error.message?.toLowerCase() ?? "";
    const retryPayload: Record<string, unknown> = { ...insertWithPhase };
    if (errorMessage.includes("department_")) {
      delete retryPayload.department_code;
      delete retryPayload.department_name;
    }
    if (errorMessage.includes("event_start_time")) {
      delete retryPayload.event_start_time;
    }
    if (errorMessage.includes("event_end_time")) {
      delete retryPayload.event_end_time;
    }
    if (errorMessage.includes("action_phase")) {
      delete retryPayload.action_phase;
    }
    if (errorMessage.includes("preparation_data")) {
      delete retryPayload.preparation_data;
    }
    if (errorMessage.includes("published_at")) {
      delete retryPayload.published_at;
    }
    inserted = await supabase
      .from("actions")
      .insert(retryPayload)
      .select("id")
      .single();
  }

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data.id;
}

export function buildActionInsertPayload(params: {
  userId: string;
  payload: CreateActionPayload;
  persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
  finalDrawing: ActionDrawing | null;
  status: ActionStatus | undefined;
}) {
  return {
    created_by_clerk_id: params.userId,
    actor_name: params.payload.actorName ?? null,
    organizer_type: params.payload.organizerType ?? null,
    action_date: params.payload.actionDate,
    location_label: params.payload.locationLabel,
    department_code: params.payload.departmentCode ?? null,
    department_name: params.payload.departmentName ?? null,
    latitude: params.payload.latitude ?? null,
    longitude: params.payload.longitude ?? null,
    derived_geometry_kind: params.persistedGeometry.kind,
    derived_geometry_geojson: params.persistedGeometry.geojson,
    geometry_confidence: params.persistedGeometry.confidence,
    geometry_source: params.persistedGeometry.geometrySource,
    waste_kg: params.payload.wasteKg,
    cigarette_butts: resolvePersistedCigaretteButts(params.payload),
    volunteers_count: resolveParticipantsCount({
      volunteerParticipation: params.payload.volunteerParticipation,
      legacyVolunteersCount: params.payload.volunteersCount,
    }),
    duration_minutes: params.payload.durationMinutes,
    event_start_time: params.payload.eventStartTime ?? null,
    event_end_time: params.payload.eventEndTime ?? null,
    published_at: null,
    preparation_data: normalizeActionPreparationData(params.payload.preparationData ?? {}),
    notes: buildPersistedNotes({
      ...params.payload,
      manualDrawing: params.finalDrawing ?? undefined,
    }),
    status: params.status ?? "pending",
  };
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
    departmentAttribution?: {
      trust: "trusted";
      source: "admin_import";
    };
  },
): Promise<{ id: string }> {
  const payload = params.payload;

  const finalDrawing = await resolveCreateActionDrawing(payload);
  const persistedGeometry = buildCreateActionGeometry(payload, finalDrawing);
  const departmentResolver = params.departmentAttribution?.trust === "trusted"
    ? resolveTrustedActionDepartmentForPersistence
    : resolveActionDepartmentForPersistence;
  const department = await departmentResolver({
    latitude: payload.latitude,
    longitude: payload.longitude,
    geometry: {
      kind: persistedGeometry.kind,
      coordinates: persistedGeometry.coordinates,
    },
    departmentCode: payload.departmentCode,
    departmentName: payload.departmentName,
    spatiallyChanged: params.departmentAttribution?.trust !== "trusted",
  });
  const payloadWithDepartment: CreateActionPayload = {
    ...payload,
    departmentCode: department.departmentCode ?? undefined,
    departmentName: department.departmentName ?? undefined,
  };
  const actionId = await insertCreatedAction(supabase, {
    userId: params.userId,
    payload: payloadWithDepartment,
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
  await recordCreateActionTrainingExample(supabase, {
    actionId,
    payload: payloadWithDepartment,
  });

  if (params.status === "approved") {
    await recordRepollutionPredictionEvaluationForAction(supabase, actionId);
  }

  return { id: String(actionId) };
}

/**
 * Records a prospective evaluation after an approved action reaches the
 * canonical store. The bounded read is deliberately marked partial: without
 * a completeness proof it can only use the generic projection fallback.
 */
export async function recordRepollutionPredictionEvaluationForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<void> {
  try {
    const currentRow = await fetchActionRowById(supabase, actionId);
    if (!currentRow || currentRow.status !== "approved") {
      return;
    }

    const rows = await fetchActionRows(supabase, {
      limit: 1001,
      status: "approved",
      requireCoordinates: true,
    });
    const current = toActionContract(currentRow);
    const previous = [current, ...rows.map(toActionContract)].filter(
      (observation, index, all) =>
        observation.id !== current.id ||
        index === all.findIndex((candidate) => candidate.id === current.id),
    );

    const result = evaluateRepollutionPredictionBeforeObservation({
      newObservation: current,
      previousObservations: previous.filter(
        (observation) => observation.id !== current.id,
      ),
      historyCompleteness: "partial",
    });

    await persistRepollutionPredictionEvaluation(supabase, result);
  } catch (error) {
    logFailure(
      "Actions/RepollutionEvaluation",
      "Prospective repollution evaluation could not be recorded",
      error,
      { actionId },
    );
  }
}
