import type {
  ActionDrawing,
  ActionObservedCoverage,
  ActionGpxImportMetadata,
  ActionGeometrySource,
  ActionPreparationData,
} from "./types";
import type { ActionRow } from "@/types/database";
import { GEOMETRY_CONFIDENCE } from "./geometry/geometry-core";
import { isRenderableDrawing, toGeoJsonString } from "./geometry/derived-geometry";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";

type RepresentativeGeometry = ActionDrawing | ActionObservedCoverage;
type LatLng = [number, number];

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function representativePoint(point: LatLng): { latitude: number; longitude: number } {
  return {
    latitude: roundCoordinate(point[0]),
    longitude: roundCoordinate(point[1]),
  };
}

function pointInPolygon(point: LatLng, ring: LatLng[]): boolean {
  const [latitude, longitude] = point;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLatitude, currentLongitude] = ring[index];
    const [previousLatitude, previousLongitude] = ring[previous];
    const intersects =
      (currentLatitude > latitude) !== (previousLatitude > latitude) &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonRepresentative(ring: LatLng[]): LatLng | null {
  const points = ring.length > 1 && ring[0]?.every((value, index) => value === ring.at(-1)?.[index])
    ? ring.slice(0, -1)
    : ring;
  if (points.length < 3) return points[0] ?? null;

  let twiceArea = 0;
  let centroidLatitude = 0;
  let centroidLongitude = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    centroidLatitude += (current[0] + next[0]) * cross;
    centroidLongitude += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) > Number.EPSILON) {
    const centroid: LatLng = [centroidLatitude / (3 * twiceArea), centroidLongitude / (3 * twiceArea)];
    if (pointInPolygon(centroid, points)) return centroid;
  }

  const latitudes = points.map(([latitude]) => latitude).sort((left, right) => left - right);
  const candidateLatitudes = [
    ...latitudes.slice(0, -1).map((latitude, index) => (latitude + latitudes[index + 1]) / 2),
    (latitudes[0] + latitudes.at(-1)!) / 2,
  ];
  const candidates: LatLng[] = [];
  for (const latitude of candidateLatitudes) {
    const intersections: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      if ((current[0] > latitude) === (next[0] > latitude)) continue;
      const longitude = current[1] +
        ((latitude - current[0]) * (next[1] - current[1])) /
          (next[0] - current[0]);
      intersections.push(longitude);
    }
    intersections.sort((left, right) => left - right);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const candidate: LatLng = [latitude, (intersections[index] + intersections[index + 1]) / 2];
      if (pointInPolygon(candidate, points)) candidates.push(candidate);
    }
  }
  if (candidates.length === 0) return points[0] ?? null;
  const center: LatLng = [
    (Math.min(...points.map(([latitude]) => latitude)) + Math.max(...points.map(([latitude]) => latitude))) / 2,
    (Math.min(...points.map(([, longitude]) => longitude)) + Math.max(...points.map(([, longitude]) => longitude))) / 2,
  ];
  return candidates.sort(
    (left, right) => (left[0] - center[0]) ** 2 + (left[1] - center[1]) ** 2 -
      ((right[0] - center[0]) ** 2 + (right[1] - center[1]) ** 2),
  )[0] ?? null;
}

function polylineRepresentative(coordinates: LatLng[]): LatLng | null {
  if (coordinates.length === 0) return null;
  const totalDistance = polylineDistanceKm(coordinates);
  if (totalDistance <= Number.EPSILON) return coordinates[0];
  const target = totalDistance / 2;
  let accumulated = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    const segmentDistance = polylineDistanceKm([start, end]);
    if (accumulated + segmentDistance >= target && segmentDistance > 0) {
      const ratio = (target - accumulated) / segmentDistance;
      return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
    }
    accumulated += segmentDistance;
  }
  return coordinates.at(-1) ?? null;
}

type ObservedActionGeometrySource = Extract<
  ActionGeometrySource,
  "gpx_import" | "gps_tracking"
>;

type GeometryUpdateInput = {
  current: ActionRow;
  drawing: ActionDrawing;
  source: ObservedActionGeometrySource;
  preparationData?: ActionPreparationData | null;
  gpxImport?: ActionGpxImportMetadata | null;
};

