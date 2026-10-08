import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isNearViewport: false }));

vi.mock("@/components/ui/use-in-view-once", () => ({
  useInViewOnce: () => ({
    ref: { current: null },
    isInView: state.isNearViewport,
  }),
}));

vi.mock("@/components/actions/map-feed/actions-map-feed", () => ({
  ActionsMapFeed: () =>
    React.createElement("div", { "data-testid": "actions-map-feed" }),
}));

import { HomeMapPreview } from "./accueil-map-preview";

const source = readFileSync(new URL("./accueil-map-preview.tsx", import.meta.url), "utf8");

afterEach(() => {
  state.isNearViewport = false;
});

describe("homepage map preview", () => {
  it("fades only the outer 3.5 percent while keeping the center unmasked", () => {
    expect(source).toContain("#000 3.5%, #000 96.5%");
    expect(source).not.toContain("#000 8%");
    expect(source).not.toContain("#000 12%");
    expect(source).not.toContain("rgba(10,147,107");
  });

  it("does not mount the feed before the preview approaches the viewport", () => {
    const rendered = renderToStaticMarkup(React.createElement(HomeMapPreview));

    expect(rendered).not.toContain('data-testid="actions-map-feed"');
    expect(source).toContain('rootMargin: "260px 0px"');
    expect(source).toContain("isNearViewport ? (");
  });

  it("mounts the feed once the preview is near the viewport", () => {
    state.isNearViewport = true;

    const rendered = renderToStaticMarkup(
      React.createElement(HomeMapPreview),
    );

    expect(rendered).toContain('data-testid="actions-map-feed"');
  });
});
