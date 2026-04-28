import type { ActionImpactLevel, ActionStatus } from "@/lib/actions/types";
import {
  DEFAULT_VISIBLE_CATEGORIES,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";

export const ACTIONS_MAP_FILTERS_STORAGE_KEY = "cmm_actions_map_filters";

export type ActionsMapFilters = {
  days: number;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  visibleCategories: Record<MarkerCategory, boolean>;
};

const VALID_STATUSES = new Set<ActionStatus | "all">([
  "all",
  "approved",
  "pending",
  "rejected",
]);

const VALID_IMPACTS = new Set<ActionImpactLevel | "all">([
  "all",
  "faible",
  "moyen",
  "fort",
  "critique",
]);

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function normalizeVisibleCategories(
  value: unknown,
): Record<MarkerCategory, boolean> {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<MarkerCategory, unknown>>)
      : {};

  return Object.fromEntries(
    Object.entries(DEFAULT_VISIBLE_CATEGORIES).map(([category, fallback]) => [
      category,
      typeof source[category as MarkerCategory] === "boolean"
        ? source[category as MarkerCategory]
        : fallback,
    ]),
  ) as Record<MarkerCategory, boolean>;
}

export function buildDefaultActionsMapFilters(
  initialDays: number,
): ActionsMapFilters {
  return {
    days: clampInteger(initialDays, 1, 3650, 90),
    statusFilter: "approved",
    impactFilter: "all",
    qualityMin: 0,
    visibleCategories: { ...DEFAULT_VISIBLE_CATEGORIES },
  };
}

export function normalizeActionsMapFilters(
  value: unknown,
  initialDays: number,
): ActionsMapFilters {
  const defaults = buildDefaultActionsMapFilters(initialDays);
  const source =
    value && typeof value === "object"
      ? (value as Partial<ActionsMapFilters>)
      : {};

  return {
    days: clampInteger(source.days, 1, 3650, defaults.days),
    statusFilter: VALID_STATUSES.has(source.statusFilter ?? "approved")
      ? (source.statusFilter as ActionStatus | "all")
      : defaults.statusFilter,
    impactFilter: VALID_IMPACTS.has(source.impactFilter ?? "all")
      ? (source.impactFilter as ActionImpactLevel | "all")
      : defaults.impactFilter,
    qualityMin: clampInteger(source.qualityMin, 0, 100, defaults.qualityMin),
    visibleCategories: normalizeVisibleCategories(source.visibleCategories),
  };
}

export function readActionsMapFiltersFromStorage(
  storage: Pick<Storage, "getItem">,
  initialDays: number,
): ActionsMapFilters {
  const raw = storage.getItem(ACTIONS_MAP_FILTERS_STORAGE_KEY);
  if (!raw) {
    return buildDefaultActionsMapFilters(initialDays);
  }

  try {
    return normalizeActionsMapFilters(JSON.parse(raw), initialDays);
  } catch {
    return buildDefaultActionsMapFilters(initialDays);
  }
}

export function writeActionsMapFiltersToStorage(
  storage: Pick<Storage, "setItem">,
  filters: ActionsMapFilters,
): void {
  storage.setItem(ACTIONS_MAP_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}
