import type { ActionDrawing } from "@/lib/actions/types";

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

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function toPointCoordinates(
  latitude: number | null,
  longitude: number | null,
): [number, number][] {
  if (latitude === null || longitude === null) {
    return [];
  }
  return [[latitude, longitude]];
}

export function hasCoordinates(
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

export function buildEllipsePolygon(
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

export function buildSyntheticRoute(
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

export function normalizeLabel(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasPreciseLocationLabel(value: string | null | undefined): boolean {
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
