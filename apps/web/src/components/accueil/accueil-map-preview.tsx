"use client";

import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";

export function HomeMapPreview() {
  const edgeMask =
    "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)";

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
          days={365}
          statusFilter="approved"
          impactFilter="all"
          qualityMin={0}
          presentation="homepage-preview"
          tone="emerald"
          showIntro={false}
          showStoriesCarousel={false}
          compact
          limit={120}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_right,rgba(10,147,107,0.34),transparent_10%,transparent_90%,rgba(10,147,107,0.34)),linear-gradient(to_bottom,rgba(10,147,107,0.28),transparent_14%,transparent_86%,rgba(10,147,107,0.28))]"
      />
    </div>
  );
}
