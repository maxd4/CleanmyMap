"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
} from "@/lib/storage/ui-state-storage";

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

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, handler);
  };
}

export function ConditionalAnalytics() {
  const hasConsent = useSyncExternalStore(
    subscribe,
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
