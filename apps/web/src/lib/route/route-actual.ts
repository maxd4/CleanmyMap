import type { RouteCalibrationContext } from "./route-calibration";
import type {
  RouteGeometry,
  RouteStop,
} from "./route-contract";
import type { ActionDrawing } from "@/lib/actions/types";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import type {
  RouteGroupRoute,
  RouteRecommendationResponse,
} from "./route-response-contract";

export const ACTUAL_ROUTE_VERSION = "actual-route-v1" as const;

export type ActualRouteZoneKey = "departure" | "midpoint" | "arrival";

export type ActualRouteZone = {
  label: string | null;
  coordinate: [number, number] | null;
};

export type ActualRouteTechnicalStop = Pick<
  RouteStop,
  "id" | "label" | "latitude" | "longitude"
>;

export type ActualRouteLoop = {
  routeId: string;
  groupIndex: number;
  geometry: RouteGeometry;
  /** Planner stops remain available for scientific traceability, never public markers. */
  technicalStops: ActualRouteTechnicalStop[];
};

export type ActualRoute = {
  version: typeof ACTUAL_ROUTE_VERSION;
  initializedAt: string;
  source: "planner";
  plannerGroupCount: number;
  routes: ActualRouteLoop[];
  zones: Record<ActualRouteZoneKey, ActualRouteZone>;
};

export type PlannerActionHandoff = {
  actualRoute: ActualRoute;
  routeCalibrationContext: RouteCalibrationContext | null;
};

export function createActualRouteFromRecommendation(
  recommendation: Pick<RouteRecommendationResponse, "generatedAt" | "groupCount" | "routeGeometry"> & {
    stops: readonly RouteStop[];
    groupRoutes: ReadonlyArray<Pick<RouteGroupRoute, "groupIndex" | "routeGeometry"> & {
      stops: readonly RouteStop[];
    }>;
  },
): ActualRoute {
  const routes = recommendation.groupRoutes.length > 0
    ? recommendation.groupRoutes.map((group) => ({
        routeId: `planner-group-${group.groupIndex}`,
        groupIndex: group.groupIndex,
        geometry: structuredClone(group.routeGeometry),
        technicalStops: group.stops.map(toTechnicalStop),
      }))
    : [{
        routeId: "planner-group-1",
        groupIndex: 1,
        geometry: structuredClone(recommendation.routeGeometry),
        technicalStops: recommendation.stops.map(toTechnicalStop),
      }];

  const firstGeometry = routes[0]?.geometry ?? recommendation.routeGeometry;
  const firstCoordinates = firstGeometry.coordinates;
  return {
    version: ACTUAL_ROUTE_VERSION,
    initializedAt: recommendation.generatedAt,
    source: "planner",
    plannerGroupCount: recommendation.groupCount,
    routes,
    zones: {
      departure: {
        label: null,
        coordinate: firstGeometry.origin,
      },
      midpoint: {
        label: null,
        coordinate: firstCoordinates[Math.floor(firstCoordinates.length / 2)] ?? null,
      },
      arrival: {
        label: null,
        coordinate: firstCoordinates.at(-1) ?? firstGeometry.origin,
      },
    },
  };
}

export function updateActualRouteZone(
  actualRoute: ActualRoute,
  zone: ActualRouteZoneKey,
  patch: Partial<ActualRouteZone>,
): ActualRoute {
  return {
    ...structuredClone(actualRoute),
    zones: {
      ...structuredClone(actualRoute.zones),
      [zone]: {
        ...structuredClone(actualRoute.zones[zone]),
        ...patch,
      },
    },
  };
}

export function removeActualRouteLoop(
  actualRoute: ActualRoute,
  routeId: string,
): ActualRoute {
  return {
    ...structuredClone(actualRoute),
    routes: actualRoute.routes.filter((route) => route.routeId !== routeId),
  };
}

/** Uses the remaining real loops as the group count only when no better source exists. */
export function getActualRouteGroupCount(actualRoute: ActualRoute): number | null {
  return actualRoute.routes.length > 0 ? actualRoute.routes.length : null;
}

export function replaceActualRouteLoop(
  actualRoute: ActualRoute,
  routeId: string,
  geometry: RouteGeometry,
): ActualRoute {
  return {
    ...structuredClone(actualRoute),
    routes: actualRoute.routes.map((route) =>
      route.routeId === routeId
        ? { ...route, geometry: structuredClone(geometry) }
        : route,
    ),
  };
}

