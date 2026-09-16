import type { ActionPreparationData } from "./types";

export const CURRENT_ROUTE_DISTANCE_POLICY_VERSION = "route-distance-v1" as const;
export type RouteDistancePolicyVersion = typeof CURRENT_ROUTE_DISTANCE_POLICY_VERSION;
export type RouteTargetDistanceSource = "derived" | "manual";

export type RouteDistancePolicy = {
  version: string;
  kilometersPerHour: number;
};

export const CURRENT_ROUTE_DISTANCE_POLICY: RouteDistancePolicy = {
  version: CURRENT_ROUTE_DISTANCE_POLICY_VERSION,
  kilometersPerHour: 1,
};
export const DEFAULT_ROUTE_TARGET_DISTANCE_KM = 1;

export type ResolvedRouteTargetDistance = {
  distanceKm: number;
  source: RouteTargetDistanceSource;
  policyVersion?: string;
};

export function deriveRouteTargetDistanceKm(
  durationMinutes: number | string | null | undefined,
  policy: RouteDistancePolicy = CURRENT_ROUTE_DISTANCE_POLICY,
): number {
  const duration = typeof durationMinutes === "string"
    ? Number(durationMinutes)
    : durationMinutes;
  if (typeof duration !== "number" || !Number.isFinite(duration)) {
    return DEFAULT_ROUTE_TARGET_DISTANCE_KM;
  }
  return Math.max(0, Number(((duration / 60) * policy.kilometersPerHour).toFixed(2)));
}

export function normalizeRouteTargetDistanceKm(
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
  routeTargetDistanceKm?: number | string | null;
  routeTargetDistanceSource?: RouteTargetDistanceSource | null;
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

  return {
    distanceKm: deriveRouteTargetDistanceKm(params.durationMinutes, policy),
    source: "derived",
    policyVersion: policy.version,
  };
}

export function resolveRouteTargetDistanceFromPreparationData(params: {
  durationMinutes: number | string | null | undefined;
  preparationData?: Pick<
    ActionPreparationData,
    "routeTargetDistanceKm" | "routeTargetDistanceSource"
  > | null;
  policy?: RouteDistancePolicy;
}): ResolvedRouteTargetDistance {
  return resolveRouteTargetDistance({
    durationMinutes: params.durationMinutes,
    routeTargetDistanceKm: params.preparationData?.routeTargetDistanceKm,
    routeTargetDistanceSource: params.preparationData?.routeTargetDistanceSource,
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
