import { describe, expect, it, vi } from "vitest";
import { createMapSelectableLayerRefs } from "./map-layers-selection";

describe("map selectable layer refs", () => {
  it("does not open a layer when no action is selected", () => {
    const refs = createMapSelectableLayerRefs();
    const layer = { openPopup: vi.fn() };
    refs.register("action-1", layer);

    refs.openSelected(null);
    refs.openSelected(undefined);

    expect(layer.openPopup).not.toHaveBeenCalled();
  });

  it("opens the selected registered layer only", () => {
    const refs = createMapSelectableLayerRefs();
    const selectedLayer = { openPopup: vi.fn() };
    const otherLayer = { openPopup: vi.fn() };
    refs.register("action-1", selectedLayer);
    refs.register("action-2", otherLayer);

    refs.openSelected("action-1");

    expect(selectedLayer.openPopup).toHaveBeenCalledTimes(1);
    expect(otherLayer.openPopup).not.toHaveBeenCalled();
  });

  it("ignores an absent selection and removed layers", () => {
    const refs = createMapSelectableLayerRefs();
    const layer = { openPopup: vi.fn() };
    refs.register("action-1", layer);

    refs.openSelected("missing");
    refs.register("action-1", null);
    refs.openSelected("action-1");

    expect(layer.openPopup).not.toHaveBeenCalled();
  });

  it("opens each newly selected layer without opening unrelated layers", () => {
    const refs = createMapSelectableLayerRefs();
    const firstLayer = { openPopup: vi.fn() };
    const secondLayer = { openPopup: vi.fn() };
    refs.register("action-1", firstLayer);
    refs.register("action-2", secondLayer);

    refs.openSelected("action-1");
    refs.openSelected("action-2");

    expect(firstLayer.openPopup).toHaveBeenCalledTimes(1);
    expect(secondLayer.openPopup).toHaveBeenCalledTimes(1);
  });
});
