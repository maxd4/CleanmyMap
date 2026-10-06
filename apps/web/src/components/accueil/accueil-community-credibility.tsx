"use client";

import { useRef } from "react";
import useSWR from "swr";
import type {
  HomeCommunityActivityResponse,
  HomeCommunityActivitySummary,
} from "@/lib/accueil/data";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";
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

export function HomeCommunityCredibility({
  activity,
  errorMessage,
}: HomeCommunityCredibilityProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { data: refreshedActivity, error: refreshError } =
    useSWR<HomeCommunityActivityResponse>(
      HOMEPAGE_ACTIVITY_ENDPOINT,
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

  return (
    <section
      ref={sectionRef}
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
