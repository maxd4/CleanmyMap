"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import {
  syncAnalyticsConsentCookie,
} from "@/lib/analytics-consent";
import {
  COOKIE_CONSENT_MANAGE_EVENT,
  cookieConsentStorage,
  notifyCookieConsentChanged,
  type CookieConsentState,
} from "@/lib/storage/ui-state-storage";

export function CookieConsentBanner() {
  const [isClient] = useState(() => typeof window !== "undefined");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const handleManageCookies = () => setIsPreferencesOpen(true);
    window.addEventListener(COOKIE_CONSENT_MANAGE_EVENT, handleManageCookies);
    return () =>
      window.removeEventListener(COOKIE_CONSENT_MANAGE_EVENT, handleManageCookies);
  }, [isClient]);

  const consent: CookieConsentState = isClient
    ? cookieConsentStorage.read() ?? { choice: null, timestamp: null, analytics: false }
    : { choice: null, timestamp: null, analytics: false };
  const showBanner = isClient && (consent.choice === null || isPreferencesOpen);

  const handleDecision = (analytics: boolean) => {
    cookieConsentStorage.write({
      choice: analytics ? "accepted" : "rejected",
      timestamp: Date.now(),
      analytics,
    });
    syncAnalyticsConsentCookie(analytics);
    notifyCookieConsentChanged();
    setIsPreferencesOpen(false);
  };

  // Don't render on server or if already consented
  if (!isClient || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <Cookie size={24} className="text-amber-600" />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-bold cmm-text-primary">
                Paramètres de confidentialité
              </h3>
              <p className="mt-1 text-sm cmm-text-secondary">
                Nous utilisons des cookies pour améliorer votre expérience. Certains cookies sont essentiels au fonctionnement du site, d&apos;autres nous aident à analyser la navigation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs cmm-text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Essentiels
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Analytiques
              </span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDecision(true)}
                className="min-h-10 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Tout accepter
              </button>
              <button
                type="button"
                onClick={() => handleDecision(false)}
                className="min-h-10 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Tout refuser
              </button>
            </div>

            <p className="text-xs cmm-text-muted">
              En savoir plus :{" "}
              <a href="/politique-cookies" className="text-emerald-600 hover:underline">
                Politique cookies
              </a>{" "}
              et{" "}
              <a href="/politique-confidentialite" className="text-emerald-600 hover:underline">
                politique de confidentialité
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
