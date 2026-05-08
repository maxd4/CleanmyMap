import { describe, expect, it } from "vitest";
import {
  GEOMETRY_CONFIDENCE,
  buildEllipsePolygon,
  buildSyntheticRoute,
  hasCoordinates,
  hasPreciseLocationLabel,
  toPointCoordinates,
} from "./geometry-core";

describe("geometry core helpers", () => {
  it("keeps the shared geometry confidence constants stable", () => {
    expect(GEOMETRY_CONFIDENCE.MANUAL_DRAWING).toBe(1);
    expect(GEOMETRY_CONFIDENCE.POINT_FALLBACK).toBe(0.24);
  });

  it("detects usable coordinates and point fallbacks", () => {
    expect(hasCoordinates(48.85, 2.35)).toBe(true);
    expect(hasCoordinates(null, 2.35)).toBe(false);
    expect(toPointCoordinates(48.85, 2.35)).toEqual([[48.85, 2.35]]);
    expect(toPointCoordinates(null, 2.35)).toEqual([]);
  });

  it("builds reusable ellipse and route geometries", () => {
    const ellipse = buildEllipsePolygon(
      { latitude: 48.85, longitude: 2.35 },
      85,
      55,
    );
    const route = buildSyntheticRoute(
      { latitude: 48.85, longitude: 2.35 },
      "souple",
    );

    expect(ellipse.kind).toBe("polygon");
    expect(ellipse.coordinates).toHaveLength(12);
    expect(route.kind).toBe("polyline");
    expect(route.coordinates).toHaveLength(3);
  });

  it("recognizes precise location labels without overfitting", () => {
    expect(hasPreciseLocationLabel("Rue de Rivoli, Paris 1er")).toBe(true);
    expect(hasPreciseLocationLabel("Paris")).toBe(false);
  });
});
