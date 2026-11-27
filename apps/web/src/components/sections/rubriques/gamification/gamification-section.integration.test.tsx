import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "./gamification-types";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: true, userId: "user-test" as string | null }));
const swrSpy = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => authState,
}));

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
  default: (key: unknown, _fetcher: unknown, options: unknown) => {
    swrSpy(key, options);
    return {
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
      awards: [],
      spogomiAwardCount: 0,
      spogomiDistinctBadgeTypes: 0,
      spogomiEventsParticipated: 0,
      collectorProgress: {
        currentValue: 0,
        lastThreshold: null,
        nextThreshold: 1,
        progressPercent: 0,
      },
      refereeProgress: {
        currentValue: 0,
        lastThreshold: null,
        nextThreshold: 1,
        progressPercent: 0,
      },
    },
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
    };
  },
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
  beforeEach(() => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = "user-test";
    swrSpy.mockClear();
  });

  it("mounts the global level and personal impact panels from the shared API payload", () => {
    const markup = renderToStaticMarkup(<GamificationSection />);

    expect(markup).toContain("Niveau global");
    expect(markup).toContain("Impact personnel");
    expect(markup).toContain("Eau préservée — proxy");
    expect(markup).toContain("Mes acquis");
    expect(markup).toContain("En cours");
    expect(markup).toContain("À débloquer");
    expect(markup).toContain("Communauté");
    expect(markup).toContain("Badges");
    expect(markup).not.toContain("Moteur de progression hors ligne");
    expect(markup).not.toContain("Parcours Éco-Citoyen | Brigade Verte Paris");
  });

  it("blocks private SWR fetches when anonymous behind soft-gate and isolates cache by userId without keepPreviousData", () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalSelf = globalThis.self;
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
      self: globalThis,
      window: {
        location: { hash: "", pathname: "/sections/gamification", search: "" },
        history: { state: null, replaceState: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        requestAnimationFrame: () => 0,
        cancelAnimationFrame: () => {},
      },
      document: { getElementById: () => null },
    });
    authState.isLoaded = true;
    authState.isSignedIn = false;
    authState.userId = null;

    let renderer!: ReturnType<typeof create>;
    try {
      act(() => {
        renderer = create(<GamificationSection />);
      });
      expect(swrSpy).toHaveBeenLastCalledWith(null, expect.objectContaining({ keepPreviousData: false }));

      authState.isSignedIn = true;
      authState.userId = "user-A";
      act(() => {
        renderer.update(<GamificationSection />);
      });
      expect(swrSpy).toHaveBeenLastCalledWith(["gamification-me", "user-A", null], expect.objectContaining({ keepPreviousData: false }));

      authState.userId = "user-B";
      act(() => {
        renderer.update(<GamificationSection />);
      });
      expect(swrSpy).toHaveBeenLastCalledWith(["gamification-me", "user-B", null], expect.objectContaining({ keepPreviousData: false }));
      act(() => {
        renderer.unmount();
      });
    } finally {
      Object.assign(globalThis, { window: originalWindow, document: originalDocument, self: originalSelf });
    }
  });
});
