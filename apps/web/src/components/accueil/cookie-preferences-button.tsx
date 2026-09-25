"use client";

import { requestCookieConsentPreferences } from "@/lib/storage/ui-state-storage";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={requestCookieConsentPreferences}
      className="cmm-ribbon-text shrink-0 whitespace-nowrap font-semibold uppercase tracking-[0.1em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
    >
      Gérer mes cookies
    </button>
  );
}
