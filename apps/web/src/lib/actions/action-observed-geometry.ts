import type {
  ActionDrawing,
  ActionGpxImportMetadata,
  ActionGeometrySource,
  ActionPreparationData,
} from "./types";
import type { ActionRow } from "@/types/database";
import { GEOMETRY_CONFIDENCE } from "./geometry/geometry-core";
import { isRenderableDrawing, toGeoJsonString } from "./geometry/derived-geometry";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";

export type ObservedActionGeometrySource = Extract<
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
  drawing: ActionDrawing | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!drawing || drawing.coordinates.length === 0) return null;

  const [latitude, longitude] = drawing.coordinates.reduce(
    ([lat, lng], [nextLat, nextLng]) => [lat + nextLat, lng + nextLng],
    [0, 0],
  );
  return {
    latitude: Number((latitude / drawing.coordinates.length).toFixed(6)),
    longitude: Number((longitude / drawing.coordinates.length).toFixed(6)),
  };
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
  if (current.geometry_source === "gpx_import" || current.geometry_source === "gps_tracking") {
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
