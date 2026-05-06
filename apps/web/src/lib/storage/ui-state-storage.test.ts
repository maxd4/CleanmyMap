import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cookieConsentStorage,
  dashboardPeriodStorage,
  guideChecklistStorage,
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

    expect(dashboardPeriodStorage.write(365)).toBe(true);
    expect(dashboardPeriodStorage.read()).toBe(365);
    expect(memory.get("cmm_dashboard_days")).toBe("365");
  });

  it("normalizes consent and checklist payloads", () => {
    const { memory } = installMockWindow();

    expect(
      cookieConsentStorage.write({
        choice: "accepted",
        timestamp: 123,
        analytics: true,
      }),
    ).toBe(true);
    expect(cookieConsentStorage.read()).toEqual({
      choice: "accepted",
      timestamp: 123,
      analytics: true,
    });

    memory.set("cleanmymap_cookie_consent", "{\"choice\":\"accepted\"}");
    expect(cookieConsentStorage.read()).toEqual({
      choice: "accepted",
      timestamp: null,
      analytics: false,
    });

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
});
