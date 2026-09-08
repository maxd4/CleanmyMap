import type { RouteOptions } from "./route-types";
import {
  isRoutePickupPreference,
  type RoutePickupPreference,
} from "@/lib/route/route-response-contract";

export const ROUTE_DRAFT_STORAGE_KEY = "cleanmymap.route-draft";
export const ROUTE_DRAFT_SCHEMA_VERSION = 5;
const LEGACY_ROUTE_DRAFT_SCHEMA_VERSIONS = [1, 2, 3, 4] as const;

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  priorityVsTravel: 65,
  travelBudgetMinutes: 60,
  maxStops: 6,
  volunteers: 1,
  groupCount: 1,
  pickupPreference: "balanced",
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

  const volunteers = boundedInteger(candidate.volunteers, DEFAULT_ROUTE_OPTIONS.volunteers, 1, 100);
  const groupCount = boundedInteger(candidate.groupCount, DEFAULT_ROUTE_OPTIONS.groupCount, 1, 12);
  const pickupPreference: RoutePickupPreference = isRoutePickupPreference(
    candidate.pickupPreference,
  )
    ? candidate.pickupPreference
    : DEFAULT_ROUTE_OPTIONS.pickupPreference;

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
    volunteers,
    groupCount: Math.min(groupCount, volunteers),
    pickupPreference,
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
