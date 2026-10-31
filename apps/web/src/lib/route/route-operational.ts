import type { RouteCalibrationContext } from "./route-calibration";
import type { RoutePlannerProof } from "./route-planner-proof-contract";
import type {
  RouteGeometry,
  RouteStop,
} from "./route-contract";
import {
  isCoordinate,
  isRouteGeometry,
  MAX_OPERATIONAL_ROUTE_LOOPS,
  MAX_PLANNER_TECHNICAL_STOPS,
} from "./route-geometry-validation";
import type {
  MeetingPointProjection,
  RouteGroupRoute,
  RouteOptions,
  RouteRecommendationResponse,
} from "./route-response-contract";
import type { ActionPreparationData } from "@/lib/actions/types";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { normalizeActionPreparationContract } from "@/lib/actions/preparation-contract";
import { haversineDistanceKm } from "@/lib/geo/geodesic-distance";

const OPERATIONAL_ROUTE_VERSION = "operational-route-v1" as const;
/**
 * Maximum geodesic distance from a manual rendezvous to a final-trace segment.
 * The boundary is deliberately strict: a larger residual leaves metrics null.
 */
export const MANUAL_MEETING_POINT_MAX_DISTANCE_METERS = 10 as const;
const METERS_PER_DEGREE_LATITUDE = 111_320;

type OperationalRouteState = "planner_copy" | "edited";
export type OperationalRouteZoneKey = "departure" | "midpoint" | "arrival";

export type OperationalRouteZone = {
  label: string | null;
  coordinate: [number, number] | null;
  provenance?: "final_geometry_midpoint" | "manual_midpoint" | "legacy_midpoint";
};

type PlannerTechnicalStop = Pick<
  RouteStop,
  "id" | "label" | "latitude" | "longitude"
>;

type OperationalRouteLoop = {
  routeId: string;
  groupIndex: number;
  geometry: RouteGeometry;
  /** Planner provenance only; never an observed or public marker source. */
  plannerTechnicalStops: PlannerTechnicalStop[];
};

export type OperationalRoute = {
  version: typeof OPERATIONAL_ROUTE_VERSION;
  initializedAt: string;
  updatedAt: string;
  source: "planner";
  state: OperationalRouteState;
  plannerGroupCount: number;
  routes: OperationalRouteLoop[];
  zones: Record<OperationalRouteZoneKey, OperationalRouteZone>;
};

export type PublicOperationalRoute = {
  routes: Array<{
    routeId: string;
    groupIndex: number;
    coordinates: [number, number][];
  }>;
};

export type PlannerActionHandoff = {
  /** Existing pre-action to enrich; absent means create a new one. */
  actionId?: string;
  operationalRoute: OperationalRoute;
  routeCalibrationContext: RouteCalibrationContext | null;
  plannerProof: RoutePlannerProof | null;
  /** Known editable pre-action fields; planner evidence stays in the context above. */
  preparationData?: ActionPreparationData;
  expiresAt: string;
};

export function createOperationalRouteFromRecommendation(
  recommendation: Pick<RouteRecommendationResponse, "generatedAt" | "groupCount" | "routeGeometry"> & {
    stops: readonly RouteStop[];
    groupRoutes: ReadonlyArray<Pick<RouteGroupRoute, "groupIndex" | "routeGeometry"> & {
      stops: readonly RouteStop[];
    }>;
  },
): OperationalRoute {
  const routes = recommendation.groupRoutes.length > 0
    ? recommendation.groupRoutes.map((group) => ({
        routeId: `planner-group-${group.groupIndex}`,
        groupIndex: group.groupIndex,
        geometry: structuredClone(group.routeGeometry),
        plannerTechnicalStops: group.stops.map(toPlannerTechnicalStop),
      }))
    : [{
        routeId: "planner-group-1",
        groupIndex: 1,
        geometry: structuredClone(recommendation.routeGeometry),
        plannerTechnicalStops: recommendation.stops.map(toPlannerTechnicalStop),
      }];

  const firstGeometry = routes[0]?.geometry ?? recommendation.routeGeometry;
  const firstMeetingPoint = routes.length === 1
    ? projectMeetingPointFromGeometry(firstGeometry)
    : null;
  return {
    version: OPERATIONAL_ROUTE_VERSION,
    initializedAt: recommendation.generatedAt,
    updatedAt: recommendation.generatedAt,
    source: "planner",
    state: "planner_copy",
    plannerGroupCount: recommendation.groupCount,
    routes,
    zones: {
      departure: {
        label: null,
        coordinate: firstGeometry.origin,
      },
      midpoint: {
        label: null,
        coordinate: firstMeetingPoint?.coordinates ?? null,
        ...(firstMeetingPoint ? { provenance: firstMeetingPoint.provenance } : {}),
      },
      arrival: {
        label: null,
        coordinate: firstGeometry.coordinates.at(-1) ?? firstGeometry.origin,
      },
    },
  };
}

