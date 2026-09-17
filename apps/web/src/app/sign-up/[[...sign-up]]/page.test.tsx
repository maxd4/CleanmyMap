import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  ClerkLoaded: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkLoading: () => null,
  SignUp: (props: Record<string, unknown>) => (
    <output data-testid="clerk-sign-up-props">
      {JSON.stringify({ keys: Object.keys(props).sort(), fallbackRedirectUrl: props.fallbackRedirectUrl })}
    </output>
  ),
}));
vi.mock("@/components/auth/auth-page-shell", () => ({
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
});
