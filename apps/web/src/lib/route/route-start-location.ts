import { routeDistanceKm, type RoutePlannerCandidate, type RoutePlannerOrigin } from "./route-planner";
import { isRoutePlannerCandidateEligible } from "./route-planner";
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
    return typeof selection.label === "string" && selection.label.trim().length > 0 &&
      Boolean(selection.origin) && typeof selection.origin?.latitude === "number";
  }
  if (selection.mode !== "zone" || !selection.zone) return false;
  const zone = selection.zone;
  return typeof selection.label === "string" && selection.label.trim().length > 0 &&
    zone.confirmed === true && Number.isFinite(zone.radiusKm) && zone.radiusKm > 0;
}
