import type { RouteGeometry, RouteGeometryLeg } from "./route-contract";

export const MAX_OPERATIONAL_ROUTE_LOOPS = 12;
export const MAX_ROUTE_GEOMETRY_COORDINATES = 10_000;
export const MAX_ROUTE_GEOMETRY_LEGS = 500;
export const MAX_PLANNER_TECHNICAL_STOPS = 200;

function hasValidRouteGeometryCollections(geometry: Partial<RouteGeometry>): boolean {
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length > MAX_ROUTE_GEOMETRY_COORDINATES) return false;
  if (!geometry.coordinates.every(isCoordinate)) return false;
  if (!Array.isArray(geometry.legs) || geometry.legs.length > MAX_ROUTE_GEOMETRY_LEGS) return false;
  return geometry.legs.every(isRouteGeometryLeg);
}

function hasValidRouteGeometryMeasures(geometry: Partial<RouteGeometry>): boolean {
  return finiteNonNegative(geometry.distanceKm) && finiteNonNegative(geometry.durationMinutes);
}

function hasValidRouteGeometryMetadata(geometry: Partial<RouteGeometry>): boolean {
  if (geometry.origin !== null && !isCoordinate(geometry.origin)) return false;
  return (
    ["osrm", "fossgis-osrm", "none"].includes(geometry.provider ?? "") &&
    (geometry.profile === null || geometry.profile === "foot") &&
    ["network", "fallback"].includes(geometry.mode ?? "") &&
    typeof geometry.estimated === "boolean" &&
    (geometry.returnLeg === null || isRouteGeometryLeg(geometry.returnLeg))
  );
}

export function isRouteGeometry(value: unknown): value is RouteGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<RouteGeometry>;
  if (geometry.isLoop !== true || !hasValidRouteGeometryCollections(geometry) ||
    !hasValidRouteGeometryMeasures(geometry) || !hasValidRouteGeometryMetadata(geometry)) return false;
  if (geometry.coordinates!.length === 0) {
    return isEmptyRouteGeometryPlaceholder(geometry);
  }

  return isClosedRouteGeometry(geometry);
}

function isEmptyRouteGeometryPlaceholder(
  geometry: Partial<RouteGeometry>,
): boolean {
  return (
    geometry.origin === null &&
    geometry.returnLeg === null &&
    geometry.distanceKm === 0 &&
    geometry.durationMinutes === 0 &&
    geometry.legs!.length === 0 &&
    geometry.provider === "none" &&
    geometry.profile === null &&
    geometry.mode === "fallback" &&
    geometry.estimated === true
  );
}

function isClosedRouteGeometry(geometry: Partial<RouteGeometry>): boolean {
  const coordinates = geometry.coordinates!;
  const returnLeg = geometry.returnLeg;
  const legs = geometry.legs!;
  const lastLeg = legs.at(-1);

  return (
    coordinates.length >= 2 &&
    isCoordinate(geometry.origin) &&
    areCoordinatesClose(coordinates[0], geometry.origin) &&
    areCoordinatesClose(coordinates[0], coordinates.at(-1)) &&
    returnLeg !== null &&
    returnLeg !== undefined &&
    legs.length > 0 &&
    isRouteGeometryLeg(lastLeg) &&
    hasSameRouteLegCore(lastLeg, returnLeg) &&
    returnLeg.toStopIndex === returnLeg.fromStopIndex + 1 &&
    geometry.distanceKm! + 1e-9 >= returnLeg.distanceKm &&
    geometry.durationMinutes! + 1e-9 >= returnLeg.estimatedMinutes
  );
}

function hasSameRouteLegCore(
  left: RouteGeometryLeg,
  right: RouteGeometryLeg,
): boolean {
  return (
    left.fromStopIndex === right.fromStopIndex &&
    left.toStopIndex === right.toStopIndex &&
    left.distanceKm === right.distanceKm &&
    left.estimatedMinutes === right.estimatedMinutes
  );
}

function areCoordinatesClose(
  left: unknown,
  right: unknown,
  tolerance = 1e-6,
): boolean {
  return isCoordinate(left) && isCoordinate(right) &&
    Math.abs(left[0] - right[0]) <= tolerance &&
    Math.abs(left[1] - right[1]) <= tolerance;
}

function isRouteGeometryLeg(value: unknown): value is RouteGeometryLeg {
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
