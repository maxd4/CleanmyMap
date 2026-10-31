import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionGpxImportMetadata,
  ActionLocationCoordinates,
  ActionRouteTopology,
} from "@/lib/actions/types";
import {
  getOperationalRouteMeetingPoint,
  projectMeetingPointFromGeometry,
  type OperationalRoute,
} from "@/lib/route/route-operational";
import {
  resolveFinalActionGeometry,
  type FinalActionGeometry,
} from "@/lib/actions/geometry/final-geometry";
import {
  serializeActionGeometryToGpx,
  type GpxCoordinate,
  type GpxSerializerInput,
  type GpxTrackInput,
  type GpxWaypoint,
} from "./gpx-serializer";

export const ACTION_ROUTE_GPX_FILENAME = "cleanmymap-itineraire.gpx";

export type ActionRouteGpxInput = {
  /** The already selected active geometry, when the caller has it available. */
  finalGeometry?: FinalActionGeometry | null;
  operationalRoute?: OperationalRoute | null;
  /** A final manual drawing or the canonical drawing produced by GPX import. */
  drawing?: Pick<ActionDrawing, "coordinates"> | null;
  gpxImport?: ActionGpxImportMetadata | null;
  drawingSource?: ActionGeometrySource | null;
  routeTopology?: ActionRouteTopology;
  departureLabel?: string;
  midpointLabel?: string;
  midpointCoordinates?: ActionLocationCoordinates | null;
  arrivalLabel?: string;
};

function isValidCoordinate(value: readonly [number, number] | null | undefined): value is GpxCoordinate {
  return Boolean(
    value &&
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1]) &&
      value[0] >= -90 &&
      value[0] <= 90 &&
      value[1] >= -180 &&
      value[1] <= 180,
  );
}

function hasUsableTrack(coordinates: readonly GpxCoordinate[]): boolean {
  return coordinates.length >= 2 && coordinates.every(isValidCoordinate);
}

function asPolylineDrawing(
  drawing: Pick<ActionDrawing, "coordinates"> | null | undefined,
): ActionDrawing | null {
  return drawing ? { kind: "polyline", coordinates: drawing.coordinates } : null;
}

function trackingGeometryInput(params: ActionRouteGpxInput) {
  const isTracking = params.drawingSource === "gps_tracking";
  return {
    trackingDrawing: isTracking ? asPolylineDrawing(params.drawing) : null,
    trackingSource: isTracking ? ("gps_tracking" as const) : null,
  };
}

function sameCoordinate(left: GpxCoordinate, right: GpxCoordinate): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function isPlannedNonOperationalGeometry(
  finalGeometry: FinalActionGeometry,
  gpxImport: ActionGpxImportMetadata | null | undefined,
): boolean {
  if (finalGeometry.source === "manual" ||
      finalGeometry.source === "reference" ||
      finalGeometry.source === "routed" ||
      finalGeometry.source === "estimated_route") {
    return true;
  }
  return finalGeometry.source === "gpx_import" &&
    (gpxImport?.intent === "planned" || gpxImport?.provenance === "planned");
}

function waypoint(
  coordinates: GpxCoordinate | null | undefined,
  name: string | undefined,
  role: GpxWaypoint["role"],
): GpxWaypoint | null {
  if (!isValidCoordinate(coordinates)) return null;
  return {
    coordinates,
    name: name?.trim() || (role === "departure" ? "Départ" : role === "arrival" ? "Arrivée" : "Mi-parcours"),
    role,
  };
}

function routeWaypoints(params: {
  coordinates: readonly GpxCoordinate[];
  origin: GpxCoordinate | null;
  stops: ReadonlyArray<{ latitude: number; longitude: number; label: string }>;
  meetingPoint?: { coordinate: GpxCoordinate; label?: string } | null;
  departureLabel?: string;
  arrivalLabel?: string;
}): GpxWaypoint[] {
  const departure = params.origin ?? params.coordinates[0] ?? null;
  const arrival = params.coordinates.at(-1) ?? null;
  const waypoints: GpxWaypoint[] = [];
  const departureWaypoint = waypoint(departure, params.departureLabel, "departure");
  if (departureWaypoint) waypoints.push(departureWaypoint);

  for (const stop of params.stops) {
    const stopWaypoint = waypoint([stop.latitude, stop.longitude], stop.label, "stop");
    if (stopWaypoint) waypoints.push(stopWaypoint);
  }

  if (params.meetingPoint) {
    const meetingPointWaypoint = waypoint(
      params.meetingPoint.coordinate,
      params.meetingPoint.label,
      "meetingPoint",
    );
    if (meetingPointWaypoint) waypoints.push(meetingPointWaypoint);
  }

  if (isValidCoordinate(arrival) && (!isValidCoordinate(departure) || !sameCoordinate(arrival, departure))) {
    const arrivalWaypoint = waypoint(arrival, params.arrivalLabel, "arrival");
    if (arrivalWaypoint) waypoints.push(arrivalWaypoint);
  }

  return waypoints;
}

