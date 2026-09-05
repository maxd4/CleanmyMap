import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useUser: vi.fn(), requestRecommendation: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/components/ui/cmm-skeleton", () => ({ CmmSkeleton: () => null }));
vi.mock("@/components/sections/rubriques/shared", () => ({ SectionShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("lucide-react", () => ({ Info: "span", Navigation: "span", Route: "span", Sparkles: "span", Zap: "span" }));
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
    data: undefined,
    isLoading: false,
    error: null,
    picks: [],
    totalKm: 0,
    totalMinutes: 0,
    hasData: false,
    hasRoute: false,
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
  });

  it("keeps the event selector and explanation in the route domain", () => {
    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <RouteSection />
      </EffectiveAuthStateProvider>,
    );
    expect(markup).toContain("data-route-event-selector");
    expect(markup).toContain("Calculer la recommandation");
  });
});
