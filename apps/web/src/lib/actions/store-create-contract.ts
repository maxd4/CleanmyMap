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
import {
  resolveParticipantsCount,
  resolvePersistedVolunteerComposition,
} from "@/lib/actions/volunteer-participation";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";
import { resolveActionContext } from "@/lib/actions/action-context";

function stripLegacyPreparationState(
  preparationData: ActionPreparationData,
): ActionPreparationData {
  const next = { ...preparationData };
  delete next.preparationState;
  return next;
}

export function resolveCreateActionRouteTopology(payload: CreateActionPayload) {
  const recordType = payload.recordType ?? "action";
  const interventionMode = normalizeActionInterventionMode(payload.preparationData?.interventionMode);
  if (interventionMode?.mode === "fixed_area") {
    return { recordType, routeTopology: undefined };
  }
  return {
    recordType,
    routeTopology: resolveActionRouteTopology({
      topology: payload.routeTopology ?? payload.preparationData?.routeTopology,
      arrivalLocationLabel:
        payload.arrivalLocationLabel ?? payload.preparationData?.zoneCiblePrevue,
      recordType,
    }),
  };
}

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
  if (finalGeometrySource === "gps_tracking" || payload.geometrySource === "gps_tracking") {
    throw new Error("La provenance gps_tracking est réservée à la promotion serveur d'une mission.");
  }

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

type ActionInsertParams = {
  userId: string;
  payload: CreateActionPayload;
  persistedGeometry: ReturnType<typeof buildCreateActionGeometry>;
  finalDrawing: ActionDrawing | null;
  routeGeometry?: RouteGeometry | null;
  status: Exclude<ActionStatus, "cancelled"> | undefined;
};

type ResolvedActionRecordType = NonNullable<ReturnType<typeof resolveCreateActionRouteTopology>["recordType"]>;

function normalizeInsertPreparationData(
  payload: CreateActionPayload,
  routeTopology: ReturnType<typeof resolveCreateActionRouteTopology>["routeTopology"],
): ActionPreparationData {
  const preparation = stripLegacyPreparationState(normalizeActionPreparationData({
    ...(payload.preparationData ?? {}),
    ...(routeTopology ? { routeTopology } : {}),
  }));
  if (routeTopology === undefined) {
    for (const key of [
      "routeTopology",
      "routeTargetDistanceKm",
      "routeTargetDistanceSource",
      "routeTargetDistancePolicyVersion",
      "routeCalibrationContext",
      "operationalRoute",
      "gpxImport",
      "routeObservedDistanceKm",
      "routeNetworkDistanceKm",
      "routeGeometryMode",
      "routeGeometryProvider",
    ] as const) {
      delete preparation[key];
    }
  }
  return preparation;
}

function normalizeActiveRoutePreparationData(
  preparation: ActionPreparationData,
  activeGeometry: ReturnType<typeof resolveFinalActionGeometry>,
  recordType: ResolvedActionRecordType,
  routeTopology: NonNullable<ReturnType<typeof resolveCreateActionRouteTopology>["routeTopology"]>,
): ActionPreparationData {
  return clearActionRouteArrivalForLoop(
    normalizeActionPreparationData({
      ...preparation,
      ...(activeGeometry?.operationalRoute
        ? { operationalRoute: activeGeometry.operationalRoute }
        : !activeGeometry && preparation.operationalRoute
          ? { operationalRoute: preparation.operationalRoute }
          : { operationalRoute: undefined }),
      ...(activeGeometry?.source === "gpx_import"
        ? {}
        : { gpxImport: undefined, routeObservedDistanceKm: undefined }),
    }),
    { recordType, topology: routeTopology },
  );
}

function appendGpxPreparationData(
  preparation: ActionPreparationData,
  params: ActionInsertParams,
  routeTopology: ReturnType<typeof resolveCreateActionRouteTopology>["routeTopology"],
): ActionPreparationData {
  if (routeTopology === undefined || params.payload.geometrySource !== "gpx_import" || params.finalDrawing?.kind !== "polyline") {
    return preparation;
  }
  const observedDistanceKm = Number(polylineDistanceKm(params.finalDrawing.coordinates).toFixed(3));
  return {
    ...preparation,
    routeObservedDistanceKm: observedDistanceKm,
    gpxImport: {
      ...(preparation.gpxImport ?? {}),
      source: "gpx_import",
      observedDistanceKm,
      pointCount: params.finalDrawing.coordinates.length,
      inferredTopology: inferGpxTopology(params.finalDrawing.coordinates),
    },
  };
}

