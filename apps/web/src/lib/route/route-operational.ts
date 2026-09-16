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
  RouteGroupRoute,
  RouteOptions,
  RouteRecommendationResponse,
} from "./route-response-contract";
import type { ActionPreparationData } from "@/lib/actions/types";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";

export const OPERATIONAL_ROUTE_VERSION = "operational-route-v1" as const;

export type OperationalRouteState = "planner_copy" | "edited";
export type OperationalRouteZoneKey = "departure" | "midpoint" | "arrival";

export type OperationalRouteZone = {
  label: string | null;
  coordinate: [number, number] | null;
};

export type PlannerTechnicalStop = Pick<
  RouteStop,
  "id" | "label" | "latitude" | "longitude"
>;

export type OperationalRouteLoop = {
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
  const firstCoordinates = firstGeometry.coordinates;
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
        coordinate: firstCoordinates[Math.floor(firstCoordinates.length / 2)] ?? null,
      },
      arrival: {
        label: null,
        coordinate: firstCoordinates.at(-1) ?? firstGeometry.origin,
      },
    },
  };
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
  return {
    ...structuredClone(operationalRoute),
    updatedAt: new Date().toISOString(),
    state: "edited",
    zones: {
      ...structuredClone(operationalRoute.zones),
      [zone]: {
        ...structuredClone(operationalRoute.zones[zone]),
        ...patch,
      },
    },
  };
}

export function removeOperationalRouteLoop(
  operationalRoute: OperationalRoute,
  routeId: string,
): OperationalRoute {
  return {
    ...structuredClone(operationalRoute),
    updatedAt: new Date().toISOString(),
    state: "edited",
    routes: operationalRoute.routes.filter((route) => route.routeId !== routeId),
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
  operationalRoute: OperationalRoute | null | undefined,
): Array<{ routeId: string; groupIndex: number; coordinates: [number, number][] }> {
  return (operationalRoute?.routes ?? [])
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
}>(data: T): Omit<T, "actualRoute" | "operationalRoute"> & { operationalRoute?: OperationalRoute } {
  const { actualRoute, operationalRoute, ...rest } = data;
  const normalized = operationalRoute ?? normalizeOperationalRoute(actualRoute);
  return {
    ...rest,
    ...(normalized ? { operationalRoute: normalized } : {}),
  };
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
    (zone.coordinate === null || isCoordinate(zone.coordinate))
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
