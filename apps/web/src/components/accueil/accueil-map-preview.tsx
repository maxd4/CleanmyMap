"use client";

import { ExternalLink } from "lucide-react";
import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";
import { CmmButton } from "@/components/ui/cmm-button";

export function HomeMapPreview() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[2.25rem]">
      <ActionsMapFeed
        days={365}
        statusFilter="approved"
        impactFilter="all"
        qualityMin={0}
        presentation="immersive"
        tone="emerald"
        showIntro={false}
        showStoriesCarousel={false}
        compact
        limit={120}
      />

      <div className="pointer-events-none absolute inset-0 z-[1100]">
        <div className="absolute left-8 top-8 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#192548] shadow-[0_12px_28px_-18px_rgba(0,45,35,0.48)] backdrop-blur-xl sm:left-10 sm:top-10 sm:px-5">
          <span className="h-3 w-3 rounded-full bg-[#c04cf4] shadow-[0_0_12px_rgba(192,76,244,0.5)]" />
          Récentes
        </div>

        <CmmButton
          href="/actions/map"
          tone="secondary"
          variant="pill"
          className="pointer-events-auto absolute right-8 top-8 h-12 !border-white/80 !bg-white/95 !text-[#142143] !shadow-[0_12px_28px_-16px_rgba(0,45,35,0.5)] hover:!bg-white sm:right-10 sm:top-10 sm:h-14 sm:px-6"
        >
          Voir la carte
          <ExternalLink size={18} aria-hidden="true" />
        </CmmButton>
      </div>
    </div>
  );
}
