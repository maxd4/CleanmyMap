"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";
import { ActionsMapFeedContent } from "@/components/actions/map-feed/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import { useActionsMapFilters } from "@/components/actions/map/filters/use-actions-map-filters";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { ActionContextFilter } from "@/lib/actions/action-context";
import type { ActionsMapDateScope } from "@/components/actions/map/filters/actions-map-filters.utils";
import { MapKpiRibbon } from "./_components/map-kpi-ribbon";
import { MapControlTower } from "./_components/map-control-tower";
import { useMapFeedData } from "@/components/actions/map-feed/use-map-feed-data";
import { useMapActionById } from "@/components/actions/map-feed/use-map-action-by-id";
import { buildActionsMapSelectionHref, mergeSelectedActionIntoMapItems } from "@/components/actions/map-feed/actions-map-selection";
import { useActionsMapViewport } from "@/components/actions/map-feed/use-actions-map-viewport";
import {
  ActionPollutionScoreReferencesProvider,
} from "@/components/actions/map/scores/action-pollution-score-references-context";
import {
  ACTIONS_MAP_PUBLIC_FEED_DEFAULTS,
  getActionsMapCurrentYearDays,
} from "@/components/actions/map/filters/actions-map-filters.utils";

type ActionsMapPageClientProps = {
  impactMetrics: PublicImpactMetric[];
};

export function ActionsMapPageClient({
  impactMetrics,
}: ActionsMapPageClientProps) {
    return (
      <ActionPollutionScoreReferencesProvider>
      <ActionsMapPageContent impactMetrics={impactMetrics} />
    </ActionPollutionScoreReferencesProvider>
  );
}

function useActionsMapSelectionHandlers({ router, pathname, searchParams, requestedActionId, filterControls }: { router: ReturnType<typeof useRouter>; pathname: string; searchParams: ReturnType<typeof useSearchParams>; requestedActionId: string | null; filterControls: ReturnType<typeof useActionsMapFilters> }) {
  const { setDateScope, setZoneQuery, setContextFilter, toggleCategory, resetFilters } = filterControls;
  const updateSelectionUrl = useCallback((actionId: string | null) => { router.push(buildActionsMapSelectionHref(pathname, searchParams.toString(), actionId), { scroll: false }); }, [pathname, router, searchParams]);
  const handleSelectAction = useCallback((actionId: string) => updateSelectionUrl(requestedActionId === actionId ? null : actionId), [requestedActionId, updateSelectionUrl]);
  const handleDateScopeChange = useCallback((dateScopeValue: ActionsMapDateScope) => { updateSelectionUrl(null); setDateScope(dateScopeValue); }, [setDateScope, updateSelectionUrl]);
  const handleZoneQueryChange = useCallback((zoneQueryValue: string) => { updateSelectionUrl(null); setZoneQuery(zoneQueryValue); }, [setZoneQuery, updateSelectionUrl]);
  const handleContextFilterChange = useCallback((contextFilterValue: ActionContextFilter) => { updateSelectionUrl(null); setContextFilter(contextFilterValue); }, [setContextFilter, updateSelectionUrl]);
  const handleCategoryToggle = useCallback((category: MarkerCategory) => { updateSelectionUrl(null); toggleCategory(category); }, [toggleCategory, updateSelectionUrl]);
  const handleResetFilters = useCallback(() => { updateSelectionUrl(null); resetFilters(); }, [resetFilters, updateSelectionUrl]);
  const clearSelection = useCallback(() => updateSelectionUrl(null), [updateSelectionUrl]);
  return { handleSelectAction, handleDateScopeChange, handleZoneQueryChange, handleContextFilterChange, handleCategoryToggle, handleResetFilters, clearSelection, updateSelectionUrl };
}

function useActionsMapPageData({ filters, requestedActionId, mapViewport, isInitialViewportResolved, hasInitialPublicActions, initialViewportError, scoreScope, displayMode }: { filters: ReturnType<typeof useActionsMapFilters>["filters"]; requestedActionId: string | null; mapViewport: ReturnType<typeof useActionsMapViewport>["viewport"]; isInitialViewportResolved: boolean; hasInitialPublicActions: boolean; initialViewportError: Error | null; scoreScope: PollutionScoreScope; displayMode: CurrentPlaceStateMode }) {
  const mapFeedData = useMapFeedData({ types: "all", days: filters.days, dateScope: filters.dateScope, statusFilter: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.statusFilter, impactFilter: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.impactFilter, qualityMin: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.qualityMin, zoneQuery: filters.zoneQuery, contextFilter: filters.contextFilter, visibleCategories: filters.visibleCategories, limit: 300, viewport: mapViewport, enabled: isInitialViewportResolved && hasInitialPublicActions && !initialViewportError, scoreScope, displayMode });
  const loadedItems = useMemo(() => mapFeedData.allItems ?? [], [mapFeedData.allItems]);
  const knownSelectedAction = useMemo(() => requestedActionId ? loadedItems.find((item) => item.id === requestedActionId) ?? null : null, [loadedItems, requestedActionId]);
  const selectedActionLoad = useMapActionById(requestedActionId, knownSelectedAction);
  const selectedAction = selectedActionLoad.item;
  const mapFeedDataForView = useMemo(() => {
    if (!selectedAction) return mapFeedData;
    return { ...mapFeedData, allItems: mergeSelectedActionIntoMapItems(mapFeedData.allItems, selectedAction), items: mergeSelectedActionIntoMapItems(mapFeedData.items, selectedAction) };
  }, [mapFeedData, selectedAction]);
  const filteredMapItems = useMemo(() => mapFeedDataForView.items ?? [], [mapFeedDataForView.items]);
  const visibleCount = filteredMapItems.length;
  const loadedCount = mapFeedDataForView.allItems.length;
  return { mapFeedData, mapFeedDataForView, selectedActionLoad, knownSelectedAction, filteredMapItems, visibleCount, loadedCount };
}

