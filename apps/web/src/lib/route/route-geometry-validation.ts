import type { RouteGeometry, RouteGeometryLeg } from "./route-contract";

export const MAX_OPERATIONAL_ROUTE_LOOPS = 12;
export const MAX_ROUTE_GEOMETRY_COORDINATES = 10_000;
export const MAX_ROUTE_GEOMETRY_LEGS = 500;
export const MAX_PLANNER_TECHNICAL_STOPS = 200;

export function isRouteGeometry(value: unknown): value is RouteGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<RouteGeometry>;
  return (
    geometry.isLoop === true &&
    (geometry.origin === null || isCoordinate(geometry.origin)) &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length <= MAX_ROUTE_GEOMETRY_COORDINATES &&
    geometry.coordinates.every(isCoordinate) &&
    finiteNonNegative(geometry.distanceKm) &&
    finiteNonNegative(geometry.durationMinutes) &&
    Array.isArray(geometry.legs) &&
    geometry.legs.length <= MAX_ROUTE_GEOMETRY_LEGS &&
    geometry.legs.every(isRouteGeometryLeg) &&
    ["osrm", "fossgis-osrm", "none"].includes(geometry.provider ?? "") &&
    (geometry.profile === null || geometry.profile === "foot") &&
    ["network", "fallback"].includes(geometry.mode ?? "") &&
    typeof geometry.estimated === "boolean" &&
    (geometry.returnLeg === null || isRouteGeometryLeg(geometry.returnLeg))
  );
}

export function isRouteGeometryLeg(value: unknown): value is RouteGeometryLeg {
  if (!value || typeof value !== "object") return false;
  const leg = value as Partial<RouteGeometryLeg>;
  return (
    finiteInteger(leg.fromStopIndex, 0, 500) &&
    finiteInteger(leg.toStopIndex, 0, 500) &&
    finiteNonNegative(leg.distanceKm) &&
    finiteNonNegative(leg.estimatedMinutes)
  );
}

export function isCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    finiteNumberBetween(value[0], -90, 90) &&
    finiteNumberBetween(value[1], -180, 180)
  );
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function finiteInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function finiteNumberBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
