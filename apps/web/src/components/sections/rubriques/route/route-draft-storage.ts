import type { RouteOptions } from "./route-types";

export const ROUTE_DRAFT_STORAGE_KEY = "cleanmymap.route-draft";
export const ROUTE_DRAFT_SCHEMA_VERSION = 2;
const LEGACY_ROUTE_DRAFT_SCHEMA_VERSION = 1;

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  priorityVsDistance: 65,
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
    priorityVsDistance: boundedInteger(
      candidate.priorityVsDistance,
      DEFAULT_ROUTE_OPTIONS.priorityVsDistance,
      0,
      100,
    ),
    maxStops: boundedInteger(candidate.maxStops, DEFAULT_ROUTE_OPTIONS.maxStops, 2, 12),
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
        parsed.version !== LEGACY_ROUTE_DRAFT_SCHEMA_VERSION)
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
