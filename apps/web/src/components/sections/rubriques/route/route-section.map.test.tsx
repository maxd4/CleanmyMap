import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: false })),
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
    originMode: "map",
    setOriginMode: vi.fn(),
    mapOrigin: null,
    setMapOrigin: vi.fn(),
    clearMapOrigin: vi.fn(),
    originSelectionError: false,
    isResolvingOrigin: false,
    isRequestInFlight: false,
    requestRecommendation: vi.fn(),
  }),
}));
vi.mock("./components/route-summary-cards", () => ({ RouteSummaryCards: () => null }));
vi.mock("./components/route-constraints-form", () => ({ RouteOptionsForm: () => null }));
vi.mock("./components/route-assistant", () => ({ RouteAssistant: () => null }));
vi.mock("./components/route-list", () => ({ RouteList: () => null }));
vi.mock("./route-origin", () => ({
  getRouteOriginLabel: () => "",
  getRouteRecommendationErrorMessage: () => "",
}));

import { RouteSection } from "./route-section";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";

describe("RouteSection map origin mode", () => {
  it("asks for a map point and does not offer a calculation without one", () => {
    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <RouteSection />
      </EffectiveAuthStateProvider>,
    );

    expect(markup).toContain("Choisir sur la carte");
    expect(markup).toContain("Cliquez sur la carte pour choisir un point de départ");
    expect(markup).toContain("Choisir un point sur la carte");
    expect(markup).not.toContain("Calculer la recommandation");
  });
});