function ActionsMapPageContent({
  impactMetrics,
}: ActionsMapPageClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedActionId = searchParams.get("actionId")?.trim() || null;
  const filterControls = useActionsMapFilters(getActionsMapCurrentYearDays());
  const {
    filters,
  } = filterControls;
  const { zoneQuery } = filters;

  const selectedActionId = requestedActionId;
  const [scoreScope, setScoreScope] = useState<PollutionScoreScope>("global");
  const [displayMode, setDisplayMode] = useState<CurrentPlaceStateMode>("projected_today");
  const {
    viewport: mapViewport,
    viewportRequest,
    viewportRequestKey,
    recenterViewport,
    isInitialViewportResolved,
    hasInitialPublicActions,
    initialViewportError,
    retryInitialViewport,
    handleManualViewportInteraction,
    handleViewportChange,
  } = useActionsMapViewport();
  const mapExportTargetRef = useRef<HTMLDivElement | null>(null);
  const [hasManualViewportInteraction, setHasManualViewportInteraction] =
    useState(false);
  const handleMapViewportInteraction = useCallback(() => {
    setHasManualViewportInteraction(true);
    handleManualViewportInteraction();
  }, [handleManualViewportInteraction]);
  const { handleSelectAction, handleDateScopeChange, handleZoneQueryChange, handleContextFilterChange, handleCategoryToggle, handleResetFilters, clearSelection } = useActionsMapSelectionHandlers({ router, pathname, searchParams, requestedActionId, filterControls });

  const { mapFeedDataForView, selectedActionLoad, knownSelectedAction, filteredMapItems, visibleCount, loadedCount } = useActionsMapPageData({ filters, requestedActionId, mapViewport, isInitialViewportResolved, hasInitialPublicActions, initialViewportError, scoreScope, displayMode });

  const isViewUnavailable = Boolean(initialViewportError || (mapFeedDataForView.error && loadedCount === 0));
  const isViewLoading = !isViewUnavailable && (!isInitialViewportResolved || (mapFeedDataForView.isLoading && loadedCount === 0));
  const modeStatusLabel =
    scoreScope === "department"
      ? "Comparaison départementale active."
      : displayMode === "observed"
        ? "Mode observation actif."
        : "Mode projection actif.";

  return (
    <div className="pb-12 text-[var(--text-primary)] sm:pb-16">
      <div className="cmm-page-width space-y-4 px-3 py-4 sm:space-y-5 sm:px-6">
        <section className="relative min-w-0 w-full" aria-label="Carte des actions">
          <ActionsMapFeedContent
            feedData={mapFeedDataForView}
            presentation="immersive"
            showIntro={false}
            fullViewport
            showStoriesCarousel={false}
            zoneQuery={zoneQuery}
            selectedActionId={selectedActionId}
            onOpenAction={handleSelectAction}
            onClearSelection={clearSelection}
            frameSelectedActionId={
              !hasManualViewportInteraction &&
              selectedActionLoad.item &&
              !knownSelectedAction
                ? selectedActionLoad.item.id
                : null
            }
            onResetFilters={handleResetFilters}
            filters={filters}
            onZoneQueryChange={handleZoneQueryChange}
            onContextFilterChange={handleContextFilterChange}
            onDateScopeChange={handleDateScopeChange}
            onCategoryToggle={handleCategoryToggle}
            mapExportTargetRef={mapExportTargetRef}
            initialViewport={mapViewport}
            isInitialViewportResolved={isInitialViewportResolved}
            viewportRequest={viewportRequest}
            viewportRequestKey={viewportRequestKey}
            recenterViewport={recenterViewport}
            initialViewportError={initialViewportError}
            onRetryInitialViewport={retryInitialViewport}
            onViewportChange={handleViewportChange}
            onViewportInteraction={handleMapViewportInteraction}
            scoreScope={scoreScope}
            onScoreScopeChange={setScoreScope}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </section>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <MapControlTower
            filters={filters}
            visibleCount={visibleCount}
            loadedCount={loadedCount}
            filteredMapItems={filteredMapItems}
            freshnessLabel={mapFeedDataForView.freshnessLabel}
            modeStatusLabel={modeStatusLabel}
            hasPartialSource={mapFeedDataForView.hasPartialSource}
            partialSourcesLabel={mapFeedDataForView.partialSourcesLabel}
            isTruncated={mapFeedDataForView.isTruncated}
            isLoading={isViewLoading}
            isUnavailable={isViewUnavailable}
            mapExportTargetRef={mapExportTargetRef}
            viewport={mapViewport}
          />

          <MapKpiRibbon metrics={impactMetrics} />

          <ActionsMapTable
            items={filteredMapItems}
            compact
            selectedActionId={selectedActionId}
            onSelectAction={handleSelectAction}
            scoreScope={scoreScope}
            displayMode={displayMode}
            description="Les éléments visibles dans cette vue."
            headerAction={
              <CmmButton href="/reports" tone="tertiary" variant="pill" className="w-full justify-center gap-2 sm:w-auto">
                Voir les rapports <ArrowRight size={14} aria-hidden="true" />
              </CmmButton>
            }
            dataUnavailable={isViewUnavailable}
            dataLoading={isViewLoading}
          />
        </div>
      </div>
    </div>
  );
}
