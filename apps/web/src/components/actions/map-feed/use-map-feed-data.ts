import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  isVisibleWithCategoryFilter,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import { formatMapFreshnessLabel } from "../actions-map-freshness.utils";

type UseMapFeedDataParams = {
  types: ActionRecordType[] | "all";
  days: number;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  visibleCategories: Record<MarkerCategory, boolean>;
};

export function useMapFeedData({
  types,
  days,
  statusFilter,
  impactFilter,
  qualityMin,
  visibleCategories,
}: UseMapFeedDataParams) {
  const serializedTypes = useMemo(
    () => (types === "all" ? "all" : [...new Set(types)].sort().join(",")),
    [types],
  );

  const swrKey = useMemo(
    () => [
      "actions-map",
      String(days),
      statusFilter,
      serializedTypes,
      impactFilter,
      String(qualityMin),
    ],
    [days, statusFilter, serializedTypes, impactFilter, qualityMin],
  );

  const { data, error, isLoading, isValidating, mutate: reload } = useSWR(
    swrKey,
    () =>
      fetchMapActions({
        status: statusFilter,
        days,
        impact: impactFilter === "all" ? undefined : impactFilter,
        qualityMin: qualityMin > 0 ? qualityMin : undefined,
        limit: 120,
        types,
      }),
    swrRecentViewOptions,
  );

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);
  
  const items = useMemo(
    () =>
      allItems.filter((item) =>
        isVisibleWithCategoryFilter(item, visibleCategories),
      ),
    [allItems, visibleCategories],
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

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  
  useEffect(() => {
    if (data) {
      setLastRefreshedAt(Date.now());
    }
  }, [data]);

  const freshnessLabel = useMemo(
    () => formatMapFreshnessLabel(lastRefreshedAt),
    [lastRefreshedAt],
  );

  return {
    data,
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