type MeetingPointCandidate = {
  coordinate?: readonly [number, number] | null;
  provenance?: OperationalRouteZone["provenance"];
};

function isFiniteCoordinate(value: readonly [number, number] | null | undefined): value is [number, number] {
  return Boolean(
    value &&
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1]) &&
      value[0] >= -90 &&
      value[0] <= 90 &&
      value[1] >= -180 &&
      value[1] <= 180,
  );
}

function isUsableGeometryCoordinates(
  coordinates: readonly (readonly [number, number])[],
): coordinates is readonly [number, number][] {
  return coordinates.length >= 2 && coordinates.every(isFiniteCoordinate);
}

function projectAtCumulativeDistance(
  coordinates: readonly [number, number][],
  cumulativeDistances: readonly number[],
  targetDistanceKm: number,
): [number, number] {
  for (let index = 1; index < coordinates.length; index += 1) {
    const segmentStart = cumulativeDistances[index - 1]!;
    const segmentEnd = cumulativeDistances[index]!;
    if (targetDistanceKm > segmentEnd && index < coordinates.length - 1) continue;
    const segmentDistance = segmentEnd - segmentStart;
    const ratio = segmentDistance > 0 ? (targetDistanceKm - segmentStart) / segmentDistance : 0;
    const left = coordinates[index - 1]!;
    const right = coordinates[index]!;
    return [
      left[0] + (right[0] - left[0]) * Math.max(0, Math.min(1, ratio)),
      left[1] + (right[1] - left[1]) * Math.max(0, Math.min(1, ratio)),
    ];
  }
  return coordinates.at(-1)!;
}

function projectKnownCoordinate(
  coordinates: readonly [number, number][],
  cumulativeDistances: readonly number[],
  coordinate: [number, number],
): Pick<MeetingPointProjection, "cumulativeDistanceKm" | "progress"> {
  let nearest:
    | { distanceMeters: number; cumulativeDistanceKm: number }
    | null = null;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1]!;
    const end = coordinates[index]!;
    const referenceLatitude = (start[0] + end[0]) / 2;
    const longitudeScale = METERS_PER_DEGREE_LATITUDE * Math.max(
      Math.abs(Math.cos((referenceLatitude * Math.PI) / 180)),
      Number.EPSILON,
    );
    const point = {
      x: coordinate[1] * longitudeScale,
      y: coordinate[0] * METERS_PER_DEGREE_LATITUDE,
    };
    const segmentStart = {
      x: start[1] * longitudeScale,
      y: start[0] * METERS_PER_DEGREE_LATITUDE,
    };
    const segmentEnd = {
      x: end[1] * longitudeScale,
      y: end[0] * METERS_PER_DEGREE_LATITUDE,
    };
    const deltaX = segmentEnd.x - segmentStart.x;
    const deltaY = segmentEnd.y - segmentStart.y;
    const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;
    const ratio = segmentLengthSquared > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((point.x - segmentStart.x) * deltaX + (point.y - segmentStart.y) * deltaY) /
              segmentLengthSquared,
          ),
        )
      : 0;
    const projectedCoordinate: [number, number] = [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ];
    const distanceMeters = haversineDistanceKm(coordinate, projectedCoordinate) * 1_000;
    const cumulativeDistanceKm =
      (cumulativeDistances[index - 1] ?? 0) +
      (cumulativeDistances[index]! - (cumulativeDistances[index - 1] ?? 0)) * ratio;
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { distanceMeters, cumulativeDistanceKm };
    }
  }
  const totalDistanceKm = cumulativeDistances.at(-1) ?? 0;
  if (!nearest || nearest.distanceMeters > MANUAL_MEETING_POINT_MAX_DISTANCE_METERS) {
    return { cumulativeDistanceKm: null, progress: null };
  }
  return {
    cumulativeDistanceKm: nearest.cumulativeDistanceKm,
    progress: totalDistanceKm > 0 ? nearest.cumulativeDistanceKm / totalDistanceKm : null,
  };
}

