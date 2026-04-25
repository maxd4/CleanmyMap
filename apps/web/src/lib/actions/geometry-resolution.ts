import type { ActionDrawing, ActionGeometryKind } from "./types.ts";
import { findMatchingGeometry } from "../geo/geometry-reference.ts";

export type ActionGeometrySource =
  | "manual"
  | "reference"
  | "routed"
  | "estimated_area"
  | "fallback_point";

export const GEOMETRY_CONFIDENCE = {
  MANUAL_DRAWING: 1,
  PERSISTED_IMPORTED: 0.92,
  AUTO_ROUTE: 0.78,
  REFERENCE_GEOMETRY: 0.72,
  SYNTHETIC_ROUTE: 0.58,
  LABEL_POLYGON: 0.52,
  COORDINATE_ELLIPSE: 0.44,
  POINT_FALLBACK: 0.24,
} as const;

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

function toPointCoordinates(
  latitude: number | null,
  longitude: number | null,
): [number, number][] {
  if (latitude === null || longitude === null) {
    return [];
  }
  return [[latitude, longitude]];
}

type GeoPoint = {
  latitude: number;
  longitude: number;
};

function hasCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

function metersToLatitudeDelta(meters: number): number {
  return meters / 111_320;
}

function metersToLongitudeDelta(meters: number, latitude: number): number {
  const radius = Math.max(0.1, Math.cos((latitude * Math.PI) / 180));
  return meters / (111_320 * radius);
}

function buildEllipsePolygon(
  center: GeoPoint,
  radiusMetersX: number,
  radiusMetersY: number,
): ActionDrawing {
  const coordinates: [number, number][] = [];
  const steps = 12;
  for (let index = 0; index < steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps;
    const latOffset = metersToLatitudeDelta(radiusMetersY * Math.sin(angle));
    const lngOffset = metersToLongitudeDelta(
      radiusMetersX * Math.cos(angle),
      center.latitude,
    );
    coordinates.push([
      Number((center.latitude + latOffset).toFixed(6)),
      Number((center.longitude + lngOffset).toFixed(6)),
    ]);
  }
  return {
    kind: "polygon",
    coordinates,
  };
}

function buildSyntheticRoute(
  center: GeoPoint,
  routeStyle: "direct" | "souple" | null | undefined,
): ActionDrawing {
  const reachMeters = routeStyle === "direct" ? 120 : 180;
  const latDelta = metersToLatitudeDelta(routeStyle === "direct" ? 20 : 55);
  const lngDelta = metersToLongitudeDelta(reachMeters, center.latitude);
  return {
    kind: "polyline",
    coordinates: [
      [
        Number((center.latitude - latDelta).toFixed(6)),
        Number((center.longitude - lngDelta).toFixed(6)),
      ],
      [center.latitude, center.longitude],
      [
        Number((center.latitude + latDelta).toFixed(6)),
        Number((center.longitude + lngDelta).toFixed(6)),
      ],
    ],
  };
}

function normalizeLabel(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasPreciseLocationLabel(value: string | null | undefined): boolean {
  const label = normalizeLabel(value);
  if (label.length < 10) {
    return false;
  }
  const lowered = label.toLowerCase();
  if (/\b\d{5}\b/.test(label) || /\b\d+[a-z]?\b/i.test(label)) {
    return true;
  }
  if (label.includes(",") || label.includes("→")) {
    return true;
  }
  return [
    "rue",
    "avenue",
    "av.",
    "boulevard",
    "bd",
    "place",
    "pl.",
    "quai",
    "impasse",
    "allée",
    "allee",
    "villa",
    "jardin",
    "parc",
    "école",
    "ecole",
    "mairie",
    "porte",
  ].some((token) => lowered.includes(token));
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
