import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAnalyticsConsentCookieDecision,
  hasAnalyticsConsent,
  hasAnalyticsConsentCookie,
  syncAnalyticsConsentCookie,
} from "./analytics-consent";
import { cookieConsentStorage } from "@/lib/storage/ui-state-storage";

function installMockBrowser(initialCookie = "") {
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

  vi.stubGlobal("window", {
    localStorage,
    location: { protocol: "https:" },
  } as unknown as Window);
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
    installMockBrowser("cleanmymap_analytics_consent=1");

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
        timestamp: 123,
        analytics: true,
      }),
    ).toBe(true);

    expect(hasAnalyticsConsent()).toBe(true);

    syncAnalyticsConsentCookie(true);
    expect(browser.cookie()).toContain("cleanmymap_analytics_consent=1");

    syncAnalyticsConsentCookie(false);
    expect(browser.cookie()).toContain("cleanmymap_analytics_consent=0");
  });
});
