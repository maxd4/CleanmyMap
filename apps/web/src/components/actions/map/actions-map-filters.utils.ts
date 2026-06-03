import type { ActionImpactLevel, ActionMapItem, ActionStatus } from "@/lib/actions/types";
import { extractArrondissement } from "@/components/sections/rubriques/helpers";
import {
  DEFAULT_VISIBLE_CATEGORIES,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";

export const ACTIONS_MAP_FILTERS_STORAGE_KEY = "cmm_actions_map_filters";
export type ActionsMapStatusFilter = ActionStatus | "all";
export type ActionsMapDateScope = "current_year" | "all_time";

export type ActionsMapFilters = {
  days: number;
  dateScope: ActionsMapDateScope;
  statusFilter: ActionsMapStatusFilter;
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  zoneQuery: string;
  visibleCategories: Record<MarkerCategory, boolean>;
};

const VALID_STATUSES = new Set<ActionsMapStatusFilter>([
  "all",
  "approved",
]);
const VALID_DATE_SCOPES = new Set<ActionsMapDateScope>([
  "current_year",
  "all_time",
]);

const VALID_IMPACTS = new Set<ActionImpactLevel | "all">([
  "all",
  "faible",
  "moyen",
  "fort",
  "critique",
]);

const MAX_ZONE_QUERY_LENGTH = 120;

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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildArrondissementAliases(label: string): string[] {
  const arrondissement = extractArrondissement(label);
  if (arrondissement === "Hors arrondissement") {
    return [];
  }

  const number = arrondissement.replace(/e$/, "");
  return [
    arrondissement,
    `${number}e`,
    `${number}eme`,
    `${number} arrondissement`,
    `${number}e arrondissement`,
    `paris ${number}`,
    `paris ${number}e`,
  ];
}

function buildZoneSearchIndex(item: ActionMapItem): string {
  const locationLabel = item.location_label ?? "";
  const contractLocationLabel = item.contract?.location.label ?? "";
  const contractMetadata = item.contract?.metadata;
  const parts = [
    locationLabel,
    contractLocationLabel,
    item.notes_plain ?? "",
    contractMetadata?.notesPlain ?? "",
    contractMetadata?.associationName ?? "",
    contractMetadata?.placeType ?? "",
    contractMetadata?.departureLocationLabel ?? "",
    contractMetadata?.arrivalLocationLabel ?? "",
    extractArrondissement(locationLabel),
    extractArrondissement(contractLocationLabel),
    ...buildArrondissementAliases(locationLabel),
    ...buildArrondissementAliases(contractLocationLabel),
  ];

  return normalizeSearchText(parts.filter((part) => part.trim().length > 0).join(" "));
}

export function normalizeZoneQuery(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_ZONE_QUERY_LENGTH);
}

export function matchesZoneQuery(item: ActionMapItem, zoneQuery: string): boolean {
  const normalizedQuery = normalizeSearchText(normalizeZoneQuery(zoneQuery));
  if (!normalizedQuery) {
    return true;
  }

  return buildZoneSearchIndex(item).includes(normalizedQuery);
}

export function buildDefaultActionsMapFilters(
  initialDays: number,
): ActionsMapFilters {
  return {
    days: clampInteger(initialDays, 1, 3650, 90),
    dateScope: "current_year",
    statusFilter: "approved",
    impactFilter: "all",
    qualityMin: 0,
    zoneQuery: "",
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
  const legacyDays = clampInteger(source.days, 1, 3650, defaults.days);
  const explicitDateScope = source.dateScope;
  const normalizedDateScope =
    typeof explicitDateScope === "string"
      ? VALID_DATE_SCOPES.has(explicitDateScope)
        ? explicitDateScope
        : defaults.dateScope
      : legacyDays >= 3650
        ? "all_time"
        : defaults.dateScope;

  return {
    days: defaults.days,
    dateScope: normalizedDateScope,
    statusFilter: VALID_STATUSES.has(source.statusFilter ?? "all")
      ? ((source.statusFilter === "all" ? "approved" : source.statusFilter) as ActionsMapStatusFilter)
      : defaults.statusFilter,
    impactFilter: VALID_IMPACTS.has(source.impactFilter ?? "all")
      ? (source.impactFilter as ActionImpactLevel | "all")
      : defaults.impactFilter,
    qualityMin: clampInteger(source.qualityMin, 0, 100, defaults.qualityMin),
    zoneQuery: normalizeZoneQuery(source.zoneQuery),
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
