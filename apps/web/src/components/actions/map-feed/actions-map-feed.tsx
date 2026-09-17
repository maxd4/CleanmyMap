"use client";

import { useEffect, useState, type RefObject } from "react";
import { DEFAULT_VISIBLE_CATEGORIES } from "@/components/actions/map-marker-categories";
import {
  type ActionsMapCanvasComponent,
  type ActionsMapFeedProps,
} from "./map-feed.types";
import { ACTIONS_MAP_PUBLIC_FEED_DEFAULTS } from "@/components/actions/map/actions-map-filters.utils";
import { useMapFeedData, type MapFeedDataState } from "./use-map-feed-data";
import { ImmersiveLayout } from "./_layouts/immersive-layout";
import { DefaultLayout } from "./_layouts/default-layout";
import { logFailure } from "@/lib/logging/failure-log";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { HOMEPAGE_MAP_VIEWPORT } from "@/components/actions/actions-map-canvas.utils";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { useActionsMapViewport } from "./use-actions-map-viewport";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import { ActionPollutionScoreReferencesProvider } from "@/components/actions/map/action-pollution-score-references-context";
import type {
  ActionsMapDateScope,
  ActionsMapFilters,
} from "@/components/actions/map/actions-map-filters.utils";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";

type ActionsMapFeedContentProps = {
  feedData: MapFeedDataState;
  presentation?: ActionsMapFeedProps["presentation"];
  tone?: "sky" | "emerald";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  compact?: boolean;
  zoneQuery?: string;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
  onClearSelection?: () => void;
  frameSelectedActionId?: string | null;
  onResetFilters?: () => void;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  initialViewport?: MapViewportState | null;
  viewportRequest?: MapViewportState | null;
  viewportRequestKey?: number;
  recenterViewport?: MapViewportState | null;
  isInitialViewportResolved?: boolean;
  initialViewportError?: Error | null;
  onRetryInitialViewport?: () => void;
  scoreScope?: ActionsMapFeedProps["scoreScope"];
  onScoreScopeChange?: ActionsMapFeedProps["onScoreScopeChange"];
  displayMode?: ActionsMapFeedProps["displayMode"];
  onDisplayModeChange?: ActionsMapFeedProps["onDisplayModeChange"];
  filters?: ActionsMapFilters;
  onZoneQueryChange?: (zoneQuery: string) => void;
  onDateScopeChange?: (dateScope: ActionsMapDateScope) => void;
  onCategoryToggle?: (category: MarkerCategory) => void;
};

