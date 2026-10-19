import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "fr" as "fr" | "en",
  clerkProps: null as Record<string, unknown> | null,
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    mocks.clerkProps = props;
    return <>{children}</>;
  },
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: mocks.locale }),
}));

import { ClerkLocalizationProvider } from "./clerk-localization-provider";

const providerProps = {
  publishableKey: "test-publishable-key",
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  signInFallbackRedirectUrl: "/profil",
  signUpFallbackRedirectUrl: "/onboarding/localisation",
  afterSignOutUrl: "/",
};

describe("ClerkLocalizationProvider", () => {
  it("keeps the French customizations while preserving the auth provider contract", () => {
    mocks.locale = "fr";

    const markup = renderToStaticMarkup(
      <ClerkLocalizationProvider {...providerProps}>
        <span>auth-content</span>
      </ClerkLocalizationProvider>,
    );

    const localization = mocks.clerkProps?.localization as Record<string, unknown>;

    expect(localization.formFieldLabel__username).toBe("Pseudo");
    expect(localization.formFieldInputPlaceholder__username).toBe("Pseudo");
    expect(localization.formFieldLabel__emailAddress).toBe("Adresse e-mail");
    expect(mocks.clerkProps).toMatchObject(providerProps);
    expect(markup).toContain("auth-content");
  });

  it("uses Clerk's native English by omitting the localization override", () => {
    mocks.locale = "en";

    renderToStaticMarkup(
      <ClerkLocalizationProvider {...providerProps}>
        <span>auth-content</span>
      </ClerkLocalizationProvider>,
    );

    expect(mocks.clerkProps?.localization).toBeUndefined();
    expect(mocks.clerkProps).toMatchObject(providerProps);
  });

  it("switches between the French override and native English without replacing ClerkProvider", () => {
    mocks.locale = "fr";
    renderToStaticMarkup(
      <ClerkLocalizationProvider {...providerProps}>
        <span>auth-content</span>
      </ClerkLocalizationProvider>,
    );
    const frenchProvider = mocks.clerkProps;

    mocks.locale = "en";
    const markup = renderToStaticMarkup(
      <ClerkLocalizationProvider {...providerProps}>
        <span>auth-content</span>
      </ClerkLocalizationProvider>,
    );

    expect(frenchProvider?.localization).toBeDefined();
    expect(mocks.clerkProps?.localization).toBeUndefined();
    expect(markup).toContain("auth-content");
  });
});
