"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type RefObject } from "react";
import useSWR from "swr";
import type {
  HomeCommunityActivityResponse,
  HomeCommunityActivitySummary,
} from "@/lib/accueil/data";
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

type HomeCommunityCredibilityRevealProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

type HomeCommunityCredibilityRevealComponent = ComponentType<HomeCommunityCredibilityRevealProps>;

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

  return { setSectionRefs, visibleActivity, hasActivityError, isNearViewport, sectionRef };
}

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
