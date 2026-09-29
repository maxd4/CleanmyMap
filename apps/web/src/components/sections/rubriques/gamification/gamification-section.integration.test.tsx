import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MeResponse } from "./gamification-types";

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
    theme: "light",
    displayMode: "calme",
    setDisplayMode: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("swr", () => ({
  default: () => ({
    data: {
      status: "ok",
      progression: {
        currentLevel: 2,
        potentialLevel: 3,
        xpValidated: 2,
        xpPending: 1,
        nextLevel: {
          level: 3,
          xpRequired: 3,
          xpRemaining: 1,
          frozen: false,
          requirements: { missing: [], satisfied: [] },
        },
        impact: {
          waterSavedLiters: 500,
          co2AvoidedKg: 1.2,
          surfaceCleanedM2: 4,
          wasteKnownActions: 1,
          wasteCoverageRate: 100,
        },
        impactMethodology: {
          proxyVersion: "test",
          scope: "Actions approuvées.",
        },
        monthlyMilestone: null,
      } as unknown as MeResponse["progression"],
    },
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }),
}));

vi.mock("./gamification-panels", () => ({
  CelebrationsPanel: () => <div />,
  CollectionsPanel: () => <div />,
  EngagementPanel: () => <div />,
  MethodologyBanner: () => <div />,
  OperationalStatusCard: () => <div />,
  ProfileSettingsCard: () => <div />,
  QuizProgressionCard: () => <div />,
  RecognitionPanel: () => <div />,
  WhyGamification: () => <div />,
}));

vi.mock("./gamification-catalog-panel", () => ({ GamificationCatalogPanel: () => <div /> }));
vi.mock("./gamification-rules-migration-notice", () => ({ GamificationRulesMigrationNotice: () => <div /> }));

import { GamificationSection } from "./index";

describe("GamificationSection integration", () => {
  it("mounts the global level and personal impact panels from the shared API payload", () => {
    const markup = renderToStaticMarkup(<GamificationSection />);

    expect(markup).toContain("Niveau global");
    expect(markup).toContain("Impact personnel");
    expect(markup).toContain("Eau préservée — proxy");
  });
});
