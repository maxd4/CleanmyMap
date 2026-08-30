import { describe, expect, it, vi } from "vitest";
import {
  applyLocalePreferenceChange,
  resolveInitialLocale,
} from "./site-preferences-locale-sync";

describe("resolveInitialLocale", () => {
  it("uses the optional initial locale when no browser value exists", () => {
    expect(resolveInitialLocale("en", null)).toBe("en");
  });

  it("lets a legacy localStorage locale win during the one hydration sync", () => {
    expect(resolveInitialLocale("fr", "en")).toBe("en");
    expect(resolveInitialLocale(undefined, null)).toBe("fr");
  });

  it("falls back to French for an absent or invalid browser value", () => {
    expect(resolveInitialLocale(undefined, null)).toBe("fr");
  });
});

describe("applyLocalePreferenceChange", () => {
  it("persists the locale without refreshing on the first sync", () => {
    const gate = { current: false };
    const writeLocale = vi.fn();
    const setCookie = vi.fn();
    const setDocumentLang = vi.fn();
    const refresh = vi.fn();

    applyLocalePreferenceChange("en", gate, {
      writeLocale,
      setCookie,
      setDocumentLang,
      refresh,
    });

    expect(writeLocale).toHaveBeenCalledOnce();
    expect(writeLocale).toHaveBeenCalledWith("en");
    expect(setCookie).toHaveBeenCalledOnce();
    expect(setCookie).toHaveBeenCalledWith("cleanmymap.locale", "en");
    expect(setDocumentLang).toHaveBeenCalledOnce();
    expect(setDocumentLang).toHaveBeenCalledWith("en");
    expect(refresh).not.toHaveBeenCalled();
    expect(gate.current).toBe(true);
  });

  it("refreshes the route on later locale changes", () => {
    const gate = { current: false };
    const writeLocale = vi.fn();
    const setCookie = vi.fn();
    const setDocumentLang = vi.fn();
    const refresh = vi.fn();

    applyLocalePreferenceChange("fr", gate, {
      writeLocale,
      setCookie,
      setDocumentLang,
      refresh,
    });

    applyLocalePreferenceChange("en", gate, {
      writeLocale,
      setCookie,
      setDocumentLang,
      refresh,
    });

    expect(refresh).toHaveBeenCalledOnce();
    expect(writeLocale).toHaveBeenCalledTimes(2);
    expect(setCookie).toHaveBeenCalledTimes(2);
    expect(setDocumentLang).toHaveBeenCalledTimes(2);
  });

  it("does not refresh when Strict Mode repeats the same locale sync", () => {
    const gate = { current: false };
    const refresh = vi.fn();

    applyLocalePreferenceChange("fr", gate, {
      writeLocale: vi.fn(),
      setCookie: vi.fn(),
      setDocumentLang: vi.fn(),
      refresh,
    });
    applyLocalePreferenceChange("fr", gate, {
      writeLocale: vi.fn(),
      setCookie: vi.fn(),
      setDocumentLang: vi.fn(),
      refresh,
    });

    expect(refresh).not.toHaveBeenCalled();
  });
});
