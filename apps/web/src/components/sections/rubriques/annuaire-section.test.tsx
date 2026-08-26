import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("@/components/sections/rubriques/use-annuaire-logic", () => ({
  useAnnuaireLogic: () => ({
    searchTerm: "",
    setSearchTerm: vi.fn(),
    setActorCardsPage: vi.fn(),
    featuredEntries: [],
  }),
}));

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("section", null, children),
}));

vi.mock("@/components/sections/rubriques/academie-climat-workshops-panel", () => ({
  AcademieClimatWorkshopsPanel: () => React.createElement("div"),
}));

vi.mock("@/components/sections/rubriques/annuaire-featured-section", () => ({
  AnnuaireFeaturedSection: () => React.createElement("div"),
}));

vi.mock("@/components/sections/rubriques/annuaire-thematic-exploration", () => ({
  AnnuaireThematicExploration: () => React.createElement("div"),
}));

vi.mock("@/components/sections/rubriques/annuaire-exploration-view", () => ({
  AnnuaireExplorationView: () => React.createElement("div"),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({
    href,
    ariaLabel,
    children,
  }: {
    href?: string;
    ariaLabel?: string;
    children: React.ReactNode;
  }) => React.createElement(href ? "a" : "button", { href, "aria-label": ariaLabel }, children),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) =>
      React.createElement("div", props, children),
    section: ({ children, ...props }: React.ComponentProps<"section">) =>
      React.createElement("section", props, children),
  },
}));

vi.mock("lucide-react", () => ({
  ArrowRight: () => React.createElement("span"),
  Building2: () => React.createElement("span"),
  Globe: () => React.createElement("span"),
  Sparkles: () => React.createElement("span"),
  Target: () => React.createElement("span"),
}));

import { AnnuaireSection } from "./annuaire-section";

describe("AnnuaireSection partner onboarding CTA", () => {
  it("targets the canonical partner onboarding route", () => {
    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain('href="/partners/onboarding"');
    expect(markup).toContain("Référencer ma structure");
    expect(markup).toContain(
      'aria-label="Référencer ma structure — ouvrir le parcours partenaire"',
    );
  });
});
