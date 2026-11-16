// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contactEmail: undefined as string | undefined,
  cookiePreferences: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/email-config", () => ({
  resolvePublicContactEmail: () => mocks.contactEmail,
}));

vi.mock("@/components/brand/brand-logo", () => ({
  BrandLogo: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("./cookie-preferences-button", () => ({
  CookiePreferencesButton: () => (
    <button type="button" onClick={mocks.cookiePreferences}>
      Gérer mes cookies
    </button>
  ),
}));

import { HomeFooter } from "./accueil-footer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("HomeFooter behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.contactEmail = undefined;
    mocks.cookiePreferences.mockReset();
    vi.restoreAllMocks();
  });

  function render() {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<HomeFooter />);
    });
  }

  it("uses the public fallback email and keeps all accessible destinations", () => {
    render();

    expect(host.querySelector('footer[aria-label="Pied de page"]')).not.toBeNull();
    expect(host.querySelector('a[href="/contact"]')?.getAttribute("aria-label")).toBe(
      "Contacter CleanMyMap",
    );
    expect(host.querySelector('a[href="mailto:contact@cleanmymap.fr"]')).not.toBeNull();
    expect(host.querySelector('a[href="https://instagram.com/cleanmymap.fr"]')).not.toBeNull();
    expect(host.querySelector('a[href="https://github.com/maxd4/CleanMyMap"]')?.getAttribute("target")).toBe("_blank");
    expect(host.querySelector('nav[aria-label="Liens légaux"]')).not.toBeNull();
    expect(host.querySelector('summary[aria-label]')).toBeNull();
    expect(host.textContent).toContain("Informations");
  });

  it("preserves a configured public email and the cookie control interaction", () => {
    const configuredEmail = ["bonjour", "example.fr"].join("@");
    mocks.contactEmail = configuredEmail;
    render();

    expect(host.querySelector(`a[href="mailto:${configuredEmail}"]`)).not.toBeNull();
    expect(host.textContent).toContain(configuredEmail);
    expect(host.querySelectorAll("summary")).toHaveLength(1);
    expect(host.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);

    act(() => {
      host.querySelectorAll<HTMLButtonElement>("button")[0]?.click();
    });
    expect(mocks.cookiePreferences).toHaveBeenCalledTimes(1);
  });
});