/**
 * Converts the editable action polyline into a real closed loop without
 * inventing network routing or per-stop timings.
 */
export function buildActualRouteGeometryFromDrawing(
  drawing: ActionDrawing | null | undefined,
): RouteGeometry | null {
  if (drawing?.kind !== "polyline" || drawing.coordinates.length < 2) {
    return null;
  }

  const coordinates = drawing.coordinates.map(([latitude, longitude]) => [
    latitude,
    longitude,
  ] as [number, number]);
  const first = coordinates[0];
  const last = coordinates.at(-1);
  if (!first || !last) return null;

  const closedCoordinates =
    first[0] === last[0] && first[1] === last[1]
      ? coordinates
      : [...coordinates, first];
  return createFallbackRouteGeometry(closedCoordinates);
}

/** Public map segments intentionally omit technical stops and per-stop timings. */
export function getPublicActualRouteSegments(
  actualRoute: ActualRoute | null | undefined,
): Array<{ routeId: string; groupIndex: number; coordinates: [number, number][] }> {
  return (actualRoute?.routes ?? [])
    .filter((route) => route.geometry.coordinates.length >= 2)
    .map((route) => ({
      routeId: route.routeId,
      groupIndex: route.groupIndex,
      coordinates: route.geometry.coordinates.map(([latitude, longitude]) => [
        latitude,
        longitude,
      ] as [number, number]),
    }));
}

export function isActualRoute(value: unknown): value is ActualRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<ActualRoute>;
  return (
    route.version === ACTUAL_ROUTE_VERSION &&
    isIsoDate(route.initializedAt) &&
    route.source === "planner" &&
    isIntegerBetween(route.plannerGroupCount, 1, 12) &&
    Array.isArray(route.routes) &&
    route.routes.every(isActualRouteLoop) &&
    isActualRouteZones(route.zones)
  );
}

function toTechnicalStop(stop: RouteStop): ActualRouteTechnicalStop {
  return {
    id: stop.id,
    label: stop.label,
    latitude: stop.latitude,
    longitude: stop.longitude,
  };
}

function isActualRouteLoop(value: unknown): value is ActualRouteLoop {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<ActualRouteLoop>;
  return (
    typeof route.routeId === "string" &&
    route.routeId.length > 0 &&
    isIntegerBetween(route.groupIndex, 1, 12) &&
    isRouteGeometry(route.geometry) &&
    Array.isArray(route.technicalStops) &&
    route.technicalStops.every(isTechnicalStop)
  );
}

function isTechnicalStop(value: unknown): value is ActualRouteTechnicalStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Partial<ActualRouteTechnicalStop>;
  return (
    typeof stop.id === "string" &&
    typeof stop.label === "string" &&
    isFiniteCoordinate(stop.latitude, -90, 90) &&
    isFiniteCoordinate(stop.longitude, -180, 180)
  );
}

function isRouteGeometry(value: unknown): value is RouteGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<RouteGeometry>;
  return (
    geometry.isLoop === true &&
    (geometry.origin === null || isCoordinate(geometry.origin)) &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.every(isCoordinate) &&
    typeof geometry.distanceKm === "number" &&
    Number.isFinite(geometry.distanceKm) &&
    geometry.distanceKm >= 0 &&
    typeof geometry.durationMinutes === "number" &&
    Number.isFinite(geometry.durationMinutes) &&
    geometry.durationMinutes >= 0 &&
    Array.isArray(geometry.legs) &&
    ["osrm", "fossgis-osrm", "none"].includes(geometry.provider ?? "") &&
    (geometry.profile === null || geometry.profile === "foot") &&
    ["network", "fallback"].includes(geometry.mode ?? "") &&
    typeof geometry.estimated === "boolean"
  );
}

function isActualRouteZones(value: unknown): value is ActualRoute["zones"] {
  if (!value || typeof value !== "object") return false;
  const zones = value as Partial<ActualRoute["zones"]>;
  return [zones.departure, zones.midpoint, zones.arrival].every(isActualRouteZone);
}

function isActualRouteZone(value: unknown): value is ActualRouteZone {
  if (!value || typeof value !== "object") return false;
  const zone = value as Partial<ActualRouteZone>;
  return (
    (zone.label === null || typeof zone.label === "string") &&
    (zone.coordinate === null || isCoordinate(zone.coordinate))
  );
}

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    isFiniteCoordinate(value[0], -90, 90) &&
    isFiniteCoordinate(value[1], -180, 180);
}

function isFiniteCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}