function trackFromOperationalRoute(
  route: OperationalRoute["routes"][number],
  operationalRoute: OperationalRoute,
  labels: Pick<ActionRouteGpxInput, "departureLabel" | "arrivalLabel">,
  multipleRoutes: boolean,
): GpxTrackInput | null {
  const coordinates = route.geometry.coordinates;
  if (!hasUsableTrack(coordinates)) return null;

  const origin = isValidCoordinate(route.geometry.origin)
    ? route.geometry.origin
    : isValidCoordinate(operationalRoute.zones.departure.coordinate)
      ? operationalRoute.zones.departure.coordinate
      : coordinates[0] ?? null;
  const projection = getOperationalRouteMeetingPoint(operationalRoute, route);
  const meetingPoint = projection
    ? {
        coordinate: projection.coordinates,
        label: operationalRoute.zones.midpoint.label ?? "Mi-parcours",
      }
    : null;

  return {
    geometry: { coordinates },
    geometrySource:
      route.geometry.mode === "fallback" || route.geometry.estimated
        ? "estimated_route"
        : "routed",
    routeTopology: route.geometry.isLoop ? "loop" : "point_to_point",
    name: multipleRoutes ? `Itinéraire groupe ${route.groupIndex}` : "Itinéraire CleanMyMap",
    waypoints: routeWaypoints({
      coordinates,
      origin,
      stops: route.plannerTechnicalStops,
      meetingPoint,
      departureLabel: labels.departureLabel,
      arrivalLabel: labels.arrivalLabel,
    }),
  };
}

function resolveRouteFinalGeometry(params: ActionRouteGpxInput): FinalActionGeometry | null {
  return params.finalGeometry ?? resolveFinalActionGeometry({
    ...trackingGeometryInput(params),
    gpxDrawing: params.gpxImport ? asPolylineDrawing(params.drawing) : null,
    gpxImport: params.gpxImport,
    manualDrawing: asPolylineDrawing(params.drawing),
    manualDrawingSource:
      params.drawingSource ?? (params.gpxImport ? "gpx_import" : "manual"),
    operationalRoute: params.operationalRoute,
  });
}

function buildOperationalRouteGpx(
  finalGeometry: FinalActionGeometry,
  params: ActionRouteGpxInput,
): GpxSerializerInput | null {
  if (!finalGeometry.operationalRoute || finalGeometry.operationalRoute.routes.length === 0) return null;
  const multipleRoutes = finalGeometry.operationalRoute.routes.length > 1;
  const tracks = finalGeometry.operationalRoute.routes.map((route) =>
    trackFromOperationalRoute(route, finalGeometry.operationalRoute!, params, multipleRoutes),
  );
  if (tracks.some((track) => track === null)) return null;
  return {
    name: "Itinéraire CleanMyMap",
    description: "Export de la géométrie finale actuellement retenue.",
    provenance: "planned",
    tracks: tracks as GpxTrackInput[],
  };
}

function resolveDrawingMeetingPoint(
  finalGeometry: FinalActionGeometry,
  params: ActionRouteGpxInput,
  coordinates: GpxCoordinate[],
) {
  const midpointCoordinate = params.midpointCoordinates
    ? [params.midpointCoordinates.latitude, params.midpointCoordinates.longitude] as GpxCoordinate
    : null;
  const explicitMeetingPoint = isValidCoordinate(midpointCoordinate)
    ? { coordinates: midpointCoordinate, label: params.midpointLabel }
    : null;
  const derivedMeetingPoint = explicitMeetingPoint ?? (
    isPlannedNonOperationalGeometry(finalGeometry, params.gpxImport)
      ? projectMeetingPointFromGeometry({ coordinates: coordinates.map(([latitude, longitude]) => [latitude, longitude]) })
      : null
  );
  return derivedMeetingPoint
    ? { coordinate: derivedMeetingPoint.coordinates, label: params.midpointLabel }
    : null;
}

function resolveDrawingProvenance(
  finalGeometry: FinalActionGeometry,
  params: ActionRouteGpxInput,
) {
  return finalGeometry.source === "gpx_import"
    ? params.gpxImport?.intent === "planned" || params.gpxImport?.provenance === "planned" ? "planned" : "observed"
    : finalGeometry.source === "gps_tracking" ? "observed" : "planned";
}

function buildDrawingRouteGpx(
  finalGeometry: FinalActionGeometry,
  params: ActionRouteGpxInput,
): GpxSerializerInput | null {
  const coordinates = finalGeometry.drawing.coordinates;
  if (!hasUsableTrack(coordinates)) return null;
  const origin = coordinates[0] ?? null;
  const meetingPoint = resolveDrawingMeetingPoint(finalGeometry, params, coordinates);
  const provenance = resolveDrawingProvenance(finalGeometry, params);
  return {
    name: "Itinéraire CleanMyMap",
    description: "Export de la géométrie finale actuellement retenue.",
    provenance,
    tracks: [{
      geometry: { coordinates: coordinates.map(([latitude, longitude]) => [latitude, longitude]) },
      geometrySource: finalGeometry.source,
      routeTopology: params.routeTopology ?? params.gpxImport?.inferredTopology,
      waypoints: routeWaypoints({ coordinates, origin, stops: [], meetingPoint, departureLabel: params.departureLabel, arrivalLabel: params.arrivalLabel }),
    }],
  };
}

export function buildActionRouteGpxInput(params: ActionRouteGpxInput): GpxSerializerInput | null {
  const finalGeometry = resolveRouteFinalGeometry(params);
  if (!finalGeometry) return null;
  if (finalGeometry.operationalRoute) {
    return buildOperationalRouteGpx(finalGeometry, params);
  }
  return buildDrawingRouteGpx(finalGeometry, params);
}

export function buildActionRouteGpxDocument(
  params: ActionRouteGpxInput,
): string | null {
  const input = buildActionRouteGpxInput(params);
  return input ? serializeActionGeometryToGpx(input) : null;
}
