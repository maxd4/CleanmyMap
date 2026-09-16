"use client";

import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";
import {
  ACTIONS_MAP_PUBLIC_FEED_DEFAULTS,
  getActionsMapCurrentYearDays,
} from "@/components/actions/map/actions-map-filters.utils";

export function HomeMapPreview() {
  const edgeMask =
    "linear-gradient(to right, transparent 0%, #000 3.5%, #000 96.5%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 3.5%, #000 96.5%, transparent 100%)";

  return (
    <div
      className="relative isolate h-[20rem] min-w-0 overflow-hidden sm:h-[24rem] lg:h-[31rem]"
      aria-label="Aperçu de la carte des actions"
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
        <ActionsMapFeed
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
      </div>
    </div>
  );
}