function resolveInsertPreparationData(
  params: ActionInsertParams,
  recordType: ResolvedActionRecordType,
  routeTopology: ReturnType<typeof resolveCreateActionRouteTopology>["routeTopology"],
): ActionPreparationData {
  const inputPreparation = normalizeInsertPreparationData(params.payload, routeTopology);
  const activeGeometry = resolveFinalActionGeometry({
    gpxDrawing: inputPreparation.gpxImport ? params.payload.manualDrawing : null,
    gpxImport: inputPreparation.gpxImport,
    manualDrawing: params.payload.manualDrawing,
    manualDrawingSource: params.payload.geometrySource,
    operationalRoute: inputPreparation.operationalRoute,
  });
  const normalized = routeTopology === undefined
    ? normalizeActionPreparationData({
        ...inputPreparation,
        ...(activeGeometry?.source === "gpx_import" ? { gpxImport: undefined, routeObservedDistanceKm: undefined } : {}),
      })
    : normalizeActiveRoutePreparationData(inputPreparation, activeGeometry, recordType, routeTopology);
  const resolvedTarget = routeTopology === undefined ? null : resolveRouteTargetDistance({
    durationMinutes: params.payload.durationMinutes,
    routeTargetDistanceKm: normalized.routeTargetDistanceKm ?? params.payload.routeTargetDistanceKm,
    routeTargetDistanceSource: normalized.routeTargetDistanceSource,
  });
  const withTarget = resolvedTarget ? persistResolvedRouteTargetDistance(normalized, resolvedTarget) : normalized;
  const withGpx = appendGpxPreparationData(withTarget, params, routeTopology);
  const routeGeometry = routeTopology === undefined || params.payload.geometrySource === "gpx_import" ? null : params.routeGeometry;
  const withRoute = routeTopology !== undefined && routeGeometry
    ? { ...withGpx, routeNetworkDistanceKm: routeGeometry.distanceKm, routeGeometryMode: routeGeometry.mode, routeGeometryProvider: routeGeometry.provider }
    : withGpx;
  return sanitizeAdministrativeRequirementsForCreation(params.payload.actionPhase, withRoute);
}

function buildActionInsertRecord(
  params: ActionInsertParams,
  recordType: string,
  routeTopology: ReturnType<typeof resolveCreateActionRouteTopology>["routeTopology"],
  preparationData: ActionPreparationData,
) {
  const persistedPayload = {
    ...params.payload,
    arrivalLocationLabel: recordType === "action" && routeTopology === "loop" ? undefined : params.payload.arrivalLocationLabel,
  };
  const volunteersCount = resolveParticipantsCount({
    volunteerParticipation: params.payload.volunteerParticipation,
    legacyVolunteersCount: params.payload.volunteersCount,
  });
  const persistedVolunteerComposition = resolvePersistedVolunteerComposition({
    participation: params.payload.volunteerParticipation,
    volunteersCount,
  });
  return {
    created_by_clerk_id: params.userId,
    actor_name: params.payload.actorName ?? null,
    organizer_type: params.payload.organizerType ?? null,
    organizer_id: params.payload.organizerId ?? null,
    organizer_name: params.payload.organizerName ?? params.payload.associationName ?? null,
    ...(() => {
      const explicitContext =
        params.payload.actionContext !== undefined
          ? params.payload.actionContext
          : preparationData.actionContextSelection;
      const classification =
        params.payload.actionPhase === "pre_action" &&
        (explicitContext === undefined || explicitContext === null)
          ? { context: null, source: null, isVerifiedFinalComposition: false, isSchoolAutoActivated: false }
          : resolveActionContext({
              composition: {
                volunteersCount: resolveParticipantsCount({
                  volunteerParticipation: params.payload.volunteerParticipation,
                  legacyVolunteersCount: params.payload.volunteersCount,
                }),
                childrenCount: params.payload.volunteerParticipation?.childrenCount,
                retiredCount: params.payload.volunteerParticipation?.retiredCount,
              },
              explicitContext,
            });
      const explicitSchool = classification.source === "explicit" && classification.context === "school";
      return {
        action_context: classification.context,
        action_context_source: classification.source,
        school_context_confirmed: explicitSchool ? true : null,
        school_context_confirmed_at: explicitSchool ? new Date().toISOString() : null,
        school_context_confirmed_by_clerk_id: explicitSchool ? params.userId : null,
      };
    })(),
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
    volunteers_count: volunteersCount,
    ...persistedVolunteerComposition,
    duration_minutes: params.payload.durationMinutes,
    event_start_time: params.payload.eventStartTime ?? null,
    event_end_time: params.payload.eventEndTime ?? null,
    published_at: null,
    preparation_data: preparationData,
    access_mode: params.payload.accessMode ?? "public",
    notes: buildPersistedNotes(
      { ...persistedPayload, manualDrawing: params.finalDrawing ?? undefined },
      {
        persistVolunteerParticipationMetadata:
          persistedVolunteerComposition.children_count === null,
      },
    ),
    status: params.status ?? "pending",
  };
}

export function buildActionInsertPayload(params: ActionInsertParams) {
  const { recordType, routeTopology } = resolveCreateActionRouteTopology(params.payload);
  return buildActionInsertRecord(params, recordType, routeTopology, resolveInsertPreparationData(params, recordType, routeTopology));
}
