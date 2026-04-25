import type { ActionDrawing, ActionGeometryKind } from "@/lib/actions/types";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";
import {
  GEOMETRY_CONFIDENCE as RESOLUTION_GEOMETRY_CONFIDENCE,
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

export const GEOMETRY_CONFIDENCE = RESOLUTION_GEOMETRY_CONFIDENCE;

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

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

export function toPointCoordinates(
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
  return typeof latitude === "number" && Number.isFinite(latitude) &&
    typeof longitude === "number" && Number.isFinite(longitude);
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

function buildFallbackGeometry(params: {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
}): { drawing: ActionDrawing | null; confidence: number; origin: ActionGeometryOrigin } {
  const locationLabel = normalizeLabel(params.locationLabel);
  const departureLocationLabel = normalizeLabel(params.departureLocationLabel);
  const arrivalLocationLabel = normalizeLabel(params.arrivalLocationLabel);
  const anchorLabel =
    locationLabel || departureLocationLabel || arrivalLocationLabel;

  if (anchorLabel) {
    const referenceDrawing = findMatchingGeometry(anchorLabel);
    if (referenceDrawing && isRenderableDrawing(referenceDrawing)) {
      return {
        drawing: referenceDrawing,
        confidence: GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY,
        origin: "reference",
      };
    }
  }

  if (hasCoordinates(params.latitude ?? null, params.longitude ?? null)) {
    const center = {
      latitude: Number(params.latitude),
      longitude: Number(params.longitude),
    };
    if (departureLocationLabel && arrivalLocationLabel) {
      return {
        drawing: buildSyntheticRoute(center, params.routeStyle),
        confidence: GEOMETRY_CONFIDENCE.SYNTHETIC_ROUTE,
        origin: "routed",
      };
    }
    if (hasPreciseLocationLabel(anchorLabel)) {
      return {
        drawing: buildEllipsePolygon(center, 85, 55),
        confidence: GEOMETRY_CONFIDENCE.LABEL_POLYGON,
        origin: "estimated_area",
      };
    }
    return {
      drawing: buildEllipsePolygon(center, 110, 72),
      confidence: GEOMETRY_CONFIDENCE.COORDINATE_ELLIPSE,
      origin: "estimated_area",
    };
  }

  return {
    drawing: null,
    confidence: GEOMETRY_CONFIDENCE.POINT_FALLBACK,
    origin: "fallback_point",
  };
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
