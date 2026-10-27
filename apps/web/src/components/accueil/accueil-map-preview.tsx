"use client";

import dynamic from "next/dynamic";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import {
  ACTIONS_MAP_PUBLIC_FEED_DEFAULTS,
  getActionsMapCurrentYearDays,
} from "@/components/actions/map/filters/actions-map-filters.utils";

const DeferredHomeMapFeed = dynamic(
  () =>
    import("@/components/actions/map-feed/actions-map-feed").then(
      (module) => module.ActionsMapFeed,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full min-h-[18rem] w-full animate-pulse motion-reduce:animate-none"
        role="status"
        aria-label="Chargement de la carte"
      />
    ),
  },
);

export function HomeMapPreview() {
  const { ref: mapPreviewRef, isInView: isNearViewport } =
    useInViewOnce<HTMLDivElement>({ rootMargin: "260px 0px" });
  const edgeMask =
    "linear-gradient(to right, transparent 0%, #000 3.5%, #000 96.5%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 3.5%, #000 96.5%, transparent 100%)";

  return (
    <div
      ref={mapPreviewRef}
      className="cmm-home-map-preview relative isolate min-w-0 overflow-hidden"
      aria-label="Aperçu de la carte des actions"
      aria-busy={!isNearViewport}
    >
      <div
        className="absolute inset-0"
        style={{
          maskImage: edgeMask,
          WebkitMaskImage: edgeMask,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        {isNearViewport ? (
          <DeferredHomeMapFeed
            days={getActionsMapCurrentYearDays()}
            dateScope={ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.dateScope}
            statusFilter={ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.statusFilter}
            impactFilter={ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.impactFilter}
            qualityMin={ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.qualityMin}
            presentation="homepage-preview"
            tone="emerald"
            showIntro={false}
            showStoriesCarousel={false}
            compact
            limit={120}
          />
        ) : null}
      </div>
    </div>
  );
}
