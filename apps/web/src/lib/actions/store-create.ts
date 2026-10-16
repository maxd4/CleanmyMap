import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type {
  ResolvedActionOrganizer,
  ResolvedActionParticipant,
} from "@/lib/actions/participation/organizers";
import {
  buildInitialActionRegistrationRows,
} from "./store-participants";
import { reconstructActionRoute } from "@/lib/actions/geometry/route-reconstruction";
import {
  clearActionRouteArrivalForLoop,
  resolveActionRouteTopology,
} from "@/lib/actions/route-topology";
import { resolveFinalActionGeometry } from "@/lib/actions/geometry/final-geometry";
import type { RouteGeometry } from "@/lib/route/route-contract";
import {
  persistResolvedRouteTargetDistance,
  resolveRouteTargetDistance,
} from "@/lib/actions/route-target-distance";
import {
  resolveActionDepartmentForPersistence,
  resolveTrustedActionDepartmentForPersistence,
} from "@/lib/geo/action-department-resolver";
import {
  recordCreateActionTrainingExample,
  recordRepollutionPredictionEvaluationForAction,
} from "./store-post-processing";
import {
  buildActionInsertPayload,
  buildCreateActionGeometry,
  resolveCreateActionRouteTopology,
} from "./store-create-contract";
import { resolveCanonicalCreateActionPayload } from "./organizer-directory-registry";

export { buildActionInsertPayload, buildCreateActionGeometry } from "./store-create-contract";

async function persistCreatedActionPostProcessing(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    payload: CreateActionPayload;
    status?: Exclude<ActionStatus, "cancelled">;
  },
): Promise<void> {
  await recordCreateActionTrainingExample(supabase, {
    actionId: params.actionId,
    payload: params.payload,
  });
  if (params.status === "approved") {
    await recordRepollutionPredictionEvaluationForAction(supabase, params.actionId);
  }
}

type ResolvedCreateActionDrawing = {
  drawing: ActionDrawing | null;
  geometrySource: ActionGeometrySource | null;
  routeGeometry: RouteGeometry | null;
  origin: [number, number] | null;
};

type ActionCreationResult = {
  id: string;
  replayed?: true;
};

export class ActionCreationPersistenceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ActionCreationPersistenceError";
  }
}

function buildCreationFingerprint(params: {
  action: Record<string, unknown>;
  organizers: ResolvedActionOrganizer[];
  registrations: Array<{
    user_id: string;
    registration_status: string;
    registration_source: string;
  }>;
}): string {
  return createHash("sha256")
    .update(JSON.stringify({
      action: params.action,
      organizers: params.organizers.map((organizer) => ({
        userId: organizer.userId,
        displayName: organizer.displayName,
        handle: organizer.handle,
        isPrimary: organizer.isPrimary,
      })),
      registrations: params.registrations.map((registration) => ({
        user_id: registration.user_id,
        registration_status: registration.registration_status,
        registration_source: registration.registration_source,
      })),
    }))
    .digest("hex");
}

function isMissingAtomicCreationRpc(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42883" || error?.code === "PGRST202" ||
    /create_action_with_relations.*(does not exist|not found)/i.test(error?.message ?? "");
}

export async function persistActionWithRelations(
  supabase: SupabaseClient,
  params: {
    userId: string;
    baseInsert: Record<string, unknown>;
    organizers: ResolvedActionOrganizer[];
    organizerRequirement?: "required" | "optional";
    manualParticipants: ResolvedActionParticipant[];
    clientRequestId?: string;
  },
): Promise<ActionCreationResult> {
  const registrations = buildInitialActionRegistrationRows({
    actionId: "pending",
    creatorUserId: params.userId,
    organizers: params.organizers,
    manualParticipants: params.manualParticipants,
  });
  const action = {
    ...params.baseInsert,
    client_request_id: params.clientRequestId ?? null,
  };
  const fingerprint = params.clientRequestId
    ? buildCreationFingerprint({
        action,
        organizers: params.organizers,
        registrations,
      })
    : null;
  const result = await supabase.rpc("create_action_with_relations", {
    p_action: action,
    p_organizers: params.organizers.map((organizer) => ({
      organizer_clerk_id: organizer.userId,
      organizer_label: organizer.displayName,
      organizer_handle: organizer.handle,
      is_primary: organizer.isPrimary,
    })),
    p_registrations: registrations,
    p_creator_id: params.userId,
    p_client_request_id: params.clientRequestId ?? null,
    p_client_request_fingerprint: fingerprint,
    p_organizer_required: params.organizerRequirement !== "optional" || params.organizers.length > 0,
  });
  if (result.error) {
    if (isMissingAtomicCreationRpc(result.error)) {
      throw new ActionCreationPersistenceError(
        "La migration de création atomique des actions est absente : aucune création non idempotente ne sera tentée.",
        result.error,
      );
    }
    throw result.error;
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row.action_id !== "string") {
    throw new ActionCreationPersistenceError(
      "La création atomique de l’action n’a pas renvoyé de référence persistée.",
    );
  }
  return row.replayed ? { id: row.action_id, replayed: true } : { id: row.action_id };
}

