import { describe, expect, it } from "vitest";
import { resolveShapeLayerFitPositions } from "./map-layers-shape-item-model";

describe("shape layer geometry framing", () => {
  it("flattens every observed line when multiline positions are the canonical geometry", () => {
    expect(resolveShapeLayerFitPositions({
      positions: [],
      multiLinePositions: [
        [[48.85, 2.35], [48.86, 2.36]],
        [[48.87, 2.37], [48.88, 2.38]],
      ],
    })).toEqual([
      [48.85, 2.35], [48.86, 2.36], [48.87, 2.37], [48.88, 2.38],
    ]);
  });

  it("keeps the primary polygon/polyline framing when positions are available", () => {
    const positions: [number, number][] = [[48.85, 2.35], [48.86, 2.36]];
    expect(resolveShapeLayerFitPositions({
      positions,
      multiLinePositions: [[[49, 3], [49.1, 3.1]]],
    })).toBe(positions);
  });
});
