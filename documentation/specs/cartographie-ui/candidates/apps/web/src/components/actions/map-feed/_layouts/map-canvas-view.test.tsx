import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MapCanvasView } from "./map-canvas-view";
import type { ActionsMapLayoutCommonProps, ActionsMapCanvasComponent } from "../map-feed.types";

describe("MapCanvasView", () => {
  it("forwards the context filter along with the other filter callbacks", () => {
    const onContextFilterChange = vi.fn();
    const onResetFilters = vi.fn();
    const capture = vi.fn();
    const MapCanvas: ActionsMapCanvasComponent = props => { capture(props); return null; };
    const layoutProps: ActionsMapLayoutCommonProps = {
      MapCanvas, items: [], allItems: [], selectedActionId: null,
      hasPartialSource: false, isTruncated: false, partialSourcesLabel: "",
      freshnessLabel: null, isValidating: false, mapCanvasError: null,
      onContextFilterChange, onResetFilters, onSelectAction: vi.fn(), onReload: vi.fn(),
    };
    renderToStaticMarkup(<MapCanvasView layoutProps={layoutProps} fullViewport />);
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({
      onContextFilterChange, onResetFilters, fullViewport: true,
    }));
  });
});
