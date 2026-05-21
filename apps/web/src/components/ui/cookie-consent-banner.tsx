"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import {
  getAnalyticsConsentCookieDecision,
  syncAnalyticsConsentCookie,
} from "@/lib/analytics-consent";
import {
  cookieConsentStorage,
  notifyCookieConsentChanged,
  type CookieConsentState,
} from "@/lib/storage/ui-state-storage";

export function CookieConsentBanner() {
  const [isClient, setIsClient] = useState(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const consent: CookieConsentState = isClient
    ? cookieConsentStorage.read() ?? { choice: null, timestamp: null, analytics: false }
    : { choice: null, timestamp: null, analytics: false };
  const showBanner =
    isClient &&
    consent.choice === null &&
    getAnalyticsConsentCookieDecision(document.cookie) === null;

  const handleAccept = (analytics: boolean) => {
    cookieConsentStorage.write({
      choice: "accepted",
      timestamp: Date.now(),
      analytics,
    });
    syncAnalyticsConsentCookie(analytics);
    notifyCookieConsentChanged();
    forceRender((value) => value + 1);
  };
  
  const handleReject = () => {
    cookieConsentStorage.write({
      choice: "rejected",
      timestamp: Date.now(),
      analytics: false,
    });
    syncAnalyticsConsentCookie(false);
    notifyCookieConsentChanged();
    forceRender((value) => value + 1);
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
                onClick={() => handleAccept(true)}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Accepter tout
              </button>
              <button
                onClick={() => handleAccept(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Essentiels seulement
              </button>
              <button
                onClick={handleReject}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                Refuser
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

          <button
            onClick={handleReject}
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
