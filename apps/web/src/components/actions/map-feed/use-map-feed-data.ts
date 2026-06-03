import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type {
  ActionImpactLevel,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  isVisibleWithCategoryFilter,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import { formatMapFreshnessLabel } from "../actions-map-freshness.utils";
import {
  matchesZoneQuery,
  normalizeZoneQuery,
  type ActionsMapDateScope,
} from "@/components/actions/map/actions-map-filters.utils";
import type { PollutionScoreReferences } from "@/lib/actions/pollution-score";

type UseMapFeedDataParams = {
  types: ActionRecordType[] | "all";
  days: number;
  dateScope: ActionsMapDateScope;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  zoneQuery?: string;
  visibleCategories: Record<MarkerCategory, boolean>;
  pollutionScoreReferences?: PollutionScoreReferences | null;
  limit?: number;
};

export function useMapFeedData({
  types,
  days,
  dateScope,
  statusFilter,
  impactFilter,
  qualityMin,
  zoneQuery,
  visibleCategories,
  pollutionScoreReferences,
  limit = 120,
}: UseMapFeedDataParams) {
  const normalizedZoneQuery = useMemo(
    () => normalizeZoneQuery(zoneQuery),
    [zoneQuery],
  );

  const serializedTypes = useMemo(
    () => (types === "all" ? "all" : [...new Set(types)].sort().join(",")),
    [types],
  );

  const swrKey = useMemo(
    () => [
      "actions-map",
      String(days),
      dateScope,
      statusFilter,
      serializedTypes,
      impactFilter,
      String(qualityMin),
    ],
    [days, dateScope, statusFilter, serializedTypes, impactFilter, qualityMin],
  );

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const { data, error, isLoading, isValidating, mutate: reload } = useSWR(
    swrKey,
    () =>
      fetchMapActions({
        status: statusFilter,
        days: dateScope === "current_year" ? days : undefined,
        floorDate: dateScope === "all_time" ? null : buildDateFloor(days),
        impact: impactFilter === "all" ? undefined : impactFilter,
        qualityMin: qualityMin > 0 ? qualityMin : undefined,
        limit,
        types,
      }),
    {
      ...swrRecentViewOptions,
      onSuccess: () => {
        setLastRefreshedAt(Date.now());
      },
    },
  );

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);

  const items = useMemo(
    () =>
      allItems.filter(
        (item) =>
          isVisibleWithCategoryFilter(
            item,
            visibleCategories,
            pollutionScoreReferences,
          ) && matchesZoneQuery(item, normalizedZoneQuery),
      ),
    [allItems, normalizedZoneQuery, pollutionScoreReferences, visibleCategories],
  );

  const summary = useMemo(() => {
    const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
    const totalButts = items.reduce(
      (acc, item) => acc + (mapItemCigaretteButts(item) ?? 0),
      0,
    );
    return { totalKg, totalButts };
  }, [items]);

  const failedSources = data?.sourceHealth?.failedSources ?? [];
  const partialSourcesLabel = failedSources.length > 0 ? failedSources.join(", ") : "inconnues";

  const freshnessLabel = useMemo(
    () => formatMapFreshnessLabel(lastRefreshedAt),
    [lastRefreshedAt],
  );

  return {
    data,
    allItems,
    items,
    summary,
    error,
    isLoading,
    isValidating,
    reload,
    freshnessLabel,
    partialSourcesLabel,
    hasPartialSource: data?.partialSource ?? false,
  };
}

export type MapFeedDataState = ReturnType<typeof useMapFeedData>;
