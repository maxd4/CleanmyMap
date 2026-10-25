"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getAnalyticsConsentDecision,
  hasAnalyticsConsent,
  subscribeAnalyticsConsent,
  syncAnalyticsConsentCookie,
} from "@/lib/analytics-consent";
import { cookieConsentStorage } from "@/lib/storage/ui-state-storage";
import { isOptionalConsentTreatmentAllowed, type AgeBand } from "@/lib/minor-consent";
import {
  disablePostHogClient,
  initPostHogClient,
} from "@/lib/posthog/client";

const OptionalAnalyticsEligibilityContext = createContext(false);

export function useOptionalAnalyticsEligibility(): boolean {
  return useContext(OptionalAnalyticsEligibilityContext);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: isClerkLoaded, isSignedIn, user } = useUser();
  const [serverEligibility, setServerEligibility] = useState<{
    loaded: boolean;
    ageBand: AgeBand;
    parentalConsentVerified: boolean;
  }>({ loaded: false, ageBand: "unknown", parentalConsentVerified: false });
  const [eligibilityUserId, setEligibilityUserId] = useState<string | null>(null);
  const consentDecision = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsentDecision,
    () => null,
  );
  const hasConsent =
    consentDecision !== null ? consentDecision : hasAnalyticsConsent();
  const localAgeBand = cookieConsentStorage.read()?.ageBand ?? "unknown";

  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn) return;

    let active = true;
    void fetch("/api/account/age-band", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("age band unavailable");
        return (await response.json()) as { ageBand?: AgeBand; parentalConsentVerified?: boolean };
      })
      .then((payload) => {
        if (!active) return;
        setServerEligibility({
          loaded: true,
          ageBand: payload.ageBand ?? "unknown",
          parentalConsentVerified: payload.parentalConsentVerified === true,
        });
        setEligibilityUserId(user?.id ?? null);
      })
      .catch(() => {
        if (active) {
          setServerEligibility({ loaded: true, ageBand: "unknown", parentalConsentVerified: false });
          setEligibilityUserId(user?.id ?? null);
        }
      });

    return () => {
      active = false;
    };
  }, [isClerkLoaded, isSignedIn, localAgeBand, user?.id]);

  const optionalAnalyticsAllowed =
    hasConsent &&
    (isClerkLoaded && !isSignedIn
      ? true
      : serverEligibility.loaded && eligibilityUserId === (user?.id ?? null)) &&
    isOptionalConsentTreatmentAllowed({
      ageBand: isClerkLoaded && !isSignedIn ? localAgeBand : serverEligibility.ageBand,
      parentalConsentVerified: isClerkLoaded && !isSignedIn ? false : serverEligibility.parentalConsentVerified,
    });

  useEffect(() => {
    if (consentDecision !== null) {
      syncAnalyticsConsentCookie(consentDecision);
    }
    if (!optionalAnalyticsAllowed) {
      void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ disablePostHogClient().catch(() => undefined);
      return;
    }

    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ initPostHogClient(true).then((posthog) => {
      if (posthog && !hasAnalyticsConsent()) {
        void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ disablePostHogClient().catch(() => undefined);
      }
    }).catch(() => undefined);
  }, [consentDecision, optionalAnalyticsAllowed]);

  return (
    <OptionalAnalyticsEligibilityContext.Provider value={optionalAnalyticsAllowed}>
      {children}
    </OptionalAnalyticsEligibilityContext.Provider>
  );
}
