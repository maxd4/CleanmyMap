import type { ActionPreparationData } from "./types";

export const CURRENT_ROUTE_DISTANCE_POLICY_VERSION = "route-distance-v2" as const;
export const HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR = 3 as const;
export type RouteTargetDistanceSource = "derived" | "manual";

export type RouteDistancePolicy = {
  version: string;
  kilometersPerHour: number;
};

export const CURRENT_ROUTE_DISTANCE_POLICY: RouteDistancePolicy = {
  version: CURRENT_ROUTE_DISTANCE_POLICY_VERSION,
  kilometersPerHour: HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR,
};
const DEFAULT_ROUTE_TARGET_DISTANCE_KM = 1;

export type ResolvedRouteTargetDistance = {
  distanceKm: number;
  source: RouteTargetDistanceSource;
  policyVersion?: string;
};

export function resolveDurationMinutesForCalculation(
  durationMinutes: number | string | null | undefined,
  durationMinutesDeclared?: boolean,
): number | string | null | undefined {
  return durationMinutesDeclared === false ? undefined : durationMinutes;
}

export function deriveRouteTargetDistanceKm(
  durationMinutes: number | string | null | undefined,
  policy: RouteDistancePolicy = CURRENT_ROUTE_DISTANCE_POLICY,
): number {
  const duration = typeof durationMinutes === "string"
    ? durationMinutes.trim() === "" ? undefined : Number(durationMinutes)
    : durationMinutes;
  if (typeof duration !== "number" || !Number.isFinite(duration)) {
    return DEFAULT_ROUTE_TARGET_DISTANCE_KM;
  }
  return Math.max(0, Number(((duration / 60) * policy.kilometersPerHour).toFixed(2)));
}

function normalizeRouteTargetDistanceKm(
  value: number | string | null | undefined,
): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return undefined;
  }
  return Number(parsed.toFixed(2));
}

export function resolveRouteTargetDistance(params: {
  durationMinutes: number | string | null | undefined;
  durationMinutesDeclared?: boolean;
  routeTargetDistanceKm?: number | string | null;
  routeTargetDistanceSource?: RouteTargetDistanceSource | null;
  routeTargetDistancePolicyVersion?: string | null;
  policy?: RouteDistancePolicy;
}): ResolvedRouteTargetDistance {
  const policy = params.policy ?? CURRENT_ROUTE_DISTANCE_POLICY;
  if (params.routeTargetDistanceSource === "manual") {
    const manualDistance = normalizeRouteTargetDistanceKm(params.routeTargetDistanceKm);
    if (manualDistance !== undefined) {
      return {
        distanceKm: manualDistance,
        source: "manual",
      };
    }
  }

  const persistedDistance = normalizeRouteTargetDistanceKm(params.routeTargetDistanceKm);
  if (
    params.routeTargetDistanceSource === "derived" &&
    params.durationMinutesDeclared !== false &&
    persistedDistance !== undefined &&
    typeof params.routeTargetDistancePolicyVersion === "string" &&
    params.routeTargetDistancePolicyVersion.trim() !== ""
  ) {
    return {
      distanceKm: persistedDistance,
      source: "derived",
      policyVersion: params.routeTargetDistancePolicyVersion,
    };
  }

  return {
    distanceKm: deriveRouteTargetDistanceKm(
      resolveDurationMinutesForCalculation(params.durationMinutes, params.durationMinutesDeclared),
      policy,
    ),
    source: "derived",
    policyVersion: policy.version,
  };
}

export function resolveRouteTargetDistanceFromPreparationData(params: {
  durationMinutes: number | string | null | undefined;
  preparationData?: Pick<
    ActionPreparationData,
    "durationMinutesDeclared" | "routeTargetDistanceKm" | "routeTargetDistanceSource" | "routeTargetDistancePolicyVersion"
  > | null;
  policy?: RouteDistancePolicy;
}): ResolvedRouteTargetDistance {
  return resolveRouteTargetDistance({
    durationMinutes: params.durationMinutes,
    durationMinutesDeclared: params.preparationData?.durationMinutesDeclared,
    routeTargetDistanceKm: params.preparationData?.routeTargetDistanceKm,
    routeTargetDistanceSource: params.preparationData?.routeTargetDistanceSource,
    routeTargetDistancePolicyVersion: params.preparationData?.routeTargetDistancePolicyVersion,
    policy: params.policy,
  });
}

export function persistResolvedRouteTargetDistance<T extends {
  routeTargetDistanceKm?: number;
  routeTargetDistanceSource?: RouteTargetDistanceSource;
  routeTargetDistancePolicyVersion?: string;
}>(data: T, resolved: ResolvedRouteTargetDistance): T {
  const rest = { ...data };
  delete rest.routeTargetDistancePolicyVersion;
  return {
    ...rest,
    routeTargetDistanceKm: resolved.distanceKm,
    routeTargetDistanceSource: resolved.source,
    ...(resolved.source === "derived"
      ? { routeTargetDistancePolicyVersion: resolved.policyVersion }
      : {}),
  } as T;
}
