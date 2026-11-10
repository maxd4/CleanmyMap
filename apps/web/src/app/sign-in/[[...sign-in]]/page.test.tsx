import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  ClerkLoaded: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkLoading: () => null,
  SignIn: (props: Record<string, unknown>) => (
    <output data-testid="clerk-sign-in-props">
      {JSON.stringify({
        forceRedirectUrl: props.forceRedirectUrl,
        fallbackRedirectUrl: props.fallbackRedirectUrl,
        signUpUrl: props.signUpUrl,
      })}
    </output>
  ),
}));
vi.mock("@/components/auth/auth-page-shell", () => ({
  AUTH_CLERK_APPEARANCE: {
    variables: { colorPrimary: "#a06c00" },
    elements: { footerAction: "hidden", headerSubtitle: "hidden" },
  },
  AuthPageShell: ({ children, switchHref }: { children: React.ReactNode; switchHref?: string }) => (
    <main data-switch-href={switchHref}>{children}</main>
  ),
}));
vi.mock("@/components/auth/clerk-hydration-gate", () => ({
  ClerkHydrationGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SignInPage from "./page";

describe("sign-in return contract", () => {
  it("passes the safe destination to Clerk and to the sign-up switch", async () => {
    const markup = renderToStaticMarkup(
      await SignInPage({
        searchParams: Promise.resolve({
          redirect_url: "/spogomi/paris?focus=registration#form",
          ref: "INVITE",
        }),
      }),
    );

    expect(markup).toContain("forceRedirectUrl");
    expect(markup).toContain("/spogomi/paris?focus=registration#form");
    expect(markup).toContain("/sign-up?redirect_url=%2Fspogomi%2Fparis%3Ffocus%3Dregistration%23form&amp;ref=INVITE");
  });

  it("keeps the home fallback when no usable destination is provided", async () => {
    const markup = renderToStaticMarkup(
      await SignInPage({
        searchParams: Promise.resolve({ redirect_url: "https://evil.example" }),
      }),
    );

    expect(markup).toContain("&quot;fallbackRedirectUrl&quot;:&quot;/&quot;");
    expect(markup).toContain('data-switch-href="/sign-up"');
    expect(markup).not.toContain("evil.example");
  });
});
