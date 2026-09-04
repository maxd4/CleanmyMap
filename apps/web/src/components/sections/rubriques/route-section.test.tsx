import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
  requestRecommendation: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/components/ui/cmm-skeleton", () => ({ CmmSkeleton: () => null }));
vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("lucide-react", () => ({
  Info: "span",
  Navigation: "span",
  Route: "span",
  Sparkles: "span",
  Zap: "span",
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: "div" },
}));
vi.mock("./route/hooks/use-route-data", () => ({
  useRouteData: () => ({
    options: { priorityVsTravel: 65, travelBudgetMinutes: 60, maxStops: 6 },
    setOptions: vi.fn(),
    planningMode: { type: "free" },
    setPlanningMode: vi.fn(),
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
    isResolvingOrigin: false,
    isRequestInFlight: false,
    requestRecommendation: mocks.requestRecommendation,
  }),
}));
vi.mock("./route/components/route-summary-cards", () => ({
  RouteSummaryCards: () => null,
}));
vi.mock("./route/components/route-event-selector", () => ({
  RouteEventSelector: () => null,
}));
vi.mock("./route/components/route-constraints-form", () => ({
  RouteOptionsForm: () => null,
}));
vi.mock("./route/components/route-assistant", () => ({ RouteAssistant: () => null }));
vi.mock("./route/components/route-list", () => ({ RouteList: () => null }));
vi.mock("./route/route-origin", () => ({
  getRouteOriginLabel: () => "",
  getRouteRecommendationErrorMessage: () => "",
}));

import { RouteSection } from "./route-section";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";

describe("RouteSection effective auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false });
  });

  it("shows the calculation button when the local bypass is active", () => {
    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <RouteSection />
      </EffectiveAuthStateProvider>,
    );

    expect(markup).toContain("Calculer la recommandation");
    expect(markup).not.toContain("Se connecter pour calculer");
  });
});
