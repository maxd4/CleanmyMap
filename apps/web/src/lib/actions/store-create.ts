import type {
  ActionDrawing,
  ActionGeometrySource,
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
import { isMissingActionColumnError } from "./store-selects";
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

type ResolvedCreateActionDrawing = {
  drawing: ActionDrawing | null;
  geometrySource: ActionGeometrySource | null;
  routeGeometry: RouteGeometry | null;
  origin: [number, number] | null;
};

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

async function insertCreatedAction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    payload: CreateActionPayload;
    persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
    finalDrawing: ActionDrawing | null;
    routeGeometry?: RouteGeometry | null;
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
  params.payload = await resolveCanonicalCreateActionPayload({
    supabase,
    payload: params.payload,
    createdByClerkId: params.userId,
  });
  const { recordType, routeTopology } = resolveCreateActionRouteTopology(params.payload);
  const preparationData = clearActionRouteArrivalForLoop(
    {
      ...(params.payload.preparationData ?? {}),
      routeTopology,
    },
    { recordType, topology: routeTopology },
  );
  const payload: CreateActionPayload = {
    ...params.payload,
    recordType,
    routeTopology,
    arrivalLocationLabel:
      recordType === "action" && routeTopology === "loop"
        ? undefined
        : params.payload.arrivalLocationLabel,
    preparationData,
  };

  const resolvedTarget = resolveRouteTargetDistance({
    durationMinutes: payload.durationMinutes,
    routeTargetDistanceKm: payload.preparationData?.routeTargetDistanceKm,
    routeTargetDistanceSource: payload.preparationData?.routeTargetDistanceSource,
  });
  const payloadWithRouteTarget: CreateActionPayload = {
    ...payload,
    preparationData: persistResolvedRouteTargetDistance(
      payload.preparationData ?? {},
      resolvedTarget,
    ),
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
  const actionId = await insertCreatedAction(supabase, {
    userId: params.userId,
    payload: payloadWithDepartment,
    persistedGeometry,
    finalDrawing,
    routeGeometry: resolvedDrawing.routeGeometry,
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
