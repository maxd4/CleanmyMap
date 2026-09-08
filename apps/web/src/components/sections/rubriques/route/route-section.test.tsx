import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
  requestRecommendation: vi.fn(),
  routeData: {
    status: "ok",
    dataStatus: "complete",
    routeGeometry: { mode: "fallback" },
    origin: { source: "browser" },
  } as Record<string, unknown>,
}));

vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/components/ui/cmm-skeleton", () => ({ CmmSkeleton: () => null }));
vi.mock("@/components/sections/rubriques/shared", () => ({ SectionShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("lucide-react", () => ({ FileDown: "span", Info: "span", Navigation: "span", Route: "span", Sparkles: "span", Zap: "span" }));
vi.mock("framer-motion", () => ({ AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>, motion: { div: "div" } }));
vi.mock("./components/route-summary-cards", () => ({ RouteSummaryCards: () => null }));
vi.mock("./components/route-constraints-form", () => ({ RouteOptionsForm: () => null }));
vi.mock("./components/route-assistant", () => ({ RouteAssistant: () => null }));
vi.mock("./components/route-list", () => ({ RouteList: () => null }));
vi.mock("./components/route-event-selector", () => ({ RouteEventSelector: () => <div data-route-event-selector /> }));
vi.mock("./components/route-explanation", () => ({ RouteExplanation: () => <div data-route-explanation /> }));
vi.mock("./route-origin", () => ({ getRouteOriginLabel: () => "", getRouteRecommendationErrorMessage: () => "" }));
vi.mock("./hooks/use-route-data", () => ({
  useRouteData: () => ({
    options: { priorityVsTravel: 65, travelBudgetMinutes: 60, maxStops: 6 },
    setOptions: vi.fn(),
    data: mocks.routeData,
    isLoading: false,
    error: null,
    picks: [],
    totalKm: 0,
    totalMinutes: 0,
    hasData: true,
    hasRoute: Array.isArray(mocks.routeData.groupRoutes) && mocks.routeData.groupRoutes.length > 0,
    fr: true,
    recommendationRequested: false,
    planningMode: { type: "free" },
    setPlanningMode: vi.fn(),
    originMode: "browser",
    setOriginMode: vi.fn(),
    mapOrigin: null,
    setMapOrigin: vi.fn(),
    clearMapOrigin: vi.fn(),
    originSelectionError: null,
    isResolvingOrigin: false,
    isRequestInFlight: false,
    requestRecommendation: mocks.requestRecommendation,
  }),
}));

import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import { RouteSection } from "./route-section";

describe("RouteSection explainability wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false });
    Object.assign(mocks.routeData, {
      status: "ok",
      dataStatus: "complete",
      routeGeometry: { mode: "fallback" },
      origin: { source: "browser" },
      groupRoutes: [],
    });
  });

  it("keeps the event selector and explanation in the route domain", () => {
    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <RouteSection />
      </EffectiveAuthStateProvider>,
    );
    expect(markup).toContain("data-route-event-selector");
    expect(markup).toContain("data-route-explanation");
    expect(markup).toContain("Calculer la recommandation");
  });

  it("exposes the multi-loop legend and the all-or-one group selection", () => {
    Object.assign(mocks.routeData, {
      isLoop: true,
      volunteers: 12,
      groupCount: 3,
      scoreBreakdown: { priority: 80 },
      multiRoute: {
        totalDistanceKm: 8.2,
        coverageGain: 0.8,
        sharedTargetRatio: 0,
        sharedDistanceRatio: null,
      },
      groupRoutes: [
        { groupIndex: 1, volunteerCount: 4, travelDistanceKm: 2.4, travelMinutes: 20, targetCount: 3 },
        { groupIndex: 2, volunteerCount: 4, travelDistanceKm: 2.7, travelMinutes: 22, targetCount: 3 },
        { groupIndex: 3, volunteerCount: 4, travelDistanceKm: 3.1, travelMinutes: 25, targetCount: 2 },
      ],
      tradeoffs: [],
    });

    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <RouteSection />
      </EffectiveAuthStateProvider>,
    );

    expect(markup).toContain("Différencier les itinéraires par");
    expect(markup).toContain("Couleurs différentes");
    expect(markup).toContain("Formes différentes");
    expect(markup).toContain("Tous les groupes");
    expect(markup).toContain("Groupe 1 — 4 bénévoles");
    expect(markup).toContain("Groupe 2 — 4 bénévoles");
    expect(markup).toContain("Groupe 3 — 4 bénévoles");
    expect(markup).toContain('aria-label="Légende des boucles"');
  });
});
