import { routeDistanceKm, type RoutePlannerCandidate, type RoutePlannerOrigin } from "./route-planner";
import { isRoutePlannerCandidateEligible } from "./route-planner";
import { isCoordinate } from "./route-geometry-validation";
import type { RouteStartSelection, RouteStartZone } from "./route-response-contract";

export function routeStartZoneContains(
  zone: RouteStartZone,
  coordinate: Pick<RoutePlannerCandidate, "latitude" | "longitude">,
): boolean {
  const { latitude, longitude } = coordinate;
  const inBounds = latitude >= zone.bounds.south && latitude <= zone.bounds.north &&
    longitude >= zone.bounds.west && longitude <= zone.bounds.east;
  return inBounds && routeDistanceKm(zone.center, coordinate) <= zone.radiusKm;
}

export function selectRouteOriginWithinZone(
  zone: RouteStartZone,
  candidates: readonly RoutePlannerCandidate[],
): RoutePlannerOrigin | null {
  const eligible = candidates
    .filter(isRoutePlannerCandidateEligible)
    .filter((candidate) => routeStartZoneContains(zone, candidate))
    .sort((left, right) => {
      const scoreDifference = (right.finalPlannerContribution ?? right.score) -
        (left.finalPlannerContribution ?? left.score);
      if (Math.abs(scoreDifference) > Number.EPSILON) return scoreDifference;
      const distanceDifference = routeDistanceKm(zone.center, left) - routeDistanceKm(zone.center, right);
      if (Math.abs(distanceDifference) > Number.EPSILON) return distanceDifference;
      return left.id.localeCompare(right.id);
    });
  const selected = eligible[0];
  return selected
    ? { latitude: selected.latitude, longitude: selected.longitude, source: "planner" }
    : null;
}

export function buildBoundedRouteStartZone(
  label: string,
  center: { latitude: number; longitude: number },
  radiusKm = 2,
  source: RouteStartZone["source"] = "user",
): RouteStartZone {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / Math.max(1, 111.32 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    label: label.trim(),
    center: { ...center },
    radiusKm,
    bounds: {
      south: Math.max(-90, center.latitude - latitudeDelta),
      west: Math.max(-180, center.longitude - longitudeDelta),
      north: Math.min(90, center.latitude + latitudeDelta),
      east: Math.min(180, center.longitude + longitudeDelta),
    },
    provenance: "bounded-search",
    source,
    confirmed: false,
  };
}

export function isRouteStartSelection(value: unknown): value is RouteStartSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Partial<RouteStartSelection>;
  if (selection.mode === "precise") {
    return isRouteStartLabel(selection.label) && isRouteRecommendationOrigin(selection.origin);
  }
  return selection.mode === "zone" && isRouteStartLabel(selection.label) && isRouteStartZone(selection.zone);
}

function isRouteStartLabel(value: unknown): value is string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 && trimmed.length <= 160;
}

function isRouteRecommendationOrigin(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const origin = value as { latitude?: unknown; longitude?: unknown; source?: unknown };
  return isCoordinate([origin.latitude, origin.longitude]) &&
    ["browser", "map", "address", "gps"].includes(origin.source as string);
}

function isRouteStartZone(value: unknown): value is RouteStartZone {
  if (!value || typeof value !== "object") return false;
  const zone = value as Partial<RouteStartZone>;
  const bounds = zone.bounds;
  const center = zone.center;
  if (!isRouteStartLabel(zone.label) || !center || !bounds || typeof bounds !== "object") return false;
  const typedBounds = bounds as Partial<RouteStartZone["bounds"]>;
  if (!isCoordinate([center.latitude, center.longitude])) return false;
  if (!finiteNumberBetween(zone.radiusKm, Number.MIN_VALUE, 25)) return false;
  if (!finiteNumberBetween(typedBounds.south, -90, 90) ||
      !finiteNumberBetween(typedBounds.west, -180, 180) ||
      !finiteNumberBetween(typedBounds.north, -90, 90) ||
      !finiteNumberBetween(typedBounds.east, -180, 180)) return false;
  return (
    typedBounds.south <= typedBounds.north &&
    typedBounds.west <= typedBounds.east &&
    center.latitude >= typedBounds.south &&
    center.latitude <= typedBounds.north &&
    center.longitude >= typedBounds.west &&
    center.longitude <= typedBounds.east &&
    ["geocoded", "bounded-search", "user-adjusted"].includes(zone.provenance as string) &&
    ["geoplateforme", "local-territory", "user"].includes(zone.source as string) &&
    zone.confirmed === true
  );
}

function finiteNumberBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
