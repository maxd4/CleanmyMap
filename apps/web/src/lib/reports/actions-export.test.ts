import { describe, expect, it } from "vitest";
import { manualDrawingToGeoJson } from "./actions-export";

describe("manualDrawingToGeoJson", () => {
  it("returns null when no drawing is present", () => {
    expect(manualDrawingToGeoJson(null)).toBeNull();
  });

  it.each([
    ["polyline", { type: "LineString", coordinates: [[2.35, 48.85]] }],
    ["polygon", { type: "Polygon", coordinates: [[[2.35, 48.85]]] }],
  ] as const)("normalizes %s coordinates to GeoJSON order", (kind, expected) => {
    expect(
      manualDrawingToGeoJson({
        kind,
        coordinates: [[48.85, 2.35]],
      }),
    ).toBe(JSON.stringify(expected));
  });
});
