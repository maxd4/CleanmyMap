import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAnalyticsConsentCookieDecision,
  hasAnalyticsConsent,
  hasAnalyticsConsentCookie,
  ANALYTICS_CONSENT_MAX_AGE_SECONDS,
  clearAnalyticsConsentCookie,
  syncAnalyticsConsentCookie,
} from "./analytics-consent";
import { cookieConsentStorage } from "@/lib/storage/ui-state-storage";

function installMockBrowser(initialCookie = "", withLocalStorage = true) {
  const memory = new Map<string, string>();
  let cookieValue = initialCookie;

  const localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };

  vi.stubGlobal(
    "window",
    (withLocalStorage
      ? { localStorage, location: { protocol: "https:" } }
      : { location: { protocol: "https:" } }) as unknown as Window,
  );
  vi.stubGlobal(
    "document",
    {
      get cookie() {
        return cookieValue;
      },
      set cookie(value: string) {
        cookieValue = value;
      },
    } as Document,
  );

  return {
    cookie: () => cookieValue,
    memory,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics consent", () => {
  it("defaults to no consent when nothing is stored", () => {
    installMockBrowser();

    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasAnalyticsConsentCookie(null)).toBe(false);
  });

  it("falls back to the mirrored cookie when local storage is empty", () => {
    installMockBrowser("cleanmymap_analytics_consent=1", false);

    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasAnalyticsConsentCookie("cleanmymap_analytics_consent=1")).toBe(
      true,
    );
    expect(
      getAnalyticsConsentCookieDecision("cleanmymap_analytics_consent=0"),
    ).toBe(false);
  });

  it("syncs the consent cookie from client state changes", () => {
    const browser = installMockBrowser();

    expect(
      cookieConsentStorage.write({
        choice: "accepted",
        timestamp: Date.now(),
        analytics: true,
      }),
    ).toBe(true);

    expect(hasAnalyticsConsent()).toBe(true);

    syncAnalyticsConsentCookie(true);
    expect(browser.cookie()).toContain(
      `cleanmymap_analytics_consent=1; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}`,
    );

    syncAnalyticsConsentCookie(false);
    expect(browser.cookie()).toContain(
      `cleanmymap_analytics_consent=0; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}`,
    );
  });

  it("keeps an explicit refusal as a fresh local decision", () => {
    installMockBrowser();

    expect(
      cookieConsentStorage.write({
        choice: "rejected",
        timestamp: Date.now(),
        analytics: false,
      }),
    ).toBe(true);

    expect(hasAnalyticsConsent()).toBe(false);
    expect(cookieConsentStorage.read()).toEqual({
      choice: "rejected",
      timestamp: expect.any(Number),
      analytics: false,
    });
  });

  it("only clears the mirrored cookie through explicit clearing", () => {
    const browser = installMockBrowser("cleanmymap_analytics_consent=1");

    clearAnalyticsConsentCookie();

    expect(browser.cookie()).toContain(
      "cleanmymap_analytics_consent=; Path=/; Max-Age=0",
    );
  });
});
