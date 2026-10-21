import { canUseLocalStorage } from "@/lib/storage/local-storage";
import {
  AGE_BAND_COOKIE_NAME,
  isOptionalConsentTreatmentAllowed,
  parseAgeBand,
  type AgeBand,
} from "@/lib/minor-consent";
import {
  cookieConsentStorage,
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_MAX_AGE_MS,
} from "@/lib/storage/ui-state-storage";

const ANALYTICS_CONSENT_COOKIE_NAME = "cleanmymap_analytics_consent";
export const ANALYTICS_CONSENT_MAX_AGE_SECONDS = Math.floor(
  COOKIE_CONSENT_MAX_AGE_MS / 1000,
);

function parseCookieValue(rawValue: string | null): boolean | null {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return null;
}

function readCookieValue(cookieSource: string | null, cookieName: string): string | null {
  if (!cookieSource) {
    return null;
  }

  for (const segment of cookieSource.split(";")) {
    const [rawName, ...rawValueParts] = segment.trim().split("=");
    if (rawName !== cookieName) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function hasAnalyticsConsentCookie(cookieSource: string | null): boolean {
  return Boolean(
    getAnalyticsConsentCookieDecision(cookieSource) &&
      isAnalyticsAllowedForAge(getAnalyticsAgeBandCookieDecision(cookieSource)),
  );
}

export function getAnalyticsConsentCookieDecision(
  cookieSource: string | null,
): boolean | null {
  return parseCookieValue(
    readCookieValue(cookieSource, ANALYTICS_CONSENT_COOKIE_NAME),
  );
}

export function getAnalyticsAgeBandCookieDecision(
  cookieSource: string | null,
): AgeBand {
  return parseAgeBand(readCookieValue(cookieSource, AGE_BAND_COOKIE_NAME));
}

function isAnalyticsAllowedForAge(ageBand: AgeBand): boolean {
  return isOptionalConsentTreatmentAllowed({ ageBand });
}

export function getAnalyticsConsentDecision(): boolean | null {
  const consent = cookieConsentStorage.read();
  if (consent?.choice === "accepted") {
    return consent.analytics && isAnalyticsAllowedForAge(consent.ageBand);
  }
  if (consent?.choice === "rejected") {
    return false;
  }

  return null;
}

export function subscribeAnalyticsConsent(onStoreChange: () => void): () => void {
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

export function hasAnalyticsConsent(): boolean {
  const consentDecision = getAnalyticsConsentDecision();
  if (consentDecision !== null) {
    return consentDecision;
  }

  // A browser with usable localStorage has an explicit local decision source.
  // Do not resurrect an expired or missing local decision from a stale cookie.
  if (canUseLocalStorage()) {
    return false;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const cookieDecision = getAnalyticsConsentCookieDecision(document.cookie);
  return Boolean(
    cookieDecision &&
      isAnalyticsAllowedForAge(getAnalyticsAgeBandCookieDecision(document.cookie)),
  );
}

export function syncAnalyticsConsentCookie(
  hasConsent: boolean,
  ageBand?: AgeBand,
): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  const value = hasConsent ? "1" : "0";
  const resolvedAgeBand = ageBand ?? cookieConsentStorage.read()?.ageBand ?? "unknown";

  document.cookie =
    `${ANALYTICS_CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}` +
    `; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
  document.cookie =
    `${AGE_BAND_COOKIE_NAME}=${encodeURIComponent(resolvedAgeBand)}` +
    `; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
}

export function clearAnalyticsConsentCookie(): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${ANALYTICS_CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute}`;
}
