export const ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION =
  "route-territorial-guided-v1" as const;
export const ROUTE_TERRITORIAL_GUIDED_VERSION =
  "route-territorial-guided-v2" as const;
export const MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM = 5;
export const MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP = 12;
export const MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES = 24 * 60;

export type RouteGuidedCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteGuidedSector = {
  center: RouteGuidedCoordinate;
  radiusKm: number;
};

export type RouteGuidedBudget = {
  totalMinutes: number;
  organizationMarginMinutes: number;
  minimumCollectionMinutes: number;
  travelMaxMinutes: number;
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
  label?: string;
  volunteerCount?: number;
};

export type RouteTerritorialGuidedMode = {
  type: "territorial-guided";
  version: typeof ROUTE_TERRITORIAL_GUIDED_VERSION;
  groups: RouteTerritorialGuidedGroup[];
  budget: RouteGuidedBudget;
};

export type RouteTerritorialGuidedLegacyMode = {
  type: "territorial-guided";
  version: typeof ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION;
  groups: RouteTerritorialGuidedGroup[];
};

export type RoutePlanningMode =
  | { type: "free" }
  | { type: "event-centered"; eventId: string }
  | RouteTerritorialGuidedMode
  | RouteTerritorialGuidedLegacyMode;

export function routeGuidedBudgetForMode(
  mode: RoutePlanningMode,
  fallbackTotalMinutes: number,
): RouteGuidedBudget | null {
  if (mode.type !== "territorial-guided") return null;
  if (mode.version === ROUTE_TERRITORIAL_GUIDED_VERSION) return { ...mode.budget };
  return {
    totalMinutes: fallbackTotalMinutes,
    organizationMarginMinutes: 15,
    minimumCollectionMinutes: 0,
    travelMaxMinutes: fallbackTotalMinutes,
  };
}

export function createDefaultRouteTerritorialGuidedMode(
  volunteers = 10,
  groupCount = 2,
): RouteTerritorialGuidedMode {
  const normalizedVolunteers = Number.isInteger(volunteers) && volunteers >= 2
    ? volunteers
    : 10;
  const normalizedGroupCount = Number.isInteger(groupCount) &&
    groupCount >= 2 && groupCount <= normalizedVolunteers &&
    normalizedVolunteers % groupCount === 0
    ? groupCount
    : 2;
  const volunteerCount = normalizedVolunteers / normalizedGroupCount;
  const sector = { center: { latitude: 48.8566, longitude: 2.3522 }, radiusKm: 1 };
  return {
    type: "territorial-guided",
    version: ROUTE_TERRITORIAL_GUIDED_VERSION,
    budget: {
      totalMinutes: 90,
      organizationMarginMinutes: 15,
      minimumCollectionMinutes: 45,
      travelMaxMinutes: 30,
    },
    groups: Array.from({ length: normalizedGroupCount }, (_, index) => ({
      label: `Groupe ${index + 1}`,
      volunteerCount,
      sector: { ...sector, center: { ...sector.center } },
      waypoints: [{
        id: `group-${index + 1}-waypoint-1`,
        label: `Passage ${index + 1}.1`,
        latitude: sector.center.latitude + (index === 0 ? 0.0004 : -0.0004),
        longitude: sector.center.longitude,
      }],
    })),
  };
}

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
