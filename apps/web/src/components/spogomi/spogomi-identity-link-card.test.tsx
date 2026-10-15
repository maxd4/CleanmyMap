import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: false }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: React.ReactNode; href: string }) => React.createElement("a", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("div", props, children) }));
vi.mock("@/lib/spogomi/collection", () => ({ getSpogomiBadgePresentation: () => ({ label: "Badge", roleOrRank: "Participant" }) }));

import { SpogomiIdentityLinkCard } from "./spogomi-identity-link-card";

describe("SpogomiIdentityLinkCard", () => {
  it("makes the late participation recovery path explicit before authentication", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SpogomiIdentityLinkCard, {
        eventId: "event-1",
        signInHref: "/sign-in?redirect_url=%2Fspogomi%2Fevent-1",
      }),
    );

    expect(markup).toContain("J’ai participé à cet événement");
    expect(markup).toContain("Créez ou ouvrez votre compte");
    expect(markup).toContain("Se connecter");
    expect(markup).not.toContain("roster nominatif");
  });
});
