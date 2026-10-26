import { describe, expect, it } from "vitest";
import {
  isCoordinate,
  isRouteGeometry,
} from "./route-geometry-validation";

const origin = [48.85, 2.35] as [number, number];
const stop = [48.86, 2.36] as [number, number];

function closedGeometry(overrides: Record<string, unknown> = {}) {
  return {
    isLoop: true,
    origin,
    returnLeg: { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 4 },
    coordinates: [origin, stop, origin],
    distanceKm: 2,
    durationMinutes: 8,
    legs: [
      { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 4 },
      { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 4 },
    ],
    provider: "fossgis-osrm",
    profile: "foot",
    mode: "network",
    estimated: false,
    ...overrides,
  };
}

describe("route geometry validation", () => {
  it("accepts a finite closed loop with an explicit return leg", () => {
    expect(isRouteGeometry(closedGeometry())).toBe(true);
  });

  it.each([
    ["open path", { coordinates: [origin, stop] }],
    ["wrong origin", { origin: [48.84, 2.34] }],
    ["missing return leg", { returnLeg: null }],
    ["non-finite coordinate", { coordinates: [origin, [Number.NaN, 2.36], origin] }],
    ["out-of-range coordinate", { coordinates: [origin, [91, 2.36], origin] }],
  ])("rejects %s instead of accepting an artificial loop", (_label, overrides) => {
    expect(isRouteGeometry(closedGeometry(overrides))).toBe(false);
  });

  it("keeps the explicit empty placeholder separate from a non-empty loop", () => {
    expect(isRouteGeometry({
      ...closedGeometry(),
      origin: null,
      returnLeg: null,
      coordinates: [],
      distanceKm: 0,
      durationMinutes: 0,
      legs: [],
      provider: "none",
      profile: null,
      mode: "fallback",
      estimated: true,
    })).toBe(true);
  });

  it("keeps coordinate bounds and non-finite values fail-closed", () => {
    expect(isCoordinate([-90, -180])).toBe(true);
    expect(isCoordinate([90, 180])).toBe(true);
    expect(isCoordinate([90.000001, 0])).toBe(false);
    expect(isCoordinate([0, Number.POSITIVE_INFINITY])).toBe(false);
  });
});
