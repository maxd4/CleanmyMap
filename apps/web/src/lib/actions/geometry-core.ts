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

function roundRouteCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function toRoutePoint(latitude: number, longitude: number): [number, number] {
  return [roundRouteCoordinate(latitude), roundRouteCoordinate(longitude)];
}

function resolveRouteDirection(primaryDelta: number, fallbackDelta: number): number {
  if (primaryDelta !== 0) {
    return Math.sign(primaryDelta);
  }
  if (fallbackDelta !== 0) {
    return Math.sign(fallbackDelta);
  }
  return 1;
}

export function buildPedestrianRoute(
  start: GeoPoint,
  end: GeoPoint,
  routeStyle: "direct" | "souple" | null | undefined,
): ActionDrawing {
  const latDiff = end.latitude - start.latitude;
  const lngDiff = end.longitude - start.longitude;
  const majorAxisIsLongitude = Math.abs(lngDiff) >= Math.abs(latDiff);
  const detour = Math.max(
    0.00012,
    Math.min(0.001, Math.max(Math.abs(latDiff), Math.abs(lngDiff)) * 0.22),
  );
  const direction = majorAxisIsLongitude
    ? resolveRouteDirection(latDiff, lngDiff)
    : resolveRouteDirection(lngDiff, latDiff);

  if (routeStyle === "souple") {
    if (majorAxisIsLongitude) {
      return {
        kind: "polyline",
        coordinates: [
          toRoutePoint(start.latitude, start.longitude),
          toRoutePoint(start.latitude + direction * detour, start.longitude + lngDiff * 0.25),
          toRoutePoint(start.latitude + direction * detour * 1.35, start.longitude + lngDiff * 0.5),
          toRoutePoint(start.latitude + direction * detour, start.longitude + lngDiff * 0.75),
          toRoutePoint(end.latitude, end.longitude),
        ],
      };
    }

    return {
      kind: "polyline",
      coordinates: [
        toRoutePoint(start.latitude, start.longitude),
        toRoutePoint(start.latitude + latDiff * 0.25, start.longitude + direction * detour),
        toRoutePoint(start.latitude + latDiff * 0.5, start.longitude + direction * detour * 1.35),
        toRoutePoint(start.latitude + latDiff * 0.75, start.longitude + direction * detour),
        toRoutePoint(end.latitude, end.longitude),
      ],
    };
  }

  if (majorAxisIsLongitude) {
    return {
      kind: "polyline",
      coordinates: [
        toRoutePoint(start.latitude, start.longitude),
        toRoutePoint(start.latitude + direction * detour, end.longitude),
        toRoutePoint(end.latitude, end.longitude),
      ],
    };
  }

  return {
    kind: "polyline",
    coordinates: [
      toRoutePoint(start.latitude, start.longitude),
      toRoutePoint(end.latitude, start.longitude + direction * detour),
      toRoutePoint(end.latitude, end.longitude),
    ],
  };
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
  return buildPedestrianRoute(
    {
      latitude: center.latitude - latDelta,
      longitude: center.longitude - lngDelta,
    },
    {
      latitude: center.latitude + latDelta,
      longitude: center.longitude + lngDelta,
    },
    routeStyle,
  );
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
