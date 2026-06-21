"use client";

import { useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ProjectPageviewTracker } from "@/components/analytics/project-pageview-tracker";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
} from "@/lib/storage/ui-state-storage";

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
      <ProjectPageviewTracker />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
