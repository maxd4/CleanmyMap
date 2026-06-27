"use client";

import { useEffect, useState, type RefObject } from "react";
import { DEFAULT_VISIBLE_CATEGORIES } from "@/components/actions/map-marker-categories";
import type { ActionsMapCanvasComponent, ActionsMapFeedProps } from "./map-feed.types";
import { useMapFeedData, type MapFeedDataState } from "./use-map-feed-data";
import { ImmersiveLayout } from "./_layouts/immersive-layout";
import { DefaultLayout } from "./_layouts/default-layout";
import { logFailure } from "@/lib/logging/failure-log";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { useActionsMapViewport } from "./use-actions-map-viewport";

type ActionsMapFeedContentProps = {
  feedData: MapFeedDataState;
  presentation?: "default" | "immersive";
  tone?: "sky" | "emerald";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  zoneQuery?: string;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
  onResetFilters?: () => void;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
  initialViewport?: MapViewportState | null;
};

export function ActionsMapFeedContent({
  feedData,
  presentation = "default",
  tone = "sky",
  showIntro = true,
  fullViewport = false,
  showStoriesCarousel = true,
  zoneQuery = "",
  selectedActionId = null,
  onOpenAction,
  onResetFilters,
  mapExportTargetRef,
  onViewportChange,
  initialViewport = null,
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

  const isImmersive = presentation === "immersive";

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
    onReload: () => void feedData.reload(),
    onResetFilters: onResetFilters ?? (() => {}),
    showIntro,
    fullViewport,
    showStoriesCarousel,
    zoneQuery,
    mapExportTargetRef,
    initialViewport,
    tone,
    onViewportChange,
  };

  return (
    <section ref={mapShellRef} className={shellClass}>
      {isImmersive ? (
        <ImmersiveLayout {...layoutProps} />
      ) : (
        <DefaultLayout {...layoutProps} />
      )}

      {feedData.isLoading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className={`space-y-3 rounded-2xl border p-4 ${isEmerald ? "border-emerald-200/70 bg-white/86" : "border-sky-200/80 bg-white/80"}`}>
            <CmmSkeleton variant="text" className="w-32" />
            <CmmSkeleton variant="title" className="w-48" />
            <CmmSkeleton variant="text" className="w-3/4" />
          </div>
          <div className={`space-y-3 rounded-2xl border p-4 ${isEmerald ? "border-emerald-200/70 bg-white/86" : "border-sky-200/80 bg-white/80"}`}>
            <CmmSkeleton variant="text" className="w-28" />
            <CmmSkeleton variant="title" className="w-40" />
            <div className="flex gap-2">
              <CmmSkeleton variant="rectangular" className="h-8 w-20 rounded-full" />
              <CmmSkeleton variant="rectangular" className="h-8 w-16 rounded-full" />
            </div>
          </div>
          <div className={`space-y-3 rounded-2xl border p-4 ${isEmerald ? "border-emerald-200/70 bg-white/86" : "border-sky-200/80 bg-white/80"}`}>
            <CmmSkeleton variant="text" className="w-24" />
            <CmmSkeleton variant="chart" className="h-24" />
          </div>
        </div>
      ) : null}

      {feedData.error ? (
        <p className="mt-5 rounded-lg border border-rose-300/20 bg-[rgba(255,241,245,0.95)] px-3 py-2 text-sm text-rose-800">
          {feedData.error instanceof Error
            ? feedData.error.message
            : "Impossible de récupérer les données de la carte. Veuillez vérifier votre connexion."}
        </p>
      ) : null}
    </section>
  );
}

export function ActionsMapFeed({
  types = "all",
  days,
  dateScope = "current_year",
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
  visibleCategories = DEFAULT_VISIBLE_CATEGORIES,
  selectedActionId = null,
  onOpenAction,
  onResetFilters,
  mapExportTargetRef,
  onViewportChange,
}: ActionsMapFeedProps) {
  const { viewport: mapViewport, handleViewportChange } = useActionsMapViewport(onViewportChange);

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
  });

  return (
    <ActionsMapFeedContent
      feedData={feedData}
      presentation={presentation}
      showIntro={showIntro}
      fullViewport={fullViewport}
      showStoriesCarousel={showStoriesCarousel}
      zoneQuery={zoneQuery}
      tone={tone}
      selectedActionId={selectedActionId}
      onOpenAction={onOpenAction}
      onResetFilters={onResetFilters}
      mapExportTargetRef={mapExportTargetRef}
      initialViewport={mapViewport}
      onViewportChange={handleViewportChange}
    />
  );
}
