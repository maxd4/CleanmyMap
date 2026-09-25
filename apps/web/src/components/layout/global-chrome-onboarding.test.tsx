import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => function MockDeferredHomeFooter() {
    return <div data-testid="global-footer" />;
  },
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

import { DeferredGlobalFooter, isAuthSurfacePath } from "./deferred-global-chrome";
import { RootLayoutChrome } from "./root-layout-chrome";
import { readFileSync } from "node:fs";

describe("global chrome on onboarding", () => {
  it("keeps the global ribbon mounted", async () => {
    const markup = renderToStaticMarkup(await RootLayoutChrome());

    expect(markup).toContain('data-testid="global-ribbon"');
  });

  it("keeps the global footer mounted", () => {
    const markup = renderToStaticMarkup(<DeferredGlobalFooter />);

    expect(markup).toContain('data-testid="global-footer"');
  });

  it("recognizes auth routes for deferred non-critical chrome", () => {
    expect(isAuthSurfacePath("/sign-in")).toBe(true);
    expect(isAuthSurfacePath("/sign-up/[[...sign-up]]")).toBe(true);
    expect(isAuthSurfacePath("/onboarding")).toBe(false);
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
