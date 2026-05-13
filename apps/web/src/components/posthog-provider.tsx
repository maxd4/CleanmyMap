"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getAnalyticsConsentDecision,
  hasAnalyticsConsent,
  syncAnalyticsConsentCookie,
} from "@/lib/analytics-consent";
import { initPostHogClient, isPostHogInitialized } from "@/lib/posthog/client";
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

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const consentDecision = useSyncExternalStore(
    subscribe,
    getAnalyticsConsentDecision,
    () => null,
  );
  const hasConsent =
    consentDecision !== null ? consentDecision : hasAnalyticsConsent();

  useEffect(() => {
    if (consentDecision !== null) {
      syncAnalyticsConsentCookie(consentDecision);
    }
    if (hasConsent && !isPostHogInitialized()) {
      const posthog = initPostHogClient(true);
      if (posthog) {
        posthog.capture("cmm_posthog_initialized_with_consent", {
          timestamp: Date.now(),
        });
      }
    }
  }, [consentDecision, hasConsent]);
  
  return <>{children}</>;
}

export { isPostHogInitialized };
