import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const annuaireLogicMock = vi.hoisted(() => vi.fn());
const sitePreferencesMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: sitePreferencesMock,
}));

vi.mock("@/components/sections/rubriques/annuaire/use-annuaire-logic", () => ({
  useAnnuaireLogic: annuaireLogicMock,
}));

vi.mock("@/components/ui/cmm-feedback", () => ({
  CmmFeedback: ({ title, children, action, tone }: { title?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; tone?: string }) =>
    React.createElement("div", { role: tone === "error" || tone === "warning" ? "alert" : "status", "data-tone": tone }, title, children, action),
}));

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children, gradient }: { children: React.ReactNode; gradient?: string }) =>
    React.createElement("section", { "data-gradient": gradient }, children),
}));

vi.mock("@/components/sections/rubriques/annuaire/annuaire-featured-section", () => ({
  AnnuaireFeaturedSection: () => React.createElement("div"),
}));

vi.mock("@/components/sections/rubriques/annuaire/annuaire-exploration-view", () => ({
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
  RefreshCw: () => React.createElement("span"),
}));

import { AnnuaireSection } from "./annuaire-section";

beforeEach(() => {
  sitePreferencesMock.mockReturnValue({ locale: "fr" });
  annuaireLogicMock.mockReturnValue({
    searchTerm: "",
    setSearchTerm: vi.fn(),
    setActorCardsPage: vi.fn(),
    featuredEntries: [],
    filterKey: "|all|all|all",
    resetFilters: vi.fn(),
    sortedAndFilteredEntries: [],
    isLoading: false,
    isValidating: false,
    isPublishedDirectoryUnavailable: false,
    isPublishedDirectoryStale: false,
    retryPublishedDirectory: vi.fn(),
  });
});

describe("AnnuaireSection partner onboarding CTA", () => {
  it("targets the canonical partner onboarding route", () => {
    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain('href="/partners/onboarding"');
    expect(markup).toContain("Référencer ma structure");
    expect(markup).toContain(
      'aria-label="Référencer ma structure — ouvrir le parcours partenaire"',
    );
  });

  it("uses the existing violet family", () => {
    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain(
      'data-gradient="from-violet-600/20 via-violet-500/10 to-transparent"',
    );
    expect(markup).toContain("text-violet-400");
    expect(markup).not.toContain("text-indigo-");
  });

  it("does not compose the obsolete static workshops panel", () => {
    const source = readFileSync(new URL("./annuaire-section.tsx", import.meta.url), "utf8");
    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(source).not.toContain("AcademieClimatWorkshopsPanel");
    expect(source).not.toContain("synchronisées avec les sources officielles");
    expect(markup).not.toContain("Prochains ateliers");
  });

  it("announces a partial directory and exposes an accessible retry in French", () => {
    annuaireLogicMock.mockReturnValue({
      searchTerm: "",
      setSearchTerm: vi.fn(),
      setActorCardsPage: vi.fn(),
      featuredEntries: [],
      filterKey: "|all|all|all",
      resetFilters: vi.fn(),
      sortedAndFilteredEntries: [],
      isLoading: false,
      isValidating: false,
      isPublishedDirectoryUnavailable: true,
      isPublishedDirectoryStale: false,
      retryPublishedDirectory: vi.fn(),
    });

    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Fiches partenaires temporairement indisponibles");
    expect(markup).toContain("Les ressources éditoriales restent accessibles");
    expect(markup).toContain("les résultats visibles peuvent être partiels");
    expect(markup).toContain("Réessayer de charger les fiches partenaires");
  });

  it("distinguishes the initial loading state from an outage", () => {
    annuaireLogicMock.mockReturnValue({
      searchTerm: "",
      setSearchTerm: vi.fn(),
      setActorCardsPage: vi.fn(),
      featuredEntries: [],
      filterKey: "|all|all|all",
      resetFilters: vi.fn(),
      sortedAndFilteredEntries: [],
      isLoading: true,
      isValidating: true,
      isPublishedDirectoryUnavailable: false,
      isPublishedDirectoryStale: false,
      retryPublishedDirectory: vi.fn(),
    });

    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Chargement des fiches partenaires");
    expect(markup).not.toContain("Fiches partenaires temporairement indisponibles");
  });

  it("keeps the same unavailable state explicit in English", () => {
    sitePreferencesMock.mockReturnValue({ locale: "en" });
    annuaireLogicMock.mockReturnValue({
      searchTerm: "",
      setSearchTerm: vi.fn(),
      setActorCardsPage: vi.fn(),
      featuredEntries: [],
      filterKey: "|all|all|all",
      resetFilters: vi.fn(),
      sortedAndFilteredEntries: [],
      isLoading: false,
      isValidating: true,
      isPublishedDirectoryUnavailable: true,
      isPublishedDirectoryStale: true,
      retryPublishedDirectory: vi.fn(),
    });

    const markup = renderToStaticMarkup(<AnnuaireSection />);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Partner profiles may be stale");
    expect(markup).toContain("the count and visible results may be partial");
    expect(markup).toContain("Retry loading partner profiles");
    expect(markup).toContain("Refreshing...");
  });
});
