import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPreparationData,
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
import { reconstructActionRoute } from "@/lib/actions/geometry/route-reconstruction";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import type { RouteGeometry } from "@/lib/route/route-contract";
import {
  persistResolvedRouteTargetDistance,
  resolveRouteTargetDistance,
} from "@/lib/actions/route-target-distance";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { inferGpxTopology } from "@/lib/actions/geometry/gpx";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";
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

type ResolvedCreateActionDrawing = {
  drawing: ActionDrawing | null;
  geometrySource: ActionGeometrySource | null;
  routeGeometry: RouteGeometry | null;
  origin: [number, number] | null;
};

function confidenceForGeometrySource(source: ActionGeometrySource): number | null {
  switch (source) {
    case "manual":
      return GEOMETRY_CONFIDENCE.MANUAL_DRAWING;
    case "gpx_import":
      return GEOMETRY_CONFIDENCE.GPX_IMPORT;
    case "routed":
      return GEOMETRY_CONFIDENCE.AUTO_ROUTE;
    case "estimated_route":
      return GEOMETRY_CONFIDENCE.ESTIMATED_ROUTE;
    default:
      return null;
  }
}

export async function resolveCreateActionDrawing(
  payload: CreateActionPayload,
): Promise<ResolvedCreateActionDrawing> {
  const manualDrawing = payload.manualDrawing ?? null;
  if (manualDrawing && manualDrawing.coordinates.length > 0) {
    return {
      drawing: manualDrawing,
      geometrySource: payload.geometrySource ?? "manual",
      routeGeometry: null,
      origin: manualDrawing.coordinates[0] ?? null,
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

export function buildCreateActionGeometry(
  payload: CreateActionPayload,
  finalDrawing: ActionDrawing | null,
  finalGeometrySource?: ActionGeometrySource | null,
) {
  const geometrySource: ActionGeometrySource = finalDrawing
    ? finalGeometrySource ?? payload.geometrySource ?? (payload.manualDrawing
      ? "manual"
      : finalDrawing.kind === "polyline"
        ? "routed"
        : "manual")
    : "fallback_point";

  return buildPersistedGeometry({
    drawing: finalDrawing,
    geojson: finalDrawing ? toGeoJsonString(finalDrawing) : null,
    confidence: finalDrawing
      ? confidenceForGeometrySource(geometrySource)
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
  routeGeometry?: RouteGeometry | null;
  status: Exclude<ActionStatus, "cancelled"> | undefined;
}) {
  const routeTopology = resolveActionRouteTopology({
    topology: params.payload.routeTopology ?? params.payload.preparationData?.routeTopology,
    arrivalLocationLabel:
      params.payload.arrivalLocationLabel ?? params.payload.preparationData?.zoneCiblePrevue,
  });
  const normalizedPreparationData = normalizeActionPreparationData({
    ...(params.payload.preparationData ?? {}),
    routeTopology,
  });
  const resolvedTarget = resolveRouteTargetDistance({
    durationMinutes: params.payload.durationMinutes,
    routeTargetDistanceKm:
      normalizedPreparationData.routeTargetDistanceKm ?? params.payload.routeTargetDistanceKm,
    routeTargetDistanceSource: normalizedPreparationData.routeTargetDistanceSource,
  });
  const preparationDataWithTarget = persistResolvedRouteTargetDistance(
    normalizedPreparationData,
    resolvedTarget,
  );
  const preparationDataWithGpx =
    params.payload.geometrySource === "gpx_import" &&
    params.finalDrawing?.kind === "polyline"
      ? (() => {
          const observedDistanceKm = Number(
            polylineDistanceKm(params.finalDrawing.coordinates).toFixed(3),
          );
          return {
            ...preparationDataWithTarget,
            routeObservedDistanceKm: observedDistanceKm,
            gpxImport: {
              ...(normalizedPreparationData.gpxImport ?? {}),
              source: "gpx_import" as const,
              observedDistanceKm,
              pointCount: params.finalDrawing.coordinates.length,
              inferredTopology: inferGpxTopology(params.finalDrawing.coordinates),
            },
          };
        })()
      : preparationDataWithTarget;
  const routeGeometry = params.payload.geometrySource === "gpx_import"
    ? null
    : params.routeGeometry;
  const preparationDataWithRoute = routeGeometry
    ? {
        ...preparationDataWithGpx,
        routeNetworkDistanceKm: routeGeometry.distanceKm,
        routeGeometryMode: routeGeometry.mode,
        routeGeometryProvider: routeGeometry.provider,
      }
    : preparationDataWithGpx;
  const preparationData = sanitizeAdministrativeRequirementsForCreation(
    params.payload.actionPhase,
    preparationDataWithRoute as ActionPreparationData,
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
  const routeTopology = resolveActionRouteTopology({
    topology: params.payload.routeTopology ?? params.payload.preparationData?.routeTopology,
    arrivalLocationLabel:
      params.payload.arrivalLocationLabel ?? params.payload.preparationData?.zoneCiblePrevue,
  });
  const payload: CreateActionPayload = {
    ...params.payload,
    routeTopology,
    preparationData: {
      ...(params.payload.preparationData ?? {}),
      routeTopology,
    },
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
