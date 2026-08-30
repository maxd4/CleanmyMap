import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ACTIONS_MAP_VIEWPORT } from "@/components/actions/actions-map-canvas.utils";
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
