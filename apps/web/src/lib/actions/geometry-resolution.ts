import type { ActionDrawing, ActionGeometryKind } from "./types.ts";
import { findMatchingGeometry } from "../geo/geometry-reference.ts";
import {
  GEOMETRY_CONFIDENCE,
  buildEllipsePolygon,
  buildSyntheticRoute,
  hasCoordinates,
  hasPreciseLocationLabel,
  normalizeLabel,
  toPointCoordinates,
} from "./geometry-core";

export type ActionGeometrySource =
  | "manual"
  | "reference"
  | "routed"
  | "estimated_area"
  | "fallback_point";

export type GeometryResolution = {
  kind: ActionGeometryKind;
  coordinates: [number, number][];
  geojson: string | null;
  confidence: number | null;
  geometrySource: ActionGeometrySource;
};

export type ResolveBestGeometryParams = {
  drawing?: ActionDrawing | null;
  geojson?: string | null;
  confidence?: number | null;
  geometrySourceHint?: ActionGeometrySource | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
};

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

export function resolveGeometrySourceFromConfidence(
  confidence: number | null | undefined,
): ActionGeometrySource {
  const value = clampConfidence(confidence);
  if (value === null) {
    return "fallback_point";
  }
  if (value >= 0.9) {
    return "manual";
  }
  if (value >= 0.77) {
    return "routed";
  }
  if (value >= 0.71) {
    return "reference";
  }
  if (value >= 0.55) {
    return "routed";
  }
  if (value >= 0.44) {
    return "estimated_area";
  }
  return "fallback_point";
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

function toGeoJsonString(drawing: ActionDrawing | null): string | null {
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

function confidenceFromSource(source: ActionGeometrySource): number {
  switch (source) {
    case "manual":
      return GEOMETRY_CONFIDENCE.MANUAL_DRAWING;
    case "reference":
      return GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY;
    case "routed":
      return GEOMETRY_CONFIDENCE.AUTO_ROUTE;
    case "estimated_area":
      return GEOMETRY_CONFIDENCE.LABEL_POLYGON;
    case "fallback_point":
    default:
      return GEOMETRY_CONFIDENCE.POINT_FALLBACK;
  }
}

function deriveFallbackResolution(params: {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
}): GeometryResolution {
  const locationLabel = normalizeLabel(params.locationLabel);
  const departureLocationLabel = normalizeLabel(params.departureLocationLabel);
  const arrivalLocationLabel = normalizeLabel(params.arrivalLocationLabel);
  const anchorLabel =
    locationLabel || departureLocationLabel || arrivalLocationLabel;

  if (anchorLabel) {
    const referenceDrawing = findMatchingGeometry(anchorLabel);
    if (referenceDrawing && isRenderableDrawing(referenceDrawing)) {
      return {
        kind: referenceDrawing.kind,
        coordinates: referenceDrawing.coordinates,
        geojson: toGeoJsonString(referenceDrawing),
        confidence: GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY,
        geometrySource: "reference",
      };
    }
  }

  if (hasCoordinates(params.latitude ?? null, params.longitude ?? null)) {
    const center = {
      latitude: Number(params.latitude),
      longitude: Number(params.longitude),
    };

    if (departureLocationLabel && arrivalLocationLabel) {
      const drawing = buildSyntheticRoute(center, params.routeStyle);
      return {
        kind: drawing.kind,
        coordinates: drawing.coordinates,
        geojson: toGeoJsonString(drawing),
        confidence: GEOMETRY_CONFIDENCE.SYNTHETIC_ROUTE,
        geometrySource: "routed",
      };
    }

    if (hasPreciseLocationLabel(anchorLabel)) {
      const drawing = buildEllipsePolygon(center, 85, 55);
      return {
        kind: drawing.kind,
        coordinates: drawing.coordinates,
        geojson: toGeoJsonString(drawing),
        confidence: GEOMETRY_CONFIDENCE.LABEL_POLYGON,
        geometrySource: "estimated_area",
      };
    }

    const drawing = buildEllipsePolygon(center, 110, 72);
    return {
      kind: drawing.kind,
      coordinates: drawing.coordinates,
      geojson: toGeoJsonString(drawing),
      confidence: GEOMETRY_CONFIDENCE.COORDINATE_ELLIPSE,
      geometrySource: "estimated_area",
    };
  }

  return {
    kind: "point",
    coordinates: toPointCoordinates(params.latitude ?? null, params.longitude ?? null),
    geojson: null,
    confidence: GEOMETRY_CONFIDENCE.POINT_FALLBACK,
    geometrySource: "fallback_point",
  };
}

export function resolveBestGeometry(
  params: ResolveBestGeometryParams,
): GeometryResolution {
  const drawing = isRenderableDrawing(params.drawing) ? params.drawing : null;
  if (drawing) {
    const geometrySource =
      params.geometrySourceHint ??
      (params.confidence == null
        ? "manual"
        : resolveGeometrySourceFromConfidence(params.confidence));
    return {
      kind: drawing.kind,
      coordinates: drawing.coordinates,
      geojson: params.geojson ?? toGeoJsonString(drawing),
      confidence:
        clampConfidence(params.confidence) ?? confidenceFromSource(geometrySource),
      geometrySource,
    };
  }

  return deriveFallbackResolution({
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    locationLabel: params.locationLabel ?? null,
    departureLocationLabel: params.departureLocationLabel ?? null,
    arrivalLocationLabel: params.arrivalLocationLabel ?? null,
    routeStyle: params.routeStyle ?? null,
  });
}
