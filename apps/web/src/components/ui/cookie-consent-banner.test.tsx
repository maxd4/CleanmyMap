import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CookieConsentBanner,
  COOKIE_CONSENT_ACTION_CLASS_NAME,
} from "./cookie-consent-banner";

function installMockBrowser() {
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    location: { protocol: "https:" },
  } as unknown as Window);
  vi.stubGlobal("document", { cookie: "" } as unknown as Document);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CookieConsentBanner", () => {
  it("shows equivalent, explicit accept and refuse actions", () => {
    installMockBrowser();

    const html = renderToStaticMarkup(<CookieConsentBanner />);
    const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
    expect(html).toContain("Tout accepter");
    expect(html).toContain("Tout refuser");
    expect(html).not.toContain("Essentiels seulement");
    expect(html).not.toContain("aria-label=\"Fermer\"");
    expect(buttons.every((button) => button.includes('type="button"'))).toBe(true);

    const classNames = buttons.map(
      (button) => button.match(/\bclass="([^"]+)"/)?.[1] ?? null,
    );
    expect(classNames).toEqual([
      COOKIE_CONSENT_ACTION_CLASS_NAME,
      COOKIE_CONSENT_ACTION_CLASS_NAME,
    ]);
    expect(buttons[0]).not.toBe(buttons[1]);
  });
});
