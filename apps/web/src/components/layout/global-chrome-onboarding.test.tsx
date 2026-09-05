import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => function MockDeferredHomeFooter() {
    return <div data-testid="global-footer" />;
  },
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

import { DeferredGlobalFooter } from "./deferred-global-chrome";
import { RootLayoutChrome } from "./root-layout-chrome";

describe("global chrome on onboarding", () => {
  it("keeps the global ribbon mounted", async () => {
    const markup = renderToStaticMarkup(await RootLayoutChrome());

    expect(markup).toContain('data-testid="global-ribbon"');
  });

  it("keeps the global footer mounted", () => {
    const markup = renderToStaticMarkup(<DeferredGlobalFooter />);

    expect(markup).toContain('data-testid="global-footer"');
  });
});
