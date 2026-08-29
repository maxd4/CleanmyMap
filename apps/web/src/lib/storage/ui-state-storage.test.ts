import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_MAX_AGE_MS,
  cookieConsentStorage,
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

    expect(siteDisplayModeStorage.write("sobre")).toBe(true);
    expect(siteDisplayModeStorage.read()).toBe("sobre");
    expect(memory.get("cleanmymap.display_mode")).toBe("sobre");

    expect(dashboardPeriodStorage.write(365)).toBe(true);
    expect(dashboardPeriodStorage.read()).toBe(365);
    expect(memory.get("cmm_dashboard_days")).toBe("365");
  });

  it("normalizes consent and checklist payloads", () => {
    const { memory } = installMockWindow();

    expect(
      cookieConsentStorage.write({
        choice: "accepted",
        timestamp: Date.now(),
        analytics: true,
      }),
    ).toBe(true);
    expect(cookieConsentStorage.read()).toEqual({
      choice: "accepted",
      timestamp: expect.any(Number),
      analytics: true,
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

  it("dispatches the explicit event used to reopen cookie preferences", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent } as unknown as Window);

    requestCookieConsentPreferences();

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0].type).toBe(
      "cleanmymap-cookie-consent-manage",
    );
  });
});
