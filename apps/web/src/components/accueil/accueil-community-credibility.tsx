"use client";

import { useCallback, useRef } from "react";
import useSWR from "swr";
import type {
  HomeCommunityActivityResponse,
  HomeCommunityActivitySummary,
} from "@/lib/accueil/data";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import {
  fetchHomepageActivity,
  HOMEPAGE_ACTIVITY_ENDPOINT,
} from "./accueil-community-credibility.activity";
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

function useHomeCommunityCredibility({
  activity,
  errorMessage,
}: HomeCommunityCredibilityProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { ref: visibilityRef, isInView: isNearViewport } =
    useInViewOnce<HTMLElement>({ rootMargin: "260px 0px" });
  const setSectionRefs = useCallback(
    (node: HTMLElement | null) => {
      sectionRef.current = node;
      visibilityRef.current = node;
    },
    [visibilityRef],
  );
  const { data: refreshedActivity, error: refreshError } =
    useSWR<HomeCommunityActivityResponse>(
      isNearViewport ? HOMEPAGE_ACTIVITY_ENDPOINT : null,
      fetchHomepageActivity,
      {
        fallbackData: { activity, errorMessage: errorMessage ?? null },
        revalidateOnMount: true,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 600_000,
      },
    );
  const visibleActivity = refreshedActivity?.activity ?? activity;
  const hasActivityError = Boolean(
    refreshError || refreshedActivity?.errorMessage || errorMessage,
  );

  useGsapReveal(sectionRef, {
    selector: "[data-gsap-reveal]",
    start: "top 78%",
    stagger: 0.06,
    duration: 0.65,
    y: 20,
  });

  return { setSectionRefs, visibleActivity, hasActivityError };
}

export function HomeCommunityCredibility(props: HomeCommunityCredibilityProps) {
  const { setSectionRefs, visibleActivity, hasActivityError } =
    useHomeCommunityCredibility(props);

  return (
    <section
      ref={setSectionRefs}
      data-homepage-section="community-credibility"
      className="relative isolate overflow-hidden py-8 sm:py-10 lg:py-12"
    >
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
