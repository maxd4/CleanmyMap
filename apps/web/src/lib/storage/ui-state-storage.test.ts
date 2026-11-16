import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_MAX_AGE_MS,
  cookieConsentStorage,
  notifyCookieConsentChanged,
  requestCookieConsentPreferences,
  dashboardPeriodStorage,
  guideChecklistStorage,
  siteDisplayModeStorage,
  siteLocaleStorage,
  siteThemeStorage,
} from "./ui-state-storage";

function installMockWindow() {
  const memory = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };

  vi.stubGlobal("window", { localStorage } as unknown as Window);
  return { memory, localStorage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ui state storage", () => {
  it("falls back safely when no browser storage is available", () => {
    expect(siteLocaleStorage.read()).toBeNull();
    expect(dashboardPeriodStorage.read()).toBeNull();
  });

  it("reads and writes typed local UI preferences", () => {
    const { memory } = installMockWindow();

    expect(siteLocaleStorage.write("fr")).toBe(true);
    expect(siteLocaleStorage.read()).toBe("fr");
    expect(memory.get("cleanmymap.locale")).toBe("fr");

    expect(siteThemeStorage.write("mixed")).toBe(true);
    expect(siteThemeStorage.read()).toBe("mixed");
    expect(memory.get("cleanmymap.theme")).toBe("mixed");

    memory.set("cleanmymap.locale", "de");
    expect(siteLocaleStorage.read()).toBeNull();
    memory.set("cleanmymap.theme", "light");
    expect(siteThemeStorage.read()).toBeNull();

    for (const displayMode of ["exhaustif", "minimaliste", "sobre"] as const) {
      expect(siteDisplayModeStorage.write(displayMode)).toBe(true);
      expect(siteDisplayModeStorage.read()).toBe(displayMode);
      expect(memory.get("cleanmymap.display_mode")).toBe(displayMode);
    }
    memory.set("cleanmymap.display_mode", "compact");
    expect(siteDisplayModeStorage.read()).toBeNull();

    expect(dashboardPeriodStorage.write(365)).toBe(true);
    expect(dashboardPeriodStorage.read()).toBe(365);
    expect(memory.get("cmm_dashboard_days")).toBe("365");
  });

  it("uses the dashboard fallback and normalizes invalid checklist payloads", () => {
    const { memory } = installMockWindow();

    memory.set("cmm_dashboard_days", "not-a-period");
    expect(dashboardPeriodStorage.read()).toBe(90);

    memory.set("cleanmymap.guide.checklist", JSON.stringify(["not", "a", "record"]));
    expect(guideChecklistStorage.read()).toEqual({
      briefing: false,
      declaration: false,
      tracing: false,
      moderation: false,
      export: false,
    });

    memory.set("cleanmymap.guide.checklist", "{");
    expect(guideChecklistStorage.read()).toEqual({
      briefing: false,
      declaration: false,
      tracing: false,
      moderation: false,
      export: false,
    });
  });

  it("normalizes consent and checklist payloads", () => {
    const { memory } = installMockWindow();

    expect(
      cookieConsentStorage.write({
        choice: "accepted",
        timestamp: Date.now(),
        analytics: true,
        ageBand: "15_or_over",
      }),
    ).toBe(true);
    expect(cookieConsentStorage.read()).toEqual({
      choice: "accepted",
      timestamp: expect.any(Number),
      analytics: true,
      ageBand: "15_or_over",
    });

    memory.set("cleanmymap_cookie_consent", "{\"choice\":\"accepted\"}");
    expect(cookieConsentStorage.read()).toBeNull();
    expect(memory.has("cleanmymap_cookie_consent")).toBe(false);

    expect(
      guideChecklistStorage.write({
        briefing: true,
        declaration: false,
        tracing: true,
        moderation: false,
        export: true,
      }),
    ).toBe(true);
    expect(guideChecklistStorage.read()).toEqual({
      briefing: true,
      declaration: false,
      tracing: true,
      moderation: false,
      export: true,
    });
  });

  it("cleans and ignores an expired consent decision", () => {
    const { memory } = installMockWindow();
    const now = Date.now();
    memory.set(
      "cleanmymap_cookie_consent",
      JSON.stringify({
        choice: "rejected",
        timestamp: now - COOKIE_CONSENT_MAX_AGE_MS - 1,
        analytics: false,
      }),
    );

    expect(cookieConsentStorage.read()).toBeNull();
    expect(memory.has("cleanmymap_cookie_consent")).toBe(false);
  });

  it("fails closed for malformed consent payloads and preserves safe defaults", () => {
    const { memory } = installMockWindow();

    memory.set("cleanmymap_cookie_consent", JSON.stringify(null));
    expect(cookieConsentStorage.read()).toEqual({
      choice: null,
      timestamp: null,
      analytics: false,
      ageBand: "unknown",
    });

    memory.set("cleanmymap_cookie_consent", "not-json");
    expect(cookieConsentStorage.read()).toEqual({
      choice: null,
      timestamp: null,
      analytics: false,
      ageBand: "unknown",
    });

    memory.set("cleanmymap_cookie_consent", JSON.stringify({ choice: "other", timestamp: "later", analytics: "yes", ageBand: "invalid" }));
    expect(cookieConsentStorage.read()).toEqual({
      choice: null,
      timestamp: null,
      analytics: false,
      ageBand: "unknown",
    });
  });

  it("dispatches the explicit event used to reopen cookie preferences", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent } as unknown as Window);

    requestCookieConsentPreferences();

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0].type).toBe(
      "cleanmymap-cookie-consent-manage",
    );
  });

  it("dispatches both cookie preference events and fails safely when storage throws", () => {
    const dispatchEvent = vi.fn();
    const throwingStorage = {
      getItem: () => { throw new Error("storage blocked"); },
      setItem: () => { throw new Error("storage blocked"); },
      removeItem: () => { throw new Error("storage blocked"); },
    };
    vi.stubGlobal("window", { localStorage: throwingStorage, dispatchEvent } as unknown as Window);

    expect(siteLocaleStorage.read()).toBeNull();
    expect(siteLocaleStorage.write("en")).toBe(false);
    expect(siteLocaleStorage.remove()).toBe(false);
    expect(cookieConsentStorage.read()).toBeNull();
    notifyCookieConsentChanged();
    requestCookieConsentPreferences();

    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    expect(dispatchEvent.mock.calls.map(([event]) => event.type)).toEqual([
      "cleanmymap-cookie-consent-change",
      "cleanmymap-cookie-consent-manage",
    ]);
  });
});