/**
 * Projects the rendezvous on the final planned geometry without changing the
 * geometry, stops, or route order. The coordinate is interpolated at 50% of
 * the cumulative geodesic distance, never at the central coordinate index.
 */
export function projectMeetingPointFromGeometry(
  geometry: Pick<RouteGeometry, "coordinates"> & Partial<Pick<RouteGeometry, "durationMinutes">>,
  candidate: MeetingPointCandidate = {},
): MeetingPointProjection | null {
  if (!isUsableGeometryCoordinates(geometry.coordinates)) return null;

  const cumulativeDistances = [0];
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1]! +
        haversineDistanceKm(geometry.coordinates[index - 1]!, geometry.coordinates[index]!),
    );
  }
  const totalDistanceKm = cumulativeDistances.at(-1) ?? 0;
  if (!Number.isFinite(totalDistanceKm) || totalDistanceKm <= 0) return null;

  const candidateCoordinate = isFiniteCoordinate(candidate.coordinate) ? candidate.coordinate : null;
  const provenance = candidateCoordinate && candidate.provenance && candidate.provenance !== "final_geometry_midpoint"
    ? candidate.provenance
    : "final_geometry_midpoint";
  const coordinate = provenance === "final_geometry_midpoint"
    ? projectAtCumulativeDistance(geometry.coordinates, cumulativeDistances, totalDistanceKm / 2)
    : candidateCoordinate!;
  const metrics = provenance === "final_geometry_midpoint"
    ? { cumulativeDistanceKm: totalDistanceKm / 2, progress: 0.5 }
    : projectKnownCoordinate(geometry.coordinates, cumulativeDistances, coordinate);
  const duration = metrics.progress !== null &&
    typeof geometry.durationMinutes === "number" &&
    Number.isFinite(geometry.durationMinutes) &&
    geometry.durationMinutes >= 0
    ? geometry.durationMinutes * metrics.progress
    : null;

  return {
    coordinates: coordinate,
    cumulativeDistanceKm: metrics.cumulativeDistanceKm,
    progress: metrics.progress,
    estimatedDurationMinutes: duration,
    provenance,
  };
}

export function getOperationalRouteMeetingPoint(
  operationalRoute: OperationalRoute,
  route?: OperationalRouteLoop,
): MeetingPointProjection | null {
  if (!route && operationalRoute.routes.length > 1) return null;
  const targetRoute = route ?? operationalRoute.routes[0];
  if (!targetRoute) return null;
  const hasIndependentRoutes = operationalRoute.routes.length > 1;
  if (hasIndependentRoutes) return projectMeetingPointFromGeometry(targetRoute.geometry);

  const midpoint = operationalRoute.zones?.midpoint;
  if (!midpoint) return projectMeetingPointFromGeometry(targetRoute.geometry);
  return projectMeetingPointFromGeometry(targetRoute.geometry, {
    coordinate: midpoint.coordinate,
    provenance: midpoint.provenance ?? (midpoint.coordinate ? "legacy_midpoint" : "final_geometry_midpoint"),
  });
}

