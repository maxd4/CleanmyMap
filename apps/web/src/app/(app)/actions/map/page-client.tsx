"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";
import { ActionsMapFeedContent } from "@/components/actions/map-feed/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import { useActionsMapFilters } from "@/components/actions/map/use-actions-map-filters";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { cn } from "@/lib/utils";
import { MapKpiRibbon } from "./_components/map-kpi-ribbon";
import { MapControlTower } from "./_components/map-control-tower";
import { useMapFeedData } from "@/components/actions/map-feed/use-map-feed-data";
import { useMapActionById } from "@/components/actions/map-feed/use-map-action-by-id";
import { buildActionsMapSelectionHref, mergeSelectedActionIntoMapItems } from "@/components/actions/map-feed/actions-map-selection";
import { useActionsMapViewport } from "@/components/actions/map-feed/use-actions-map-viewport";
import {
  ActionPollutionScoreReferencesProvider,
} from "@/components/actions/map/action-pollution-score-references-context";
import {
  ACTIONS_MAP_PUBLIC_FEED_DEFAULTS,
  getActionsMapCurrentYearDays,
} from "@/components/actions/map/actions-map-filters.utils";

type ActionsMapPageClientProps = {
  impactMetrics: PublicImpactMetric[];
  staticIntro?: ReactNode;
};

export function ActionsMapPageClient({
  impactMetrics,
  staticIntro,
}: ActionsMapPageClientProps) {
    return (
      <ActionPollutionScoreReferencesProvider>
      <ActionsMapPageContent impactMetrics={impactMetrics} staticIntro={staticIntro} />
    </ActionPollutionScoreReferencesProvider>
  );
}

