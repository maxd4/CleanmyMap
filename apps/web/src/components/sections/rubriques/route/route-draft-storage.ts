import type { RouteOptions } from "./route-types";

export const ROUTE_DRAFT_STORAGE_KEY = "cleanmymap.route-draft";
export const ROUTE_DRAFT_SCHEMA_VERSION = 3;
const LEGACY_ROUTE_DRAFT_SCHEMA_VERSIONS = [1, 2] as const;

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  priorityVsTravel: 65,
  travelBudgetMinutes: 60,
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

export function normalizeRouteOptions(value: unknown): RouteOptions {
  const candidate = isRecord(value) ? value : {};

  return {
    priorityVsTravel: boundedInteger(
      candidate.priorityVsTravel ?? candidate.priorityVsDistance,
      DEFAULT_ROUTE_OPTIONS.priorityVsTravel,
      0,
      100,
    ),
    travelBudgetMinutes: boundedInteger(
      candidate.travelBudgetMinutes,
      DEFAULT_ROUTE_OPTIONS.travelBudgetMinutes,
      1,
      600,
    ),
    maxStops: boundedInteger(candidate.maxStops, DEFAULT_ROUTE_OPTIONS.maxStops, 1, 12),
  };
}

export function readRouteDraftOptions(storage?: StorageReader): RouteOptions {
  if (!storage) return { ...DEFAULT_ROUTE_OPTIONS };

  try {
    const raw = storage.getItem(ROUTE_DRAFT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROUTE_OPTIONS };

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      (parsed.version !== ROUTE_DRAFT_SCHEMA_VERSION &&
        !LEGACY_ROUTE_DRAFT_SCHEMA_VERSIONS.includes(
          parsed.version as (typeof LEGACY_ROUTE_DRAFT_SCHEMA_VERSIONS)[number],
        ))
    ) {
      return { ...DEFAULT_ROUTE_OPTIONS };
    }

    return normalizeRouteOptions(parsed.options ?? parsed.constraints);
  } catch {
    return { ...DEFAULT_ROUTE_OPTIONS };
  }
}

export function writeRouteDraftOptions(
  storage: StorageWriter | undefined,
  options: RouteOptions,
): void {
  if (!storage) return;

  try {
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: ROUTE_DRAFT_SCHEMA_VERSION,
        options: normalizeRouteOptions(options),
      }),
    );
  } catch {
    // Browser storage can be unavailable or quota-limited; the in-memory draft remains usable.
  }
}