export function createPlannerActionPreparationData(
  recommendation: Pick<
    RouteRecommendationResponse,
    "origin" | "volunteers" | "actionMinutesEstimate" | "operationalBudget"
  >,
  options: Pick<RouteOptions, "scheduledStartAt" | "scheduledEndAt">,
): ActionPreparationData {
  const scheduledStartAt = options.scheduledStartAt;
  const scheduledEndAt = options.scheduledEndAt;
  const scheduledDate = scheduledStartAt?.slice(0, 10) ?? scheduledEndAt?.slice(0, 10);
  const scheduledTime = scheduledStartAt?.slice(11, 16);
  const actionMinutes =
    recommendation.actionMinutesEstimate ??
    recommendation.operationalBudget?.actionMinutes ??
    undefined;
  const departureLabel = `Coordonnées du départ : ${recommendation.origin.latitude.toFixed(6)}, ${recommendation.origin.longitude.toFixed(6)}`;
  const resolvedTarget = typeof actionMinutes === "number"
    ? resolveRouteTargetDistance({
        durationMinutes: actionMinutes,
        routeTargetDistanceSource: "derived",
      })
    : null;

  return {
    pointDeRendezVous: departureLabel,
    ...(scheduledDate ? { actionDate: scheduledDate } : {}),
    ...(scheduledTime ? { meetingTime: scheduledTime, departureTime: scheduledTime } : {}),
    ...(typeof actionMinutes === "number" ? { estimatedDurationMinutes: actionMinutes } : {}),
    ...(resolvedTarget
      ? {
          routeTargetDistanceKm: resolvedTarget.distanceKm,
          routeTargetDistanceSource: resolvedTarget.source,
          routeTargetDistancePolicyVersion: resolvedTarget.policyVersion,
        }
      : {}),
    volunteersExpected: recommendation.volunteers,
  };
}

export function updateOperationalRouteZone(
  operationalRoute: OperationalRoute,
  zone: OperationalRouteZoneKey,
  patch: Partial<OperationalRouteZone>,
): OperationalRoute {
  const nextZone = {
    ...structuredClone(operationalRoute.zones[zone]),
    ...patch,
  };
  if (zone === "midpoint" && "coordinate" in patch && patch.coordinate !== operationalRoute.zones.midpoint.coordinate) {
    nextZone.provenance = patch.coordinate === null
      ? undefined
      : patch.provenance ?? "manual_midpoint";
  }
  return {
    ...structuredClone(operationalRoute),
    updatedAt: new Date().toISOString(),
    state: "edited",
    zones: {
      ...structuredClone(operationalRoute.zones),
      [zone]: {
        ...nextZone,
      },
    },
  };
}

export function removeOperationalRouteLoop(
  operationalRoute: OperationalRoute,
  routeId: string,
): OperationalRoute {
  const routes = operationalRoute.routes.filter((route) => route.routeId !== routeId);
  const midpoint = operationalRoute.zones.midpoint;
  const nextMidpoint = routes.length === 1 &&
    (midpoint.provenance === "final_geometry_midpoint" || midpoint.coordinate === null)
    ? projectMeetingPointFromGeometry(routes[0]!.geometry)
    : routes.length > 1
      ? null
      : midpoint.provenance === "final_geometry_midpoint"
        ? null
        : midpoint;
  const nextMidpointCoordinate = nextMidpoint && "coordinates" in nextMidpoint
    ? nextMidpoint.coordinates
    : nextMidpoint?.coordinate ?? null;
  return {
    ...structuredClone(operationalRoute),
    updatedAt: new Date().toISOString(),
    state: "edited",
    routes,
    zones: {
      ...structuredClone(operationalRoute.zones),
      midpoint: {
        ...structuredClone(operationalRoute.zones.midpoint),
        coordinate: nextMidpointCoordinate,
        ...(nextMidpoint ? { provenance: nextMidpoint.provenance } : { provenance: undefined }),
      },
    },
  };
}

/** Current editable loop count; it is deliberately distinct from plannerGroupCount. */
export function getOperationalRouteLoopCount(
  operationalRoute: OperationalRoute,
): number | null {
  return operationalRoute.routes.length > 0 ? operationalRoute.routes.length : null;
}