export function ActionsMapFeedContent({
  feedData,
  presentation = "default",
  tone = "sky",
  showIntro = true,
  fullViewport = false,
  showStoriesCarousel = true,
  compact = false,
  zoneQuery = "",
  selectedActionId = null,
  onOpenAction,
  onClearSelection,
  frameSelectedActionId = null,
  onResetFilters,
  mapExportTargetRef,
  onViewportChange,
  onViewportInteraction,
  initialViewport = null,
  viewportRequest = null,
  viewportRequestKey = 0,
  recenterViewport = null,
  isInitialViewportResolved = true,
  initialViewportError = null,
  onRetryInitialViewport,
  scoreScope = "global",
  onScoreScopeChange,
  displayMode = "projected_today",
  onDisplayModeChange,
  filters,
  onZoneQueryChange,
  onDateScopeChange,
  onCategoryToggle,
}: ActionsMapFeedContentProps) {
  const [MapCanvas, setMapCanvas] = useState<ActionsMapCanvasComponent | null>(null);
  const [mapCanvasError, setMapCanvasError] = useState<string | null>(null);
  const { ref: mapShellRef, isInView: isMapVisible } = useInViewOnce<HTMLElement>({
    rootMargin: "260px 0px",
  });
  const isEmerald = tone === "emerald";

  useEffect(() => {
    if (!isMapVisible) {
      return;
    }

    let cancelled = false;

    void import("@/components/actions/actions-map-canvas")
      .then((mod) => {
        if (!cancelled) {
          setMapCanvas(() => mod.ActionsMapCanvas);
          setMapCanvasError(null);
        }
      })
      .catch((importError: unknown) => {
        if (!cancelled) {
          const message =
            importError instanceof Error
              ? importError.message
              : "Le module de cartographie n'a pas pu être chargé. Veuillez rafraîchir la page.";
          logFailure("ActionsMapFeed", "Map canvas import failed", importError);
          setMapCanvasError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isMapVisible]);

  const isHomepagePreview = presentation === "homepage-preview";
  const isImmersive = presentation === "immersive";

  if (isHomepagePreview) {
    return (
      <section
        ref={mapShellRef}
        aria-label="Aperçu de la carte des actions"
        aria-busy={feedData.isLoading || feedData.isValidating}
        className="relative h-full min-h-[18rem] w-full"
      >
        {MapCanvas ? (
          <MapCanvas
            items={feedData.items}
            sourceItems={feedData.allItems}
            sourceCompleteness={feedData.hasPartialSource ? "partial" : "complete"}
            compact
            presentation="homepage-preview"
            tone="emerald"
            initialViewport={initialViewport}
            viewportRequest={viewportRequest}
            viewportRequestKey={viewportRequestKey}
            recenterViewport={recenterViewport}
            onViewportChange={onViewportChange}
            onViewportInteraction={onViewportInteraction}
          />
        ) : (
          <div className="h-full min-h-[18rem] w-full" aria-hidden="true" />
        )}
        {feedData.error ? (
          <span className="sr-only">
            Impossible de récupérer les données de la carte.
          </span>
        ) : null}
      </section>
    );
  }

  const shellClass = isImmersive
    ? isEmerald
      ? "relative overflow-hidden rounded-[2.25rem] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,250,241,0.98),rgba(250,253,247,1))] p-4 shadow-[0_28px_80px_-36px_rgba(34,197,94,0.16)] sm:p-6"
      : "relative overflow-hidden rounded-[2.25rem] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(233,244,252,0.96),rgba(248,253,255,0.98))] p-4 shadow-[0_28px_80px_-36px_rgba(14,165,233,0.18)] sm:p-6"
    : isEmerald
      ? "rounded-2xl border border-emerald-200/70 bg-[rgba(245,251,244,0.96)] p-6 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.14)]"
      : "rounded-2xl border border-sky-200/80 bg-[rgba(239,248,253,0.96)] p-6 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]";

  const layoutProps = {
    items: feedData.items,
    allItems: feedData.allItems,
    summary: feedData.summary,
    hasPartialSource: feedData.hasPartialSource,
    partialSourcesLabel: feedData.partialSourcesLabel,
    freshnessLabel: feedData.freshnessLabel,
    isValidating: feedData.isValidating,
    mapCanvasError,
    MapCanvas,
    selectedActionId,
    onOpenAction: onOpenAction ?? (() => {}),
    onSelectAction: onOpenAction ?? (() => {}),
    onClearSelection,
    frameSelectedActionId,
    onReload: () => void feedData.reload(),
    onResetFilters: onResetFilters ?? (() => {}),
    showIntro,
    fullViewport,
    showStoriesCarousel,
    compact,
    zoneQuery,
    mapExportTargetRef,
    initialViewport,
    viewportRequest,
    viewportRequestKey,
    recenterViewport,
    isInitialViewportResolved,
    tone,
    onViewportChange,
    onViewportInteraction,
    sourceCompleteness: (feedData.hasPartialSource
      ? "partial"
      : "complete") as RepollutionDatasetCompleteness,
    scoreScope,
    onScoreScopeChange,
    displayMode,
    onDisplayModeChange,
    filters,
    onZoneQueryChange,
    onDateScopeChange,
    onCategoryToggle,
  };

  return (
    <section ref={mapShellRef} className={shellClass}>
      {initialViewportError ? (
        <CmmFeedback
          tone="error"
          title="Carte indisponible"
          action={
            onRetryInitialViewport ? (
              <CmmButton type="button" tone="secondary" variant="pill" onClick={onRetryInitialViewport}>
                Réessayer
              </CmmButton>
            ) : null
          }
        >
          Impossible de résoudre une zone cartographique stable. Réessaie le chargement de la carte.
        </CmmFeedback>
      ) : isImmersive ? (
        <ImmersiveLayout {...layoutProps} />
      ) : (
        <DefaultLayout {...layoutProps} />
      )}

      {feedData.isLoading && !compact ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="cmm-surface-muted space-y-3 rounded-2xl p-4">
            <CmmSkeleton variant="text" className="w-32" />
            <CmmSkeleton variant="title" className="w-48" />
            <CmmSkeleton variant="text" className="w-3/4" />
          </div>
          <div className="cmm-surface-muted space-y-3 rounded-2xl p-4">
            <CmmSkeleton variant="text" className="w-28" />
            <CmmSkeleton variant="title" className="w-40" />
            <div className="flex gap-2">
              <CmmSkeleton variant="rectangular" className="h-8 w-20 rounded-full" />
              <CmmSkeleton variant="rectangular" className="h-8 w-16 rounded-full" />
            </div>
          </div>
          <div className="cmm-surface-muted space-y-3 rounded-2xl p-4">
            <CmmSkeleton variant="text" className="w-24" />
            <CmmSkeleton variant="chart" className="h-24" />
          </div>
        </div>
      ) : null}

      {feedData.error ? (
        <CmmFeedback tone="error" className={compact ? "absolute bottom-3 left-5 right-5 z-[1200]" : "mt-5"}>
          {feedData.error instanceof Error
            ? feedData.error.message
            : "Impossible de récupérer les données de la carte. Veuillez vérifier votre connexion."}
        </CmmFeedback>
      ) : null}
    </section>
  );
}

function ActionsMapFeedWithReferences({
  types = "all",
  days,
  dateScope = ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.dateScope,
  statusFilter,
  impactFilter,
  qualityMin,
  zoneQuery,
  limit = 120,
  presentation = "default",
  tone = "sky",
  showIntro = true,
  fullViewport = false,
  showStoriesCarousel = true,
  compact = false,
  visibleCategories = DEFAULT_VISIBLE_CATEGORIES,
  selectedActionId = null,
  onOpenAction,
  onResetFilters,
  mapExportTargetRef,
  onViewportChange,
  scoreScope = "global",
  onScoreScopeChange,
  displayMode = "projected_today",
  onDisplayModeChange,
}: ActionsMapFeedProps) {
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
  } = useActionsMapViewport(
    onViewportChange,
    presentation === "homepage-preview"
      ? {
          fallbackViewport: HOMEPAGE_MAP_VIEWPORT,
          useRemoteFallback: false,
        }
      : undefined,
  );

  const feedData = useMapFeedData({
    types,
    days,
    dateScope,
    statusFilter,
    impactFilter,
    qualityMin,
    zoneQuery,
    visibleCategories,
    limit,
    viewport: mapViewport,
    enabled: isInitialViewportResolved && hasInitialPublicActions && !initialViewportError,
    scoreScope,
    displayMode,
  });

  return (
    <ActionsMapFeedContent
      feedData={feedData}
      presentation={presentation}
      showIntro={showIntro}
      fullViewport={fullViewport}
      showStoriesCarousel={showStoriesCarousel}
      compact={compact}
      zoneQuery={zoneQuery}
      tone={tone}
      selectedActionId={selectedActionId}
      onOpenAction={onOpenAction}
      onResetFilters={onResetFilters}
      mapExportTargetRef={mapExportTargetRef}
      initialViewport={mapViewport}
      viewportRequest={viewportRequest}
      viewportRequestKey={viewportRequestKey}
      recenterViewport={recenterViewport}
      isInitialViewportResolved={isInitialViewportResolved}
      initialViewportError={initialViewportError}
      onRetryInitialViewport={retryInitialViewport}
      onViewportChange={handleViewportChange}
      onViewportInteraction={handleManualViewportInteraction}
      scoreScope={scoreScope}
      onScoreScopeChange={onScoreScopeChange}
      displayMode={displayMode}
      onDisplayModeChange={onDisplayModeChange}
    />
  );
}

export function ActionsMapFeed(props: ActionsMapFeedProps) {
  return (
    <ActionPollutionScoreReferencesProvider>
      <ActionsMapFeedWithReferences {...props} />
    </ActionPollutionScoreReferencesProvider>
  );
}
