"use client";

import { useEffect, useState } from "react";
import { useHomeCommunityCredibility, type HomeCommunityCredibilityRevealComponent } from "./accueil-community-credibility-hook";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";
import { HomeCommunityActivityPanel } from "./accueil-community-activity-panel";
import { HomeCommunityCredibilityPanel } from "./accueil-community-credibility-panel";

export {
  fetchHomepageActivity,
  HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE,
} from "./accueil-community-credibility.activity";

type HomeCommunityCredibilityProps = {
  activity: HomeCommunityActivitySummary;
  errorMessage?: string | null;
};

export function HomeCommunityCredibility(props: HomeCommunityCredibilityProps) {
  const { setSectionRefs, visibleActivity, hasActivityError, isNearViewport, sectionRef } =
    useHomeCommunityCredibility(props);
  const [CommunityCredibilityReveal, setCommunityCredibilityReveal] =
    useState<HomeCommunityCredibilityRevealComponent | null>(null);

  useEffect(() => {
    if (!isNearViewport) {
      return undefined;
    }

    let cancelled = false;
    void import("./accueil-community-credibility-reveal")
      .then(({ HomeCommunityCredibilityReveal: Reveal }) => {
        if (!cancelled) {
          setCommunityCredibilityReveal(() => Reveal);
        }
      })
      .catch(() => {
        // The public section remains visible when the progressive enhancement cannot load.
      });

    return () => {
      cancelled = true;
    };
  }, [isNearViewport]);

  return (
    <section
      ref={setSectionRefs}
      data-homepage-section="community-credibility"
      className="relative isolate overflow-hidden py-8 sm:py-10 lg:py-12"
    >
      {CommunityCredibilityReveal ? <CommunityCredibilityReveal sectionRef={sectionRef} /> : null}
      <div className="cmm-page-width relative grid items-stretch gap-4 px-3 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-6">
        <HomeCommunityActivityPanel
          activity={visibleActivity}
          hasActivityError={hasActivityError}
        />
        <HomeCommunityCredibilityPanel />
      </div>
    </section>
  );
}