/** Public map segments intentionally omit planner technical stops. */
export function getPublicOperationalRouteSegments(
  operationalRoute: OperationalRoute | PublicOperationalRoute | null | undefined,
): Array<{ routeId: string; groupIndex: number; coordinates: [number, number][] }> {
  return (operationalRoute?.routes ?? [])
    .map((route) => {
      const candidate = route as {
        routeId?: unknown;
        groupIndex?: unknown;
        coordinates?: unknown;
        geometry?: { coordinates?: unknown };
      };
      const coordinates = Array.isArray(candidate.coordinates)
        ? candidate.coordinates
        : candidate.geometry?.coordinates;
      if (
        typeof candidate.routeId !== "string" ||
        !Number.isInteger(candidate.groupIndex) ||
        !Array.isArray(coordinates)
      ) {
        return null;
      }
      const normalized = coordinates.filter(
        (coordinate): coordinate is [number, number] =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          typeof coordinate[0] === "number" &&
          Number.isFinite(coordinate[0]) &&
          typeof coordinate[1] === "number" &&
          Number.isFinite(coordinate[1]),
      ).map(([latitude, longitude]) => [latitude, longitude] as [number, number]);
      return normalized.length >= 2
        ? { routeId: candidate.routeId, groupIndex: candidate.groupIndex, coordinates: normalized }
        : null;
    })
    .filter((segment): segment is { routeId: string; groupIndex: number; coordinates: [number, number][] } => segment !== null);
}

export function isOperationalRoute(value: unknown): value is OperationalRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<OperationalRoute>;
  return (
    route.version === OPERATIONAL_ROUTE_VERSION &&
    isIsoDate(route.initializedAt) &&
    isIsoDate(route.updatedAt) &&
    route.source === "planner" &&
    (route.state === "planner_copy" || route.state === "edited") &&
    isIntegerBetween(route.plannerGroupCount, 1, 12) &&
    Array.isArray(route.routes) &&
    route.routes.length <= MAX_OPERATIONAL_ROUTE_LOOPS &&
    hasUniqueRoutePropertyValues(route.routes, "routeId") &&
    hasUniqueRoutePropertyValues(route.routes, "groupIndex") &&
    route.routes.every(isOperationalRouteLoop) &&
    isOperationalRouteZones(route.zones)
  );
}

export function isLegacyActualRoute(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<LegacyOperationalRoute>;
  return (
    route.version === "actual-route-v1" &&
    isIsoDate(route.initializedAt) &&
    route.source === "planner" &&
    isIntegerBetween(route.plannerGroupCount, 1, 12) &&
    Array.isArray(route.routes) &&
    route.routes.length <= MAX_OPERATIONAL_ROUTE_LOOPS &&
    hasUniqueRoutePropertyValues(route.routes, "routeId") &&
    hasUniqueRoutePropertyValues(route.routes, "groupIndex") &&
    route.routes.every(isLegacyActualRouteLoop) &&
    isOperationalRouteZones(route.zones)
  );
}

export type LegacyOperationalRoute = {
  version: "actual-route-v1";
  initializedAt: string;
  source: "planner";
  plannerGroupCount: number;
  routes: Array<{
    routeId: string;
    groupIndex: number;
    geometry: RouteGeometry;
    technicalStops: PlannerTechnicalStop[];
  }>;
  zones: Record<OperationalRouteZoneKey, OperationalRouteZone>;
};

export function normalizeOperationalRoute(value: unknown): OperationalRoute | null {
  if (isOperationalRoute(value)) return structuredClone(value);
  if (!isLegacyActualRoute(value)) return null;
  const legacy = value as LegacyOperationalRoute;
  return {
    version: OPERATIONAL_ROUTE_VERSION,
    initializedAt: legacy.initializedAt,
    updatedAt: legacy.initializedAt,
    source: "planner",
    state: "planner_copy",
    plannerGroupCount: legacy.plannerGroupCount,
    routes: legacy.routes.map((route) => ({
      routeId: route.routeId,
      groupIndex: route.groupIndex,
      geometry: structuredClone(route.geometry),
      plannerTechnicalStops: route.technicalStops.map(toPlannerTechnicalStop),
    })),
    zones: structuredClone(legacy.zones),
  };
}

