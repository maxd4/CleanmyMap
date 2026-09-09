import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ACTIONS_MAP_VIEWPORT,
  HOMEPAGE_MAP_VIEWPORT,
} from "@/components/actions/actions-map-canvas.utils";
import { ActionsMapFeed } from "./actions-map-feed";

const useMapFeedDataMock = vi.fn();

vi.mock("./use-map-feed-data", () => ({
  useMapFeedData: (...args: unknown[]) => useMapFeedDataMock(...args),
}));

afterEach(() => {
  useMapFeedDataMock.mockReset();
});

describe("ActionsMapFeed", () => {
  it("passes the visible viewport to the data hook on first render", () => {
    useMapFeedDataMock.mockReturnValue({
      data: null,
      allItems: [],
      items: [],
      summary: { totalKg: 0, totalButts: 0 },
      error: null,
      isLoading: false,
      isValidating: false,
      reload: vi.fn(),
      freshnessLabel: null,
      partialSourcesLabel: "inconnues",
      hasPartialSource: false,
    });

    renderToStaticMarkup(
      React.createElement(ActionsMapFeed, {
        days: 30,
        statusFilter: "approved",
        impactFilter: "all",
        qualityMin: 0,
        showStoriesCarousel: false,
      }),
    );

    expect(useMapFeedDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        viewport: DEFAULT_ACTIONS_MAP_VIEWPORT,
      }),
    );
  });

  it("starts the homepage preview in Paris and keeps its viewport bounded to the active view", () => {
    useMapFeedDataMock.mockReturnValue({
      data: null,
      allItems: [],
      items: [],
      summary: { totalKg: 0, totalButts: 0 },
      error: null,
      isLoading: false,
      isValidating: false,
      reload: vi.fn(),
      freshnessLabel: null,
      partialSourcesLabel: "inconnues",
      hasPartialSource: false,
    });

    renderToStaticMarkup(
      React.createElement(ActionsMapFeed, {
        days: 365,
        statusFilter: "approved",
        impactFilter: "all",
        qualityMin: 0,
        presentation: "homepage-preview",
        showStoriesCarousel: false,
      }),
    );

    expect(useMapFeedDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ viewport: HOMEPAGE_MAP_VIEWPORT }),
    );
    expect(useMapFeedDataMock.mock.calls[0]?.[0].viewport?.center).toEqual([
      48.8566,
      2.3522,
    ]);
  });

  it("passes the resolved homepage viewport and interaction handlers to the canvas", () => {
    const source = readFileSync(new URL("./actions-map-feed.tsx", import.meta.url), "utf8");

    expect(source).toContain("initialViewport={initialViewport}");
    expect(source).toContain("viewportRequest={viewportRequest}");
    expect(source).toContain("recenterViewport={recenterViewport}");
    expect(source).not.toContain("initialViewport={null}");
    expect(source).not.toContain("onViewportChange={undefined}");
  });

  it("keeps the public homepage geolocation failure on its Paris fallback", () => {
    const source = readFileSync(new URL("./actions-map-feed.tsx", import.meta.url), "utf8");

    expect(source).toContain("fallbackViewport: HOMEPAGE_MAP_VIEWPORT");
    expect(source).toContain("useRemoteFallback: false");
    expect(source).not.toContain('presentation === "homepage-preview" ? null');
  });

  it("uses the canonical feedback and skeleton primitives for feed states", () => {
    useMapFeedDataMock.mockReturnValue({
      data: null,
      allItems: [],
      items: [],
      summary: { totalKg: 0, totalButts: 0 },
      error: new Error("Carte indisponible"),
      isLoading: true,
      isValidating: false,
      reload: vi.fn(),
      freshnessLabel: null,
      partialSourcesLabel: "inconnues",
      hasPartialSource: false,
    });

    const markup = renderToStaticMarkup(
      React.createElement(ActionsMapFeed, {
        days: 30,
        statusFilter: "approved",
        impactFilter: "all",
        qualityMin: 0,
        showStoriesCarousel: false,
      }),
    );

    expect(markup).toContain('data-skeleton-variant="text"');
    expect(markup).toContain('data-feedback-tone="error"');
    expect(markup).toContain("Carte indisponible");
  });
});
