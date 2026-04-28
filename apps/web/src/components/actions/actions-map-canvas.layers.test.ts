import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  toggleVisibleMapLayer,
} from "./actions-map-canvas.layers";

describe("actions map canvas layers", () => {
  it("starts with all local layers visible", () => {
    expect(DEFAULT_VISIBLE_MAP_LAYERS).toEqual({
      points: true,
      shapes: true,
      infrastructure: true,
    });
  });

  it("toggles a single layer without mutating the others", () => {
    const next = toggleVisibleMapLayer(DEFAULT_VISIBLE_MAP_LAYERS, "shapes");

    expect(next).toEqual({
      points: true,
      shapes: false,
      infrastructure: true,
    });
    expect(DEFAULT_VISIBLE_MAP_LAYERS).toEqual({
      points: true,
      shapes: true,
      infrastructure: true,
    });
  });
});
