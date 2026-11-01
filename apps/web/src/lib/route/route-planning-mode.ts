export const ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION =
  "route-territorial-guided-v1" as const;
export const ROUTE_TERRITORIAL_GUIDED_VERSION =
  "route-territorial-guided-v2" as const;
export const MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM = 5;
export const MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP = 12;
export const MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES = 24 * 60;
export const MAX_ROUTE_GUIDED_VOLUNTEERS = 100;
export const MAX_ROUTE_GUIDED_GROUP_COUNT = 12;

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

export function isRouteGuidedSector(value: unknown): value is RouteGuidedSector {
  if (!value || typeof value !== "object") return false;
  const sector = value as { center?: { latitude?: unknown; longitude?: unknown }; radiusKm?: unknown };
  const latitude = sector.center?.latitude;
  const longitude = sector.center?.longitude;
  const radiusKm = sector.radiusKm;
  return Boolean(
    typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      typeof longitude === "number" &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      typeof radiusKm === "number" &&
      Number.isFinite(radiusKm) &&
      radiusKm > 0 &&
      radiusKm <= MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM,
  );
}

export function isRouteGuidedBudget(value: unknown): value is RouteGuidedBudget {
  if (!value || typeof value !== "object") return false;
  const budget = value as Record<string, unknown>;
  const totalMinutes = budget.totalMinutes;
  const organizationMarginMinutes = budget.organizationMarginMinutes;
  const minimumCollectionMinutes = budget.minimumCollectionMinutes;
  const travelMaxMinutes = budget.travelMaxMinutes;
  if (
    typeof totalMinutes !== "number" ||
    !Number.isFinite(totalMinutes) ||
    totalMinutes <= 0 ||
    totalMinutes > MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES ||
    typeof organizationMarginMinutes !== "number" ||
    !Number.isFinite(organizationMarginMinutes) ||
    organizationMarginMinutes < 0 ||
    typeof minimumCollectionMinutes !== "number" ||
    !Number.isFinite(minimumCollectionMinutes) ||
    minimumCollectionMinutes < 0 ||
    minimumCollectionMinutes > MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES ||
    typeof travelMaxMinutes !== "number" ||
    !Number.isFinite(travelMaxMinutes) ||
    travelMaxMinutes <= 0 ||
    travelMaxMinutes > MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES
  ) {
    return false;
  }
  return Math.abs(
    totalMinutes - organizationMarginMinutes - minimumCollectionMinutes - travelMaxMinutes,
  ) <= Number.EPSILON * Math.max(1, Math.abs(totalMinutes));
}

export function isRoutePlannedWaypoint(value: unknown): value is RoutePlannedWaypoint {
  if (!value || typeof value !== "object") return false;
  const waypoint = value as Record<string, unknown>;
  const latitude = waypoint.latitude;
  const longitude = waypoint.longitude;
  const order = waypoint.order;
  return Boolean(
    typeof waypoint.id === "string" &&
      waypoint.id.length > 0 &&
      typeof waypoint.label === "string" &&
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      typeof longitude === "number" &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      typeof order === "number" &&
      Number.isInteger(order) &&
      order >= 0 &&
      order < MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP,
  );
}

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
    organizationMarginMinutes: 0,
    minimumCollectionMinutes: 0,
    travelMaxMinutes: fallbackTotalMinutes,
  };
}

export function routeTerritorialGuidedModeValidationError(
  mode: RoutePlanningMode,
): string | null {
  if (mode.type !== "territorial-guided" || mode.version === ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION) {
    return null;
  }
  if (mode.groups.length < 1 || mode.groups.length > MAX_ROUTE_GUIDED_GROUP_COUNT) {
    return "Le nombre de groupes guidés est hors limites.";
  }
  const counts = mode.groups.map(({ volunteerCount }) => volunteerCount);
  if (counts.some((count) =>
    !Number.isInteger(count) || count === undefined || count < 1 || count > MAX_ROUTE_GUIDED_VOLUNTEERS,
  )) {
    return "Chaque groupe guidé doit avoir un effectif entier compris entre 1 et 100.";
  }
  const numericCounts = counts.map((count) => count ?? 0);
  const totalVolunteers = numericCounts.reduce((total, count) => total + count, 0);
  if (totalVolunteers < 1 || totalVolunteers > MAX_ROUTE_GUIDED_VOLUNTEERS) {
    return "L’effectif guidé total doit rester compris entre 1 et 100 bénévoles.";
  }
  if (mode.groups.length > totalVolunteers) {
    return "Les groupes guidés doivent conserver un effectif non nul et cohérent.";
  }
  if (!isRouteGuidedBudget(mode.budget) || mode.budget.minimumCollectionMinutes <= 0) {
    return "Le budget guidé doit répartir exactement le créneau total.";
  }
  const waypointIds = new Set<string>();
  for (const group of mode.groups) {
    if (!isRouteGuidedSector(group.sector)) {
      return "Chaque secteur guidé doit respecter les bornes géographiques du contrat.";
    }
    if (group.waypoints.length < 1 || group.waypoints.length > MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP) {
      return "Chaque groupe guidé doit conserver entre 1 et 12 passages.";
    }
    for (const waypoint of group.waypoints) {
      if (!waypoint.id || waypointIds.has(waypoint.id)) {
        return "Les identifiants des passages guidés doivent être uniques.";
      }
      waypointIds.add(waypoint.id);
      if (!Number.isFinite(waypoint.latitude) || !Number.isFinite(waypoint.longitude) ||
        waypoint.latitude < -90 || waypoint.latitude > 90 ||
        waypoint.longitude < -180 || waypoint.longitude > 180 ||
        !waypoint.label.trim()) {
        return "Chaque passage guidé doit avoir un nom et des coordonnées valides.";
      }
    }
  }
  return null;
}

export function createDefaultRouteTerritorialGuidedMode(
  volunteers = 10,
  groupCount = 2,
): RouteTerritorialGuidedMode {
  const normalizedVolunteers = Number.isFinite(volunteers)
    ? Math.min(MAX_ROUTE_GUIDED_VOLUNTEERS, Math.max(1, Math.trunc(volunteers)))
    : 10;
  const requestedGroupCount = Number.isFinite(groupCount)
    ? Math.trunc(groupCount)
    : 2;
  const normalizedGroupCount = Math.min(
    MAX_ROUTE_GUIDED_GROUP_COUNT,
    normalizedVolunteers,
    Math.max(1, requestedGroupCount),
  );
  const volunteersPerGroup = Math.floor(normalizedVolunteers / normalizedGroupCount);
  const groupsWithExtraVolunteer = normalizedVolunteers % normalizedGroupCount;
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
      volunteerCount: volunteersPerGroup + (index < groupsWithExtraVolunteer ? 1 : 0),
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
