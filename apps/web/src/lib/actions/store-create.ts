import type {
  ActionDrawing,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResolvedActionOrganizer,
  ResolvedActionParticipant,
} from "@/lib/actions/participation/organizers";
import {
  buildInitialActionRegistrationRows,
  insertActionOrganizers,
  insertActionRegistrations,
} from "./store-participants";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/geometry/derived-geometry";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/geometry/route-geometry";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { sanitizeAdministrativeRequirementsForCreation } from "./administrative-requirements";
import {
  resolveActionDepartmentForPersistence,
  resolveTrustedActionDepartmentForPersistence,
} from "@/lib/geo/action-department-resolver";
import {
  buildPersistedNotes,
  resolvePersistedCigaretteButts,
} from "./store-notes";
import { isMissingActionColumnError } from "./store-selects";
import { resolveParticipantsCount } from "@/lib/actions/volunteer-participation";
import {
  recordCreateActionTrainingExample,
  recordRepollutionPredictionEvaluationForAction,
} from "./store-post-processing";

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

export function buildActionInsertPayload(params: {
  userId: string;
  payload: CreateActionPayload;
  persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
  finalDrawing: ActionDrawing | null;
  status: Exclude<ActionStatus, "cancelled"> | undefined;
}) {
  const preparationData = sanitizeAdministrativeRequirementsForCreation(
    params.payload.actionPhase,
    normalizeActionPreparationData(params.payload.preparationData ?? {}),
  );
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
    preparation_data: preparationData,
    notes: buildPersistedNotes({
      ...params.payload,
      manualDrawing: params.finalDrawing ?? undefined,
    }),
    status: params.status ?? "pending",
  };
}

async function insertCreatedAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
    finalDrawing: ActionDrawing | null;
    status: Exclude<ActionStatus, "cancelled"> | undefined;
  },
): Promise<string> {
  const baseInsert = buildActionInsertPayload(params);

  const insertWithPhase = {
    ...baseInsert,
    action_phase: params.payload.actionPhase ?? "post_action_complete",
    preparation_data: buildActionInsertPayload(params).preparation_data,
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

export async function createAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    organizers: ResolvedActionOrganizer[];
    manualParticipants?: ResolvedActionParticipant[];
    status?: Exclude<ActionStatus, "cancelled">;
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
  await insertActionRegistrations(
    supabase,
    actionId,
    buildInitialActionRegistrationRows({
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
