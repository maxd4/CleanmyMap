import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useActionsMapFilters: vi.fn(),
  useActionsMapViewport: vi.fn(),
  useMapFeedData: vi.fn(),
  feedContentProps: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/actions/map-feed/use-actions-map-viewport", () => ({
  useActionsMapViewport: (...args: unknown[]) => mocks.useActionsMapViewport(...args),
}));

vi.mock("@/components/actions/map-feed/use-map-feed-data", () => ({
  useMapFeedData: (...args: unknown[]) => mocks.useMapFeedData(...args),
}));

vi.mock("@/components/actions/map/use-actions-map-filters", () => ({
  useActionsMapFilters: (...args: unknown[]) => mocks.useActionsMapFilters(...args),
}));

vi.mock("@/components/actions/map/action-pollution-score-references-context", () => ({
  ActionPollutionScoreReferencesProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/components/actions/map-feed/_layouts/immersive-layout", () => ({
  ImmersiveLayout: () => React.createElement("div", { "data-testid": "immersive-layout" }, "Flux actif"),
}));

vi.mock("@/components/actions/map-feed/_layouts/default-layout", () => ({
  DefaultLayout: () => React.createElement("div", { "data-testid": "default-layout" }, "Flux actif"),
}));

vi.mock("@/components/actions/actions-map-table", () => ({
  ActionsMapTable: () => null,
}));

vi.mock("./_components/map-kpi-ribbon", () => ({
  MapKpiRibbon: () => null,
}));

vi.mock("./_components/map-control-tower", () => ({
  MapControlTower: () => null,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) =>
    React.createElement("h1", null, title),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({
    children,
    href,
    onClick,
    type = "button",
  }: {
    children?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
  }) =>
    href
      ? React.createElement("a", { href, onClick }, children)
      : React.createElement("button", { type, onClick }, children),
}));

vi.mock("@/components/ui/cmm-skeleton", () => ({
  CmmSkeleton: () => null,
}));

vi.mock("@/components/actions/map-feed/actions-map-feed", async () => {
  const actual = await vi.importActual<typeof import("@/components/actions/map-feed/actions-map-feed")>(
    "@/components/actions/map-feed/actions-map-feed",
  );

  return {
    ...actual,
    ActionsMapFeedContent: (
      props: React.ComponentProps<typeof actual.ActionsMapFeedContent>,
    ) => {
      mocks.feedContentProps(props);
      return React.createElement(actual.ActionsMapFeedContent, props);
    },
  };
});

import { ActionsMapPageClient } from "./page-client";

const FALLBACK_VIEWPORT = {
  center: [48.8566, 2.3522] as [number, number],
  zoom: 12,
  bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.4 },
};

function configurePageState({
  viewport = null,
  initialViewportError = null,
  isInitialViewportResolved = true,
  hasInitialPublicActions = true,
  retryInitialViewport = vi.fn(),
  handleManualViewportInteraction = vi.fn(),
  handleViewportChange = vi.fn(),
  items = [],
}: {
  viewport?: typeof FALLBACK_VIEWPORT | null;
  initialViewportError?: Error | null;
  isInitialViewportResolved?: boolean;
  hasInitialPublicActions?: boolean;
  retryInitialViewport?: ReturnType<typeof vi.fn>;
  handleManualViewportInteraction?: ReturnType<typeof vi.fn>;
  handleViewportChange?: ReturnType<typeof vi.fn>;
  items?: unknown[];
} = {}) {
  mocks.useActionsMapFilters.mockReturnValue({
    filters: {
      days: 30,
      dateScope: "current_year",
      zoneQuery: "",
      visibleCategories: {},
    },
    setDateScope: vi.fn(),
    setZoneQuery: vi.fn(),
    toggleCategory: vi.fn(),
    resetFilters: vi.fn(),
  });
  mocks.useActionsMapViewport.mockReturnValue({
    viewport,
    viewportRequest: null,
    viewportRequestKey: 0,
    recenterViewport: null,
    isInitialViewportResolved,
    hasInitialPublicActions,
    initialViewportError,
    retryInitialViewport,
    handleManualViewportInteraction,
    handleViewportChange,
  });
  mocks.useMapFeedData.mockReturnValue({
    data: null,
    allItems: items,
    items,
    summary: { totalKg: 0, totalButts: 0, wasteKnownActions: 0, wasteCoverageRate: 0 },
    error: null,
    isLoading: false,
    isValidating: false,
    reload: vi.fn(),
    freshnessLabel: null,
    partialSourcesLabel: "inconnues",
    hasPartialSource: false,
  });
}

function renderPage() {
  return renderToStaticMarkup(
    React.createElement(ActionsMapPageClient, { impactMetrics: [] }),
  );
}

describe("ActionsMapPageClient initial viewport contract", () => {
  beforeEach(() => {
    mocks.useActionsMapFilters.mockReset();
    mocks.useActionsMapViewport.mockReset();
    mocks.useMapFeedData.mockReset();
    mocks.feedContentProps.mockReset();
  });

  it("exposes a resolver error with retry and never renders a false empty feed", () => {
    const resolverError = new Error("resolver failed");
    const retryInitialViewport = vi.fn();
    configurePageState({
      viewport: null,
      initialViewportError: resolverError,
      hasInitialPublicActions: false,
      retryInitialViewport,
    });

    const markup = renderPage();
    const feedRequest = mocks.useMapFeedData.mock.calls[0]?.[0];
    const feedContentProps = mocks.feedContentProps.mock.calls[0]?.[0];

    expect(markup).toContain("Carte indisponible");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("Aucune action");
    expect(feedRequest).toEqual(expect.objectContaining({
      enabled: false,
      viewport: null,
      scoreScope: "global",
      displayMode: "projected_today",
    }));
    expect(feedContentProps).toEqual(expect.objectContaining({
      initialViewportError: resolverError,
      onRetryInitialViewport: retryInitialViewport,
      scoreScope: "global",
      displayMode: "projected_today",
    }));
  });

  it("keeps the feed enabled with a stable fallback and never returns [0, 0]", () => {
    configurePageState({ viewport: FALLBACK_VIEWPORT, hasInitialPublicActions: true });

    const markup = renderPage();
    const feedRequest = mocks.useMapFeedData.mock.calls[0]?.[0];

    expect(feedRequest).toEqual(expect.objectContaining({
      enabled: true,
      viewport: FALLBACK_VIEWPORT,
      scoreScope: "global",
      displayMode: "projected_today",
    }));
    expect(feedRequest.viewport.center).not.toEqual([0, 0]);
    expect(markup).toContain('data-testid="immersive-layout"');
    expect(markup).not.toContain("Carte indisponible");
    expect(markup).not.toContain("Aucune action");
  });

  it("keeps manual viewport interaction as the consumer priority", () => {
    const manualViewport = {
      ...FALLBACK_VIEWPORT,
      center: [43.6045, 1.444] as [number, number],
    };
    const handleManualViewportInteraction = vi.fn();
    configurePageState({
      viewport: manualViewport,
      isInitialViewportResolved: false,
      hasInitialPublicActions: false,
      handleManualViewportInteraction,
    });

    renderPage();
    const feedRequest = mocks.useMapFeedData.mock.calls[0]?.[0];
    const feedContentProps = mocks.feedContentProps.mock.calls[0]?.[0];

    expect(feedRequest.viewport).toBe(manualViewport);
    expect(feedRequest.viewport.center).not.toEqual([0, 0]);
    expect(feedContentProps).toEqual(expect.objectContaining({
      initialViewport: manualViewport,
      onViewportInteraction: handleManualViewportInteraction,
    }));
  });
});
