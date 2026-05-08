import type { ActionDrawing, ActionGeometryKind } from "@/lib/actions/types";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";
export { GEOMETRY_CONFIDENCE } from "./geometry-core";
import {
  resolveBestGeometry as resolveBestGeometryResolution,
  resolveGeometrySourceFromConfidence as resolveGeometrySourceFromConfidenceResolution,
} from "./geometry-resolution";

export type ActionGeometryOrigin =
  | "manual"
  | "reference"
  | "routed"
  | "estimated_area"
  | "fallback_point";

export type PersistedDerivedGeometry = {
  kind: ActionGeometryKind;
  coordinates: [number, number][];
  geojson: string | null;
  confidence: number | null;
  geometrySource: ActionGeometryOrigin;
  origin: ActionGeometryOrigin;
};

export function resolveGeometryOriginFromConfidence(
  confidence: number | null | undefined,
): ActionGeometryOrigin {
  return resolveGeometrySourceFromConfidenceResolution(confidence);
}

export function isRenderableDrawing(
  drawing: Pick<ActionDrawing, "kind" | "coordinates"> | null | undefined,
): drawing is ActionDrawing {
  if (!drawing) {
    return false;
  }
  const minimumPoints = drawing.kind === "polygon" ? 3 : 2;
  return drawing.coordinates.length >= minimumPoints;
}



export function toGeoJsonString(drawing: ActionDrawing | null): string | null {
  if (!drawing) {
    return null;
  }
  if (drawing.kind === "polyline") {
    return JSON.stringify({
      type: "LineString",
      coordinates: drawing.coordinates.map(([lat, lng]) => [lng, lat]),
    });
  }
  return JSON.stringify({
    type: "Polygon",
    coordinates: [drawing.coordinates.map(([lat, lng]) => [lng, lat])],
  });
}

export function parseDrawingFromGeoJson(
  geojson: string | null | undefined,
  kindHint?: ActionGeometryKind | null,
): ActionDrawing | null {
  if (!geojson || typeof geojson !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(geojson) as
      | {
        type?: string;
        coordinates?: unknown;
      }
      | null;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (parsed.type === "LineString" || kindHint === "polyline") {
      if (!Array.isArray(parsed.coordinates)) {
        return null;
      }
      const coordinates = parsed.coordinates
        .map((point) =>
          Array.isArray(point) && point.length >= 2
            ? [Number(point[1]), Number(point[0])] as [number, number]
            : null,
        )
        .filter((point): point is [number, number] => {
          if (!point) {
            return false;
          }
          return Number.isFinite(point[0]) && Number.isFinite(point[1]);
        });

      return isRenderableDrawing({ kind: "polyline", coordinates })
        ? { kind: "polyline", coordinates }
        : null;
    }

    if (parsed.type === "Polygon" || kindHint === "polygon") {
      if (!Array.isArray(parsed.coordinates) || !Array.isArray(parsed.coordinates[0])) {
        return null;
      }
      const ring = parsed.coordinates[0] as unknown[];
      const coordinates = ring
        .map((point) =>
          Array.isArray(point) && point.length >= 2
            ? [Number(point[1]), Number(point[0])] as [number, number]
            : null,
        )
        .filter((point): point is [number, number] => {
          if (!point) {
            return false;
          }
          return Number.isFinite(point[0]) && Number.isFinite(point[1]);
        });

      const normalizedCoordinates =
        coordinates.length >= 2 &&
          coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
          coordinates[0][1] === coordinates[coordinates.length - 1][1]
          ? coordinates.slice(0, -1)
          : coordinates;

      return isRenderableDrawing({
        kind: "polygon",
        coordinates: normalizedCoordinates,
      })
        ? { kind: "polygon", coordinates: normalizedCoordinates }
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildPersistedGeometry(params: {
  drawing?: ActionDrawing | null;
  geojson?: string | null;
  confidence?: number | null;
  geometrySourceHint?: ActionGeometryOrigin | null;
  originHint?: ActionGeometryOrigin | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
}): PersistedDerivedGeometry {
  const resolved = resolveBestGeometryResolution({
    drawing: params.drawing ?? null,
    geojson: params.geojson ?? null,
    confidence: params.confidence ?? null,
    geometrySourceHint: params.geometrySourceHint ?? params.originHint ?? null,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    locationLabel: params.locationLabel ?? null,
    departureLocationLabel: params.departureLocationLabel ?? null,
    arrivalLocationLabel: params.arrivalLocationLabel ?? null,
    routeStyle: params.routeStyle ?? null,
  });

  return {
    kind: resolved.kind,
    coordinates: resolved.coordinates,
    geojson: resolved.geojson,
    confidence: resolved.confidence,
    geometrySource: resolved.geometrySource,
    origin: resolved.geometrySource,
  };
}

export function buildPersistedGeometryFromStoredFields(params: {
  derivedGeometryKind?: ActionGeometryKind | null;
  derivedGeometryGeoJson?: string | null;
  geometrySource?: ActionGeometryOrigin | null;
  geometryConfidence?: number | null;
  manualDrawing?: ActionDrawing | null;
  manualDrawingGeoJson?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
}): PersistedDerivedGeometry {
  const storedDrawing =
    parseDrawingFromGeoJson(
      params.derivedGeometryGeoJson,
      params.derivedGeometryKind ?? null,
    ) ??
    params.manualDrawing ??
    parseDrawingFromGeoJson(params.manualDrawingGeoJson, null);

  return buildPersistedGeometry({
    drawing: storedDrawing,
    geojson:
      storedDrawing
        ? params.derivedGeometryGeoJson ??
        params.manualDrawingGeoJson ??
        toGeoJsonString(storedDrawing)
        : null,
    confidence: params.geometryConfidence ?? null,
    geometrySourceHint: params.geometrySource ?? null,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    locationLabel: params.locationLabel ?? null,
    departureLocationLabel: params.departureLocationLabel ?? null,
    arrivalLocationLabel: params.arrivalLocationLabel ?? null,
    routeStyle: params.routeStyle ?? null,
  });
}
