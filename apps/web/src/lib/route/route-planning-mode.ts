export const ROUTE_TERRITORIAL_GUIDED_VERSION =
  "route-territorial-guided-v1" as const;
export const MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM = 5;
export const MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP = 12;

export type RouteGuidedCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteGuidedSector = {
  center: RouteGuidedCoordinate;
  radiusKm: number;
};

/** Ordered by array position; the server assigns the trace order. */
export type RouteGuidedWaypoint = RouteGuidedCoordinate & {
  id: string;
  label: string;
};

export type RoutePlannedWaypoint = RouteGuidedWaypoint & {
  order: number;
};

export type RouteTerritorialGuidedGroup = {
  sector: RouteGuidedSector;
  waypoints: RouteGuidedWaypoint[];
};

export type RouteTerritorialGuidedMode = {
  type: "territorial-guided";
  version: typeof ROUTE_TERRITORIAL_GUIDED_VERSION;
  groups: RouteTerritorialGuidedGroup[];
};

export type RoutePlanningMode =
  | { type: "free" }
  | { type: "event-centered"; eventId: string }
  | RouteTerritorialGuidedMode;

export function plannedWaypointsForGroup(
  group: RouteTerritorialGuidedGroup,
): RoutePlannedWaypoint[] {
  return group.waypoints.map((waypoint, order) => ({ ...waypoint, order }));
}

export type RouteEventTemporalStatus = "past" | "today" | "future";

export function routeEventTemporalStatus(
  eventDate: string,
  now = new Date(),
): RouteEventTemporalStatus {
  const today = now.toISOString().slice(0, 10);
  if (eventDate < today) return "past";
  if (eventDate === today) return "today";
  return "future";
}
export function routeEventAgeDays(
  eventDate: string,
  now = new Date(),
): number | null {
  const eventTime = new Date(`${eventDate}T00:00:00.000Z`).getTime();
 if (!Number.isFinite(eventTime)) return null;
 const ageDays = (now.getTime() - eventTime) / 86_400_000;
 return ageDays >= 0 ? ageDays : null;
}
