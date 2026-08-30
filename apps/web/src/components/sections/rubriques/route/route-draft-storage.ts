import type { RouteConstraints } from "./route-types";

export const ROUTE_DRAFT_STORAGE_KEY = "cleanmymap.route-draft";
export const ROUTE_DRAFT_SCHEMA_VERSION = 1;

export const DEFAULT_ROUTE_CONSTRAINTS: RouteConstraints = {
  availableMinutes: 180,
  volunteers: 4,
  accessibility: "standard",
  security: "standard",
  weather: "ok",
  impactVsDistance: 65,
  maxStops: 6,
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function enumValue<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeRouteConstraints(value: unknown): RouteConstraints {
  const candidate = isRecord(value) ? value : {};

  return {
    availableMinutes: boundedInteger(
      candidate.availableMinutes,
      DEFAULT_ROUTE_CONSTRAINTS.availableMinutes,
      30,
      600,
    ),
    volunteers: boundedInteger(candidate.volunteers, DEFAULT_ROUTE_CONSTRAINTS.volunteers, 1, 200),
    accessibility: enumValue(
      candidate.accessibility,
      DEFAULT_ROUTE_CONSTRAINTS.accessibility,
      ["standard", "accessible", "strict"] as const,
    ),
    security: enumValue(candidate.security, DEFAULT_ROUTE_CONSTRAINTS.security, ["standard", "renforced"] as const),
    weather: enumValue(
      candidate.weather,
      DEFAULT_ROUTE_CONSTRAINTS.weather,
      ["ok", "rain", "wind", "heat", "cold"] as const,
    ),
    impactVsDistance: boundedInteger(
      candidate.impactVsDistance,
      DEFAULT_ROUTE_CONSTRAINTS.impactVsDistance,
      0,
      100,
    ),
    maxStops: boundedInteger(candidate.maxStops, DEFAULT_ROUTE_CONSTRAINTS.maxStops, 2, 12),
  };
}

export function readRouteDraftConstraints(storage?: StorageReader): RouteConstraints {
  if (!storage) return { ...DEFAULT_ROUTE_CONSTRAINTS };

  try {
    const raw = storage.getItem(ROUTE_DRAFT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROUTE_CONSTRAINTS };

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== ROUTE_DRAFT_SCHEMA_VERSION) {
      return { ...DEFAULT_ROUTE_CONSTRAINTS };
    }

    return normalizeRouteConstraints(parsed.constraints);
  } catch {
    return { ...DEFAULT_ROUTE_CONSTRAINTS };
  }
}

export function writeRouteDraftConstraints(
  storage: StorageWriter | undefined,
  constraints: RouteConstraints,
): void {
  if (!storage) return;

  try {
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: ROUTE_DRAFT_SCHEMA_VERSION,
        constraints: normalizeRouteConstraints(constraints),
      }),
    );
  } catch {
    // Browser storage can be unavailable or quota-limited; the in-memory draft remains usable.
  }
}
