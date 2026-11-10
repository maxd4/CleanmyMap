import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  ClerkLoaded: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkLoading: () => null,
  SignUp: (props: Record<string, unknown>) => (
    <output data-testid="clerk-sign-up-props">
      {JSON.stringify({
        keys: Object.keys(props).sort(),
        fallbackRedirectUrl: props.fallbackRedirectUrl,
        forceRedirectUrl: props.forceRedirectUrl,
        signInUrl: props.signInUrl,
      })}
    </output>
  ),
}));
vi.mock("@/components/auth/auth-page-shell", () => ({
  AUTH_CLERK_APPEARANCE: {
    variables: { colorPrimary: "#a06c00" },
    elements: { footerAction: "hidden", headerSubtitle: "hidden" },
  },
  AuthPageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/auth/clerk-hydration-gate", () => ({
  ClerkHydrationGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SignUpPage from "./page";

describe("sign-up identity contract", () => {
  it("does not require or pass an application username for Google sign-up", async () => {
    const markup = renderToStaticMarkup(
      await SignUpPage({ searchParams: Promise.resolve({}) }),
    );

    expect(markup).toContain("fallbackRedirectUrl");
    expect(markup).not.toContain("username");
    expect(markup).toContain("/onboarding/localisation");
  });

  it("keeps the destination behind mandatory onboarding and on the sign-in switch", async () => {
    const markup = renderToStaticMarkup(
      await SignUpPage({
        searchParams: Promise.resolve({
          redirect_url: "/spogomi/paris?focus=registration#form",
          ref: "INVITE",
        }),
      }),
    );

    expect(markup).toContain("/onboarding/localisation?next=%2Fspogomi%2Fparis%3Ffocus%3Dregistration%23form&amp;ref=INVITE");
    expect(markup).toContain("/sign-in?redirect_url=%2Fspogomi%2Fparis%3Ffocus%3Dregistration%23form&amp;ref=INVITE");
  });
});