export function geometryRepresentativeCoordinates(
  drawing: RepresentativeGeometry | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!drawing) return null;
  if ("type" in drawing && drawing.type === "MultiLineString") {
    const longest = drawing.coordinates
      .map((line) => line.map(([longitude, latitude]) => [latitude, longitude] as LatLng))
      .sort((left, right) => polylineDistanceKm(right) - polylineDistanceKm(left))[0];
    const point = polylineRepresentative(longest ?? []);
    return point ? representativePoint(point) : null;
  }
  if (!("kind" in drawing)) return null;
  const point = drawing.kind === "polygon"
    ? polygonRepresentative(drawing.coordinates)
    : polylineRepresentative(drawing.coordinates);
  return point ? representativePoint(point) : null;
}

function assertObservedPolyline(drawing: ActionDrawing): void {
  if (
    drawing.kind !== "polyline" ||
    !isRenderableDrawing(drawing) ||
    drawing.coordinates.some(
      ([latitude, longitude]) =>
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180,
    )
  ) {
    throw new Error("La géométrie observée doit être une polyligne valide.");
  }
}

function withoutDerivedRouteMetadata(
  preparationData: ActionPreparationData,
): ActionPreparationData {
  const nextPreparationData = { ...preparationData };
  for (const key of [
    "gpxImport",
    "operationalRoute",
    "routeNetworkDistanceKm",
    "routeGeometryMode",
    "routeGeometryProvider",
  ] as const) {
    delete nextPreparationData[key];
  }
  return nextPreparationData;
}

export function hasPriorityObservedGeometry(
  current: Pick<ActionRow, "geometry_source" | "preparation_data">,
): boolean {
  const preparationData = normalizeActionPreparationData(
    current.preparation_data ?? {},
  );
  return (
    current.geometry_source === "gpx_import" ||
    current.geometry_source === "gps_tracking" ||
    preparationData.gpxImport?.source === "gpx_import"
  );
}

export function isManualDrawingReplacementBlocked(
  current: Pick<ActionRow, "geometry_source" | "preparation_data">,
  source: ActionGeometrySource | null | undefined,
): boolean {
  return source === "manual" && hasPriorityObservedGeometry(current);
}

export function getAcceptedActionDrawing({
  current,
  drawing,
  source,
}: {
  current: Pick<ActionRow, "geometry_source" | "preparation_data">;
  drawing: ActionDrawing | null | undefined;
  source: ActionGeometrySource | null | undefined;
}): ActionDrawing | null {
  if (!drawing || (source !== "manual" && source !== "gpx_import")) {
    return null;
  }
  return isManualDrawingReplacementBlocked(current, source) ? null : drawing;
}

export function buildObservedActionGeometryUpdate({
  current,
  drawing,
  source,
  preparationData,
  gpxImport,
}: GeometryUpdateInput): Record<string, unknown> {
  assertObservedPolyline(drawing);
  const observedDistanceKm = Number(polylineDistanceKm(drawing.coordinates).toFixed(3));
  const normalizedPreparationData = withoutDerivedRouteMetadata(
    normalizeActionPreparationData(
      preparationData ?? current.preparation_data ?? {},
    ),
  );
  const validatedGpxImport =
    source === "gpx_import"
      ? gpxImport ??
        (() => {
          throw new Error("Les métadonnées du tracé GPX sont obligatoires.");
        })()
      : null;
  const nextPreparationData: ActionPreparationData =
    source === "gpx_import"
      ? {
          ...normalizedPreparationData,
          routeObservedDistanceKm: observedDistanceKm,
          gpxImport: {
            ...validatedGpxImport!,
            source,
            observedDistanceKm,
            pointCount: drawing.coordinates.length,
          },
        }
      : {
          ...normalizedPreparationData,
          routeObservedDistanceKm: observedDistanceKm,
        };

  return {
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: toGeoJsonString(drawing),
    geometry_confidence:
      source === "gpx_import" ? GEOMETRY_CONFIDENCE.GPX_IMPORT : null,
    geometry_source: source,
    preparation_data: nextPreparationData,
  };
}

export function buildManualActionGeometryUpdate({
  current,
  drawing,
  preparationData,
}: {
  current: ActionRow;
  drawing: ActionDrawing;
  preparationData?: ActionPreparationData | null;
}): Record<string, unknown> {
  if (isManualDrawingReplacementBlocked(current, "manual")) {
    return {};
  }

  const normalizedPreparationData = withoutDerivedRouteMetadata(
    normalizeActionPreparationData(
      preparationData ?? current.preparation_data ?? {},
    ),
  );
  return {
    derived_geometry_kind: drawing.kind,
    derived_geometry_geojson: toGeoJsonString(drawing),
    geometry_confidence: GEOMETRY_CONFIDENCE.MANUAL_DRAWING,
    geometry_source: "manual",
    preparation_data: normalizedPreparationData,
  };
}
