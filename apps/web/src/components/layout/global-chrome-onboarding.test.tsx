import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => function MockDeferredComponent() { return null; },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/onboarding",
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/navigation/app-navigation-ribbon", () => ({
  AppNavigationRibbon: () => <div data-testid="global-ribbon" />,
}));

vi.mock("./deferred-global-chrome", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deferred-global-chrome")>();

  return {
    ...actual,
    DeferredGlobalChrome: () => <div data-testid="deferred-chrome" />,
  };
});

import {
  isAuthSurfacePath,
  shouldLoadDeferredChrome,
} from "./deferred-global-chrome";
import { RootLayoutChrome } from "./root-layout-chrome";
import { HomeFooter } from "@/components/accueil/accueil-footer";
import { readFileSync } from "node:fs";

describe("global chrome on onboarding", () => {
  it("keeps the global ribbon mounted", async () => {
    const markup = renderToStaticMarkup(await RootLayoutChrome());

    expect(markup).toContain('data-testid="global-ribbon"');
  });

  it("keeps the semantic global footer in the server tree", () => {
    const markup = renderToStaticMarkup(<HomeFooter />);

    expect(markup).toContain("<footer");
    expect(markup).toContain('href="/mentions-legales"');
    expect(markup).toContain('href="/politique-cookies"');
  });

  it("recognizes auth routes for deferred non-critical chrome", () => {
    expect(isAuthSurfacePath("/sign-in")).toBe(true);
    expect(isAuthSurfacePath("/sign-up/[[...sign-up]]")).toBe(true);
    expect(isAuthSurfacePath("/onboarding")).toBe(false);
  });

  it("restores deferred chrome when auth navigation leaves before idle", () => {
    let authIdleCompleted = false;

    expect(shouldLoadDeferredChrome("/sign-in", authIdleCompleted)).toBe(false);

    const cancelPreviousIdleCallback = vi.fn();
    expect(shouldLoadDeferredChrome("/sections/community", authIdleCompleted)).toBe(true);

    cancelPreviousIdleCallback();
    expect(shouldLoadDeferredChrome("/sections/community", authIdleCompleted)).toBe(true);
    expect(shouldLoadDeferredChrome("/sign-in", authIdleCompleted)).toBe(false);

    authIdleCompleted = true;
    expect(shouldLoadDeferredChrome("/sign-in", authIdleCompleted)).toBe(true);
    expect(cancelPreviousIdleCallback).toHaveBeenCalledTimes(1);
  });

  it("keeps the consent banner outside the deferred chrome decision", () => {
    const source = readFileSync(
      new URL("./deferred-global-chrome.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/\{shouldLoad \? [\s\S]*?: null\}\s*<DeferredCookieConsentBanner \/>/u);
  });

  it("does not request account identity for anonymous navigation", () => {
    const source = readFileSync(
      new URL("../navigation/app-navigation-ribbon-shell.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("authStateReady && user");
    expect(source).not.toContain("anonymous-session");
  });
});
