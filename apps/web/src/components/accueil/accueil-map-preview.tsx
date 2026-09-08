"use client";

import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";

export function HomeMapPreview() {
  return (
    <div
      className="relative isolate h-[20rem] min-w-0 overflow-hidden sm:h-[24rem] lg:h-[31rem]"
      aria-label="Aperçu de la carte des actions"
    >
      <ActionsMapFeed
        days={365}
        statusFilter="approved"
        impactFilter="all"
        qualityMin={0}
        presentation="immersive"
        tone="emerald"
        homepagePreview
        showIntro={false}
        showStoriesCarousel={false}
        compact
        limit={120}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(0,87,67,0.12)_74%,rgba(0,87,67,0.52)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-[#0a936b]/35 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[#0a936b]/35 to-transparent"
      />
    </div>
  );
}
