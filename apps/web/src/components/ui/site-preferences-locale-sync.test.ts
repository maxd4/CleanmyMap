import { describe, expect, it, vi } from "vitest";
import { applyLocalePreferenceChange } from "./site-preferences-locale-sync";

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
});