export function normalizeActionPreparationData<T extends {
  operationalRoute?: OperationalRoute;
  actualRoute?: unknown;
  /** Legacy read compatibility only; removed before any normalized persistence. */
  creatorRole?: unknown;
  routeVersioning?: { active?: { operationalRoute?: unknown } };
}>(data: T): Omit<T, "actualRoute" | "operationalRoute" | "creatorRole"> & { operationalRoute?: OperationalRoute } {
  // Historical rows may still contain preparation_data.creatorRole. Keep the
  // read type compatible, but never carry that removed field into a normalized
  // object that can be persisted by an update or geometry workflow.
  const sanitizedData = { ...data } as T & {
    creatorRole?: unknown;
  };
  delete sanitizedData.creatorRole;
  const { actualRoute, operationalRoute, ...restWithLegacy } = sanitizedData;
  const rest = restWithLegacy as Omit<T, "actualRoute" | "operationalRoute" | "creatorRole">;
  const activeRoute = normalizeOperationalRoute(data.routeVersioning?.active?.operationalRoute);
  const normalized = activeRoute ?? operationalRoute ?? normalizeOperationalRoute(actualRoute);
  return normalizeActionPreparationContract({
    ...rest,
    ...(normalized ? { operationalRoute: normalized } : {}),
  }) as Omit<T, "actualRoute" | "operationalRoute" | "creatorRole"> & { operationalRoute?: OperationalRoute };
}

function toPlannerTechnicalStop(stop: RouteStop | PlannerTechnicalStop): PlannerTechnicalStop {
  return {
    id: stop.id,
    label: stop.label,
    latitude: stop.latitude,
    longitude: stop.longitude,
  };
}

function isOperationalRouteLoop(value: unknown): value is OperationalRouteLoop {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<OperationalRouteLoop>;
  return (
    typeof route.routeId === "string" &&
    route.routeId.length > 0 &&
    isIntegerBetween(route.groupIndex, 1, 12) &&
    isRouteGeometry(route.geometry) &&
    Array.isArray(route.plannerTechnicalStops) &&
    route.plannerTechnicalStops.length <= MAX_PLANNER_TECHNICAL_STOPS &&
    route.plannerTechnicalStops.every(isPlannerTechnicalStop)
  );
}

function isLegacyActualRouteLoop(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const route = value as LegacyOperationalRoute["routes"][number];
  return (
    typeof route.routeId === "string" &&
    route.routeId.length > 0 &&
    isIntegerBetween(route.groupIndex, 1, 12) &&
    isRouteGeometry(route.geometry) &&
    Array.isArray(route.technicalStops) &&
    route.technicalStops.length <= MAX_PLANNER_TECHNICAL_STOPS &&
    route.technicalStops.every(isPlannerTechnicalStop)
  );
}

function isPlannerTechnicalStop(value: unknown): value is PlannerTechnicalStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Partial<PlannerTechnicalStop>;
  return (
    typeof stop.id === "string" &&
    stop.id.length > 0 &&
    typeof stop.label === "string" &&
    typeof stop.latitude === "number" &&
    typeof stop.longitude === "number" &&
    isCoordinate([stop.latitude, stop.longitude])
  );
}

function isOperationalRouteZones(value: unknown): value is OperationalRoute["zones"] {
  if (!value || typeof value !== "object") return false;
  const zones = value as Partial<OperationalRoute["zones"]>;
  return [zones.departure, zones.midpoint, zones.arrival].every(isOperationalRouteZone);
}

function isOperationalRouteZone(value: unknown): value is OperationalRouteZone {
  if (!value || typeof value !== "object") return false;
  const zone = value as Partial<OperationalRouteZone>;
  return (
    (zone.label === null || typeof zone.label === "string") &&
    (zone.coordinate === null || isCoordinate(zone.coordinate)) &&
    (zone.provenance === undefined ||
      zone.provenance === "final_geometry_midpoint" ||
      zone.provenance === "manual_midpoint" ||
      zone.provenance === "legacy_midpoint")
  );
}

function hasUniqueRoutePropertyValues(
  routes: readonly unknown[],
  property: "routeId" | "groupIndex",
): boolean {
  const values = new Set<unknown>();
  for (const route of routes) {
    if (!route || typeof route !== "object") return false;
    const value = (route as Record<string, unknown>)[property];
    if (values.has(value)) return false;
    values.add(value);
  }
  return true;
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}
