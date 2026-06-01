"use client";

import { useEffect, useState } from "react";
import type { ActionImpactLevel } from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import {
  buildDefaultActionsMapFilters,
  readActionsMapFiltersFromStorage,
  writeActionsMapFiltersToStorage,
  type ActionsMapFilters,
  type ActionsMapDateScope,
  type ActionsMapStatusFilter,
} from "./actions-map-filters.utils";

export function useActionsMapFilters(initialDays: number) {
  const [filters, setFilters] = useState<ActionsMapFilters>(() => {
    if (typeof window === "undefined") {
      return buildDefaultActionsMapFilters(initialDays);
    }
    return readActionsMapFiltersFromStorage(window.localStorage, initialDays);
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      writeActionsMapFiltersToStorage(window.localStorage, filters);
    }
  }, [filters]);

  return {
    filters,
    setDays: (days: number) =>
      setFilters((current) => ({ ...current, days })),
    setDateScope: (dateScope: ActionsMapDateScope) =>
      setFilters((current) => ({ ...current, dateScope })),
    setStatusFilter: (statusFilter: ActionsMapStatusFilter) =>
      setFilters((current) => ({ ...current, statusFilter })),
    setImpactFilter: (impactFilter: ActionImpactLevel | "all") =>
      setFilters((current) => ({ ...current, impactFilter })),
    setQualityMin: (qualityMin: number) =>
      setFilters((current) => ({ ...current, qualityMin })),
    toggleCategory: (category: MarkerCategory) =>
      setFilters((current) => ({
        ...current,
        visibleCategories: {
          ...current.visibleCategories,
          [category]: !current.visibleCategories[category],
        },
      })),
    resetFilters: () => setFilters(buildDefaultActionsMapFilters(initialDays)),
  };
}
