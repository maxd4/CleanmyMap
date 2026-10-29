import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type {
  ActionImpactLevel,
  ActionMapResponse,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  isVisibleWithCategoryFilter,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import { sumActionImpactKpis } from "@/lib/actions/impact-calculators";
import { formatMapFreshnessLabel } from "../actions-map-freshness.utils";
import {
  matchesZoneQuery,
  matchesContextFilter,
  normalizeZoneQuery,
  type ActionsMapDateScope,
} from "@/components/actions/map/filters/actions-map-filters.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { useActionPollutionScoreReferences } from "@/components/actions/map/scores/action-pollution-score-references-context";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import type { ActionContextFilter } from "@/lib/actions/action-context";

function resolveMapSourceCompleteness(
  data: Pick<ActionMapResponse, "partialSource" | "isTruncated"> | undefined,
): RepollutionDatasetCompleteness {
  return data?.partialSource || data?.isTruncated ? "partial" : "complete";
}

type UseMapFeedDataParams = {
  types: ActionRecordType[] | "all";
  days: number;
  dateScope: ActionsMapDateScope;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  zoneQuery?: string;
  contextFilter: ActionContextFilter;
  visibleCategories: Record<MarkerCategory, boolean>;
  limit?: number;
  viewport?: MapViewportState | null;
  enabled?: boolean;
  scoreScope?: PollutionScoreScope;
  displayMode?: CurrentPlaceStateMode;
};

export function useMapFeedData({
  types,
  days,
  dateScope,
  statusFilter,
  impactFilter,
  qualityMin,
  zoneQuery,
  contextFilter,
  visibleCategories,
  limit = 120,
  viewport = null,
  enabled = true,
  scoreScope = "global",
  displayMode = "projected_today",
}: UseMapFeedDataParams) {
  const { references: pollutionScoreReferences } = useActionPollutionScoreReferences();
  const normalizedZoneQuery = useMemo(
    () => normalizeZoneQuery(zoneQuery),
    [zoneQuery],
  );

  const serializedTypes = useMemo(
    () => (types === "all" ? "all" : [...new Set(types)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0).join(",")),
    [types],
  );

  const swrKey = useMemo(
    () => enabled ? [
      "actions-map",
      String(days),
      dateScope,
      statusFilter,
      serializedTypes,
      impactFilter,
      contextFilter,
      String(qualityMin),
      viewport
        ? [
            viewport.bounds.south,
            viewport.bounds.west,
            viewport.bounds.north,
            viewport.bounds.east,
            viewport.zoom,
          ].join(":")
        : "global",
    ] : null,
    [
      days,
      dateScope,
      statusFilter,
      serializedTypes,
      impactFilter,
      contextFilter,
      qualityMin,
      viewport,
      enabled,
    ],
  );

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const { data, error, isLoading: swrIsLoading, isValidating, mutate: reload } = useSWR<Awaited<ReturnType<typeof fetchMapActions>>, unknown>(
    swrKey,
    () =>
      fetchMapActions({
        status: statusFilter,
        days: dateScope === "current_year" ? days : undefined,
        floorDate: dateScope === "all_time" ? null : buildDateFloor(days),
        impact: impactFilter === "all" ? undefined : impactFilter,
        contextFilter,
        qualityMin: qualityMin > 0 ? qualityMin : undefined,
        limit,
        types,
        viewport,
      }),
    {
      ...swrRecentViewOptions,
      onSuccess: () => {
        setLastRefreshedAt(Date.now());
      },
    },
  );

  const isLoading = enabled ? swrIsLoading : false;

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);

  const items = useMemo(
    () =>
      allItems.filter(
        (item) =>
          isVisibleWithCategoryFilter(
            item,
            visibleCategories,
            pollutionScoreReferences,
            { scoreScope, displayMode },
          ) &&
          matchesZoneQuery(item, normalizedZoneQuery) &&
          matchesContextFilter(item, contextFilter),
      ),
    [
      allItems,
      displayMode,
      normalizedZoneQuery,
      pollutionScoreReferences,
      scoreScope,
      contextFilter,
      visibleCategories,
    ],
  );

  const summary = useMemo(() => {
    const totals = sumActionImpactKpis(
      items.map(
        (item) =>
          item.contract ?? {
            metadata: {
              wasteKg: item.waste_kg,
              cigaretteButts: item.cigarette_butts,
              volunteersCount: item.volunteers_count,
              wasteBreakdown: item.waste_breakdown,
            },
          },
      ),
    );
    return {
      totalKg: totals.wasteKg,
      totalButts: totals.butts,
      wasteKnownActions: totals.wasteKnownActions,
      wasteCoverageRate: totals.wasteCoverageRate,
    };
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
    isTruncated: data?.isTruncated ?? false,
    sourceCompleteness: resolveMapSourceCompleteness(data),
  };
}

export type MapFeedDataState = ReturnType<typeof useMapFeedData>;