export async function resolveCreateActionDrawing(
  payload: CreateActionPayload,
): Promise<ResolvedCreateActionDrawing> {
  const activeGeometry = resolveFinalActionGeometry({
    gpxDrawing: payload.preparationData?.gpxImport ? payload.manualDrawing : null,
    gpxImport: payload.preparationData?.gpxImport,
    manualDrawing: payload.manualDrawing,
    manualDrawingSource: payload.geometrySource,
    operationalRoute: payload.preparationData?.operationalRoute,
  });
  if (activeGeometry) {
    return {
      drawing: activeGeometry.drawing,
      geometrySource: activeGeometry.source,
      routeGeometry: activeGeometry.operationalRoute?.routes[0]?.geometry ?? null,
      origin: activeGeometry.drawing.coordinates[0] ?? null,
    };
  }

  const route = await reconstructActionRoute({
    latitude: payload.latitude,
    longitude: payload.longitude,
    locationLabel: payload.locationLabel,
    departureLocationLabel: payload.departureLocationLabel,
    midpointLocationLabel: payload.preparationData?.midRouteLocationLabel,
    midpointCoordinates: payload.preparationData?.midRouteCoordinates,
    arrivalLocationLabel:
      payload.arrivalLocationLabel ?? payload.preparationData?.zoneCiblePrevue,
    arrivalCoordinates: payload.preparationData?.arrivalCoordinates,
    topology: resolveActionRouteTopology({
      topology: payload.routeTopology ?? payload.preparationData?.routeTopology,
      arrivalLocationLabel:
        payload.arrivalLocationLabel ?? payload.preparationData?.zoneCiblePrevue,
      recordType: payload.recordType ?? "action",
    }),
    durationMinutes: payload.durationMinutes,
    routeTargetDistanceKm: payload.preparationData?.routeTargetDistanceKm,
    routeTargetDistanceSource: payload.preparationData?.routeTargetDistanceSource,
  });
  return route
    ? {
        drawing: route.drawing,
        geometrySource: route.geometrySource,
        routeGeometry: route.routeGeometry,
        origin: route.origin,
      }
    : { drawing: null, geometrySource: null, routeGeometry: null, origin: null };
}

export async function createAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    organizers: ResolvedActionOrganizer[];
    organizerRequirement?: "required" | "optional";
    manualParticipants?: ResolvedActionParticipant[];
    status?: Exclude<ActionStatus, "cancelled">;
    departmentAttribution?: {
      trust: "trusted";
      source: "admin_import";
    };
    clientRequestId?: string;
  },
): Promise<ActionCreationResult> {
  params.payload = await resolveCanonicalCreateActionPayload({
    supabase,
    payload: params.payload,
  });
  const { recordType, routeTopology } = resolveCreateActionRouteTopology(params.payload);
  const preparationData = routeTopology === undefined
    ? { ...(params.payload.preparationData ?? {}) }
    : clearActionRouteArrivalForLoop(
      {
        ...(params.payload.preparationData ?? {}),
        routeTopology,
      },
      { recordType, topology: routeTopology },
    );
  const payload: CreateActionPayload = {
    ...params.payload,
    recordType,
    ...(routeTopology ? { routeTopology } : {}),
    arrivalLocationLabel:
      recordType === "action" && routeTopology === "loop"
        ? undefined
        : params.payload.arrivalLocationLabel,
    preparationData,
  };

  const resolvedTarget = routeTopology === undefined ? null : resolveRouteTargetDistance({
    durationMinutes: payload.durationMinutes,
    routeTargetDistanceKm: payload.preparationData?.routeTargetDistanceKm,
    routeTargetDistanceSource: payload.preparationData?.routeTargetDistanceSource,
  });
  const payloadWithRouteTarget: CreateActionPayload = {
    ...payload,
    preparationData: resolvedTarget
      ? persistResolvedRouteTargetDistance(payload.preparationData ?? {}, resolvedTarget)
      : payload.preparationData,
  };

  const resolvedDrawing = await resolveCreateActionDrawing(payloadWithRouteTarget);
  const payloadWithCoordinates: CreateActionPayload = {
    ...payloadWithRouteTarget,
    latitude: payload.latitude ?? resolvedDrawing.origin?.[0],
    longitude: payload.longitude ?? resolvedDrawing.origin?.[1],
  };
  const finalDrawing = resolvedDrawing.drawing;
  const persistedGeometry = buildCreateActionGeometry(
    payloadWithCoordinates,
    finalDrawing,
    resolvedDrawing.geometrySource,
  );
  const departmentResolver = params.departmentAttribution?.trust === "trusted"
    ? resolveTrustedActionDepartmentForPersistence
    : resolveActionDepartmentForPersistence;
  const department = await departmentResolver({
    latitude: payloadWithCoordinates.latitude,
    longitude: payloadWithCoordinates.longitude,
    geometry: {
      kind: persistedGeometry.kind,
      coordinates: persistedGeometry.coordinates,
    },
    departmentCode: payload.departmentCode,
    departmentName: payload.departmentName,
    spatiallyChanged: params.departmentAttribution?.trust !== "trusted",
  });
  const payloadWithDepartment: CreateActionPayload = {
    ...payloadWithCoordinates,
    departmentCode: department.departmentCode ?? undefined,
    departmentName: department.departmentName ?? undefined,
  };
  const baseInsert = buildActionInsertPayload({
    userId: params.userId,
    payload: payloadWithDepartment,
    persistedGeometry,
    finalDrawing,
    routeGeometry: resolvedDrawing.routeGeometry,
    status: params.status,
  });
  const created = await persistActionWithRelations(supabase, {
    userId: params.userId,
    baseInsert: {
      ...baseInsert,
      action_phase: payloadWithDepartment.actionPhase ?? "post_action_complete",
    },
    organizers: params.organizers,
    organizerRequirement: params.organizerRequirement,
    manualParticipants: params.manualParticipants ?? [],
    clientRequestId: params.clientRequestId,
  });

  if (created.replayed) return created;

  await persistCreatedActionPostProcessing(supabase, {
    actionId: created.id,
    payload: payloadWithDepartment,
    status: params.status,
  });

  return { id: String(created.id) };
}
