import { useCallback, useRef, type ComponentType, type RefObject } from "react";
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

type HomeCommunityCredibilityProps = {
  activity: HomeCommunityActivitySummary;
  errorMessage?: string | null;
};

type HomeCommunityCredibilityRevealProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

type HomeCommunityCredibilityRevealComponent = ComponentType<HomeCommunityCredibilityRevealProps>;

export function useHomeCommunityCredibility({
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
    useSWR<HomeCommunityActivityResponse, Error>(
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

export type {
  HomeCommunityCredibilityProps,
  HomeCommunityCredibilityRevealComponent,
};
