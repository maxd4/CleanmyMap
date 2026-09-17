import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPreparationData,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/geometry/derived-geometry";
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
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { inferGpxTopology } from "@/lib/actions/geometry/gpx";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";
import { sanitizeAdministrativeRequirementsForCreation } from "./administrative-requirements";
import {
  buildPersistedNotes,
  resolvePersistedCigaretteButts,
} from "./store-notes";
import { resolveParticipantsCount } from "@/lib/actions/volunteer-participation";

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
  const recordType = params.payload.recordType ?? "action";
  const routeTopology = resolveActionRouteTopology({
    topology: params.payload.routeTopology ?? params.payload.preparationData?.routeTopology,
    arrivalLocationLabel:
      params.payload.arrivalLocationLabel ?? params.payload.preparationData?.zoneCiblePrevue,
    recordType,
  });
  const normalizedInputPreparationData = normalizeActionPreparationData({
    ...(params.payload.preparationData ?? {}),
    routeTopology,
  });
  const activeGeometry = resolveFinalActionGeometry({
    gpxDrawing: normalizedInputPreparationData.gpxImport ? params.payload.manualDrawing : null,
    gpxImport: normalizedInputPreparationData.gpxImport,
    manualDrawing: params.payload.manualDrawing,
    manualDrawingSource: params.payload.geometrySource,
    operationalRoute: normalizedInputPreparationData.operationalRoute,
  });
  const normalizedPreparationData = clearActionRouteArrivalForLoop(
    normalizeActionPreparationData({
      ...normalizedInputPreparationData,
      ...(activeGeometry?.operationalRoute
        ? { operationalRoute: activeGeometry.operationalRoute }
        : !activeGeometry && normalizedInputPreparationData.operationalRoute
          ? { operationalRoute: normalizedInputPreparationData.operationalRoute }
          : { operationalRoute: undefined }),
      ...(activeGeometry?.source === "gpx_import"
        ? {}
        : { gpxImport: undefined, routeObservedDistanceKm: undefined }),
    }),
    { recordType, topology: routeTopology },
  );
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
  const persistedPayload = {
    ...params.payload,
    arrivalLocationLabel:
      recordType === "action" && routeTopology === "loop"
        ? undefined
        : params.payload.arrivalLocationLabel,
  };
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
      ...persistedPayload,
      manualDrawing: params.finalDrawing ?? undefined,
    }),
    status: params.status ?? "pending",
  };
}
