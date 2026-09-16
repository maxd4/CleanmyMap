export const ROUTE_TARGET_DISTANCE_KM_PER_HOUR = 1;
export const DEFAULT_ROUTE_TARGET_DISTANCE_KM = 1;

export function deriveRouteTargetDistanceKm(
  durationMinutes: number | string | null | undefined,
): number {
  const duration = typeof durationMinutes === "string"
    ? Number(durationMinutes)
    : durationMinutes;
  if (typeof duration !== "number" || !Number.isFinite(duration)) {
    return DEFAULT_ROUTE_TARGET_DISTANCE_KM;
  }
  return Math.max(0, Number(((duration / 60) * ROUTE_TARGET_DISTANCE_KM_PER_HOUR).toFixed(2)));
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

export function resolveRouteTargetDistanceKm(params: {
  durationMinutes: number | string | null | undefined;
  routeTargetDistanceKm?: number | string | null;
}): number {
  return normalizeRouteTargetDistanceKm(params.routeTargetDistanceKm) ??
    deriveRouteTargetDistanceKm(params.durationMinutes);
}