function ActionsMapPageContent({
  impactMetrics,
  staticIntro,
}: ActionsMapPageClientProps) {
  const pageFamily = resolvePageFamily("/actions/map");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedActionId = searchParams.get("actionId")?.trim() || null;
  const {
    filters,
    setDateScope,
    setZoneQuery,
    toggleCategory,
    resetFilters,
  } = useActionsMapFilters(getActionsMapCurrentYearDays());
  const {
    days,
    dateScope,
    zoneQuery,
    visibleCategories,
  } = filters;

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
  const updateSelectionUrl = useCallback(
    (actionId: string | null) => {
      router.push(
        buildActionsMapSelectionHref(pathname, searchParams.toString(), actionId),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );
  const handleSelectAction = useCallback((actionId: string) => {
    const nextActionId = requestedActionId === actionId ? null : actionId;
    updateSelectionUrl(nextActionId);
  }, [requestedActionId, updateSelectionUrl]);

  const handleDateScopeChange = useCallback((dateScopeValue: typeof dateScope) => {
    updateSelectionUrl(null);
    setDateScope(dateScopeValue);
  }, [setDateScope, updateSelectionUrl]);

  const handleZoneQueryChange = useCallback((zoneQueryValue: string) => {
    updateSelectionUrl(null);
    setZoneQuery(zoneQueryValue);
  }, [setZoneQuery, updateSelectionUrl]);

  const handleCategoryToggle = useCallback((category: MarkerCategory) => {
    updateSelectionUrl(null);
    toggleCategory(category);
  }, [toggleCategory, updateSelectionUrl]);

  const handleResetFilters = useCallback(() => {
    updateSelectionUrl(null);
    resetFilters();
  }, [resetFilters, updateSelectionUrl]);

  const mapFeedData = useMapFeedData({
    types: "all",
    days,
    dateScope,
    statusFilter: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.statusFilter,
    impactFilter: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.impactFilter,
    qualityMin: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.qualityMin,
    zoneQuery,
    visibleCategories,
    limit: 300,
    viewport: mapViewport,
    enabled: isInitialViewportResolved && hasInitialPublicActions && !initialViewportError,
    scoreScope,
    displayMode,
  });
  const loadedItems = useMemo(() => mapFeedData.allItems ?? [], [mapFeedData.allItems]);
  const knownSelectedAction = useMemo(
    () =>
      requestedActionId
        ? loadedItems.find((item) => item.id === requestedActionId) ?? null
        : null,
    [loadedItems, requestedActionId],
  );
  const selectedActionLoad = useMapActionById(
    requestedActionId,
    knownSelectedAction,
  );
  const selectedAction = selectedActionLoad.item;
  const mapFeedDataForView = useMemo(() => {
    if (!selectedAction) {
      return mapFeedData;
    }

    const allItems = mergeSelectedActionIntoMapItems(
      mapFeedData.allItems,
      selectedAction,
    );
    const items = mergeSelectedActionIntoMapItems(mapFeedData.items, selectedAction);

    return { ...mapFeedData, allItems, items };
  }, [mapFeedData, selectedAction]);
  const filteredMapItems = useMemo(() => mapFeedDataForView.items ?? [], [mapFeedDataForView.items]);
  const visibleCount = filteredMapItems.length;
  const loadedCount = mapFeedDataForView.allItems.length;

  const clearSelection = useCallback(() => {
    updateSelectionUrl(null);
  }, [updateSelectionUrl]);

  const surfaceCard = "rounded-[3rem] border border-sky-200/70 bg-sky-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]";

  return (
    <main className="min-h-screen text-slate-950 pb-24">
      <div className="cmm-page-width px-6 py-6 space-y-6">
        {/* Premium Header - Lecture Spatiale */}
        <header className="relative space-y-6 overflow-hidden pt-4 lg:pt-6">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

          {staticIntro ?? (
            <PageHeader
              family={pageFamily}
              title="Cartographie des actions"
              subtitle={
                scoreScope === "department"
                  ? "Les couleurs montrent le score relatif réel de chaque action par rapport à la référence de son département. Ce score n'est pas projeté dans le temps."
                  : displayMode === "observed"
                    ? "Les couleurs montrent la pollution observée ou mesurée pour chaque action. Aucune projection temporelle n'est utilisée dans ce mode."
                    : "Les couleurs montrent une pollution projetée à partir de la dernière action. Cette estimation ne constitue pas une mesure actuelle du terrain."
              }
              className="w-full"
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CmmButton href="/actions/new" tone="primary" variant="pill" className="w-full justify-center px-5 py-2.5 cmm-text-small font-black uppercase tracking-[0.2em] gap-3 sm:w-auto">
              Déclarer <ArrowRight size={14} className="transition-transform hover:translate-x-1" />
            </CmmButton>
            <CmmButton href="/methodologie" tone="tertiary" variant="pill" className="w-full justify-center px-5 py-2.5 cmm-text-small font-black uppercase tracking-[0.2em] gap-3 sm:w-auto">
              Méthodologie <ArrowRight size={14} />
            </CmmButton>
          </div>
        </header>

        <section className="relative mx-auto w-full lg:left-1/2 lg:right-1/2 lg:w-[calc(100vw-1.5rem)] lg:-translate-x-1/2">
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

        <div className="cmm-page-width px-6 space-y-10">
          <div className="min-w-0 space-y-6">
            <MapKpiRibbon metrics={impactMetrics} />

            <MapControlTower
              filters={filters}
              visibleCount={visibleCount}
              loadedCount={loadedCount}
              filteredMapItems={filteredMapItems}
              freshnessLabel={mapFeedData.freshnessLabel}
              mapExportTargetRef={mapExportTargetRef}
              viewport={mapViewport}
            />

            <section className={cn(surfaceCard, "space-y-6 p-6 sm:p-8")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
                    <span className="h-4 w-4 rounded-full bg-sky-500 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
                    Journal des actions
                  </p>
                  <p className="cmm-text-body font-medium">
                    Les éléments visibles et leurs données utiles, dans le contexte de cette vue.
                  </p>
                </div>
                <CmmButton href="/reports" tone="tertiary" variant="pill" className="w-full justify-center gap-2 sm:w-auto">
                  Voir les rapports <ArrowRight size={14} />
                </CmmButton>
              </div>

              <ActionsMapTable
                items={filteredMapItems}
                compact
                selectedActionId={selectedActionId}
                onSelectAction={handleSelectAction}
                scoreScope={scoreScope}
                displayMode={displayMode}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
