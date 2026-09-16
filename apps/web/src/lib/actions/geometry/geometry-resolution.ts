import type {
  ActionDrawing,
  ActionGeometryKind,
  ActionGeometrySource,
} from "../types.ts";
import { findMatchingGeometry } from "../../geo/geometry-reference.ts";
import {
  GEOMETRY_CONFIDENCE,
  buildEllipsePolygon,
  hasCoordinates,
  hasPreciseLocationLabel,
  normalizeLabel,
  toPointCoordinates,
} from "./geometry-core.ts";

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
    case "gpx_import":
      return GEOMETRY_CONFIDENCE.GPX_IMPORT;
    case "reference":
      return GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY;
    case "routed":
      return GEOMETRY_CONFIDENCE.AUTO_ROUTE;
    case "estimated_route":
      return GEOMETRY_CONFIDENCE.ESTIMATED_ROUTE;
    case "estimated_area":
      return GEOMETRY_CONFIDENCE.LABEL_POLYGON;
    case "fallback_point":
    default:
      return GEOMETRY_CONFIDENCE.POINT_FALLBACK;
  }
}

function buildReferenceGeometryResolution(anchorLabel: string): GeometryResolution | null {
  const referenceDrawing = findMatchingGeometry(anchorLabel);
  if (!referenceDrawing || !isRenderableDrawing(referenceDrawing)) {
    return null;
  }

  return {
    kind: referenceDrawing.kind,
    coordinates: referenceDrawing.coordinates,
    geojson: toGeoJsonString(referenceDrawing),
    confidence: GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY,
    geometrySource: "reference",
  };
}

function buildCoordinateGeometryResolution(params: {
  latitude?: number | null;
  longitude?: number | null;
  anchorLabel: string;
}): GeometryResolution | null {
  if (!hasCoordinates(params.latitude ?? null, params.longitude ?? null)) {
    return null;
  }

  const center = {
    latitude: Number(params.latitude),
    longitude: Number(params.longitude),
  };

  if (hasPreciseLocationLabel(params.anchorLabel)) {
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

function buildFallbackPointResolution(params: {
  latitude?: number | null;
  longitude?: number | null;
}): GeometryResolution {
  return {
    kind: "point",
    coordinates: toPointCoordinates(params.latitude ?? null, params.longitude ?? null),
    geojson: null,
    confidence: GEOMETRY_CONFIDENCE.POINT_FALLBACK,
    geometrySource: "fallback_point",
  };
}

function resolveDrawingGeometrySource(
  params: ResolveBestGeometryParams,
): ActionGeometrySource {
  if (params.geometrySourceHint) {
    return params.geometrySourceHint;
  }

  if (params.confidence == null) {
    return "manual";
  }

  return resolveGeometrySourceFromConfidence(params.confidence);
}

function buildResolvedDrawingGeometry(params: {
  drawing: ActionDrawing;
  geometrySource: ActionGeometrySource;
  geojson?: string | null;
  confidence?: number | null;
}): GeometryResolution {
  return {
    kind: params.drawing.kind,
    coordinates: params.drawing.coordinates,
    geojson: params.geojson ?? toGeoJsonString(params.drawing),
    confidence:
      clampConfidence(params.confidence) ??
      confidenceFromSource(params.geometrySource),
    geometrySource: params.geometrySource,
  };
}

function deriveFallbackResolution(params: {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
}): GeometryResolution {
  const locationLabel = normalizeLabel(params.locationLabel);
  const departureLocationLabel = normalizeLabel(params.departureLocationLabel);
  const arrivalLocationLabel = normalizeLabel(params.arrivalLocationLabel);
  const anchorLabel =
    locationLabel || departureLocationLabel || arrivalLocationLabel;

  return (
    (anchorLabel ? buildReferenceGeometryResolution(anchorLabel) : null) ??
    buildCoordinateGeometryResolution({
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      anchorLabel,
    }) ??
    buildFallbackPointResolution({
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
    })
  );
}

function resolveDrawingGeometry(params: ResolveBestGeometryParams): GeometryResolution {
  const drawing = isRenderableDrawing(params.drawing) ? params.drawing : null;
  if (!drawing) {
    return deriveFallbackResolution({
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      locationLabel: params.locationLabel ?? null,
      departureLocationLabel: params.departureLocationLabel ?? null,
      arrivalLocationLabel: params.arrivalLocationLabel ?? null,
    });
  }

  return buildResolvedDrawingGeometry({
    drawing,
    geometrySource: resolveDrawingGeometrySource(params),
    geojson: params.geojson ?? null,
    confidence: params.confidence ?? null,
  });
}

export function resolveBestGeometry(
  params: ResolveBestGeometryParams,
): GeometryResolution {
  return resolveDrawingGeometry(params);
}
