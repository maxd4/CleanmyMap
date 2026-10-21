"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getAnalyticsConsentDecision,
  hasAnalyticsConsent,
  subscribeAnalyticsConsent,
  syncAnalyticsConsentCookie,
} from "@/lib/analytics-consent";
import {
  disablePostHogClient,
  initPostHogClient,
} from "@/lib/posthog/client";
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const consentDecision = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsentDecision,
    () => null,
  );
  const hasConsent =
    consentDecision !== null ? consentDecision : hasAnalyticsConsent();

  useEffect(() => {
    if (consentDecision !== null) {
      syncAnalyticsConsentCookie(consentDecision);
    }
    if (!hasConsent) {
      void disablePostHogClient();
      return;
    }

    void initPostHogClient(true).then((posthog) => {
      if (posthog && !hasAnalyticsConsent()) {
        void disablePostHogClient();
      }
    });
  }, [consentDecision, hasConsent]);

  return <>{children}</>;
}
