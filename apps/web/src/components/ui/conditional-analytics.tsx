"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  hasAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/lib/analytics-consent";

const DeferredProjectPageviewTracker = dynamic(
  () =>
    import("@/components/analytics/project-pageview-tracker").then(
      (module) => module.ProjectPageviewTracker,
    ),
  { ssr: false, loading: () => null },
);

const DeferredVercelAnalytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false, loading: () => null },
);

const DeferredSpeedInsights = dynamic(
  () =>
    import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false, loading: () => null },
);

export function ConditionalAnalytics() {
  const hasConsent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    hasAnalyticsConsent,
    () => false,
  );

  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <DeferredProjectPageviewTracker />
      <DeferredVercelAnalytics />
      <DeferredSpeedInsights />
    </>
  );
}
