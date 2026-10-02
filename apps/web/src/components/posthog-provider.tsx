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
      if (!posthog) {
        return;
      }

      if (!hasAnalyticsConsent()) {
        void disablePostHogClient();
        return;
      }

      posthog.capture("cmm_posthog_initialized_with_consent", {
        timestamp: Date.now(),
      });
    });
  }, [consentDecision, hasConsent]);

  return <>{children}</>;
}
