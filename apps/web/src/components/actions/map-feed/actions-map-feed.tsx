"use client";

import { useEffect, useState } from "react";
import { DEFAULT_VISIBLE_CATEGORIES } from "@/components/actions/map-marker-categories";
import type { ActionsMapCanvasComponent, ActionsMapFeedProps } from "./map-feed.types";
import { useMapFeedData } from "./use-map-feed-data";
import { ImmersiveLayout } from "./_layouts/immersive-layout";
import { DefaultLayout } from "./_layouts/default-layout";

export function ActionsMapFeed({
  types = "all",
  days,
  statusFilter,
  impactFilter,
  qualityMin,
  presentation = "default",
  visibleCategories = DEFAULT_VISIBLE_CATEGORIES,
  selectedActionId = null,
}: ActionsMapFeedProps) {
  const feedData = useMapFeedData({
    types,
    days,
    statusFilter,
    impactFilter,
    qualityMin,
    visibleCategories,
  });

  const [MapCanvas, setMapCanvas] = useState<ActionsMapCanvasComponent | null>(null);
  const [mapCanvasError, setMapCanvasError] = useState<string | null>(null);

  useEffect(() => {
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
          console.error("Map canvas import failed", importError);
          setMapCanvasError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isImmersive = presentation === "immersive";

  const shellClass = isImmersive
    ? "relative overflow-hidden rounded-[2.25rem] border border-sky-300/16 bg-[linear-gradient(180deg,rgba(22,46,74,0.96),rgba(18,58,90,0.98))] p-4 shadow-[0_28px_80px_-36px_rgba(56,189,248,0.28)] sm:p-6"
    : "rounded-2xl border border-sky-300/12 bg-[rgba(10,31,50,0.96)] p-6 shadow-[0_24px_56px_-32px_rgba(56,189,248,0.22)]";

  const layoutProps = {
    items: feedData.items,
    summary: feedData.summary,
    hasPartialSource: feedData.hasPartialSource,
    partialSourcesLabel: feedData.partialSourcesLabel,
    freshnessLabel: feedData.freshnessLabel,
    isValidating: feedData.isValidating,
    mapCanvasError,
    MapCanvas,
    selectedActionId,
    onReload: () => void feedData.reload(),
  };

  return (
    <section className={shellClass}>
      {isImmersive ? (
        <ImmersiveLayout {...layoutProps} />
      ) : (
        <DefaultLayout {...layoutProps} />
      )}

      {feedData.isLoading ? (
        <div className="mt-5 space-y-2">
          <div className="h-11 animate-pulse rounded-lg bg-sky-400/10" />
          <div className="h-11 animate-pulse rounded-lg bg-sky-400/10" />
          <div className="h-11 animate-pulse rounded-lg bg-sky-400/10" />
        </div>
      ) : null}

      {feedData.error ? (
        <p className="mt-5 rounded-lg border border-rose-300/16 bg-[rgba(63,16,30,0.88)] px-3 py-2 text-sm text-rose-100">
          {feedData.error instanceof Error
            ? feedData.error.message
            : "Impossible de récupérer les données de la carte. Veuillez vérifier votre connexion."}
        </p>
      ) : null}
    </section>
  );
}
