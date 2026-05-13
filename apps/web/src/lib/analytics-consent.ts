import { cookieConsentStorage } from "@/lib/storage/ui-state-storage";

export const ANALYTICS_CONSENT_COOKIE_NAME = "cleanmymap_analytics_consent";
const ANALYTICS_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

function readCookieValue(cookieSource: string | null): string | null {
  if (!cookieSource) {
    return null;
  }

  for (const segment of cookieSource.split(";")) {
    const [rawName, ...rawValueParts] = segment.trim().split("=");
    if (rawName !== ANALYTICS_CONSENT_COOKIE_NAME) {
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
  return getAnalyticsConsentCookieDecision(cookieSource) ?? false;
}

export function getAnalyticsConsentCookieDecision(
  cookieSource: string | null,
): boolean | null {
  return parseCookieValue(readCookieValue(cookieSource));
}

export function getAnalyticsConsentDecision(): boolean | null {
  const consent = cookieConsentStorage.read();
  if (consent?.choice === "accepted") {
    return consent.analytics;
  }
  if (consent?.choice === "rejected") {
    return false;
  }

  return null;
}

export function hasAnalyticsConsent(): boolean {
  const consentDecision = getAnalyticsConsentDecision();
  if (consentDecision !== null) {
    return consentDecision;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const cookieDecision = getAnalyticsConsentCookieDecision(document.cookie);
  return cookieDecision ?? false;
}

export function syncAnalyticsConsentCookie(hasConsent: boolean): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  const value = hasConsent ? "1" : "0";
  const maxAge = hasConsent ? ANALYTICS_CONSENT_MAX_AGE_SECONDS : 0;

  document.cookie =
    `${ANALYTICS_CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}` +
    `; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureAttribute}`;
}
