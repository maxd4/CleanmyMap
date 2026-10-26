import { describe, expect, it } from "vitest";
import {
  isCoordinate,
  isRouteGeometry,
} from "./route-geometry-validation";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";

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

function emptyPlaceholder(overrides: Record<string, unknown> = {}) {
  return {
    isLoop: true,
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
    ["return leg absent from the legs", { legs: [] }],
    ["return leg does not match the final leg", {
      returnLeg: { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 4 },
    }],
    ["return leg does not advance to the origin", {
      returnLeg: { fromStopIndex: 1, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 4 },
    }],
    ["total distance is shorter than the return", { distanceKm: 0.5 }],
    ["total duration is shorter than the return", { durationMinutes: 3 }],
    ["non-finite coordinate", { coordinates: [origin, [Number.NaN, 2.36], origin] }],
    ["out-of-range coordinate", { coordinates: [origin, [91, 2.36], origin] }],
  ])("rejects %s instead of accepting an artificial loop", (_label, overrides) => {
    expect(isRouteGeometry(closedGeometry(overrides))).toBe(false);
  });

  it("keeps the explicit empty placeholder separate from a non-empty loop", () => {
    expect(isRouteGeometry(emptyPlaceholder())).toBe(true);
    expect(isRouteGeometry({ ...closedGeometry(), coordinates: [origin, origin], legs: [{
      fromStopIndex: 0,
      toStopIndex: 1,
      distanceKm: 0,
      estimatedMinutes: 0,
    }], returnLeg: {
      fromStopIndex: 0,
      toStopIndex: 1,
      distanceKm: 0,
      estimatedMinutes: 0,
    }, distanceKm: 0, durationMinutes: 0 })).toBe(true);
  });

  it.each([
    ["non-null origin", { origin }],
    ["positive distance", { distanceKm: 1 }],
    ["positive duration", { durationMinutes: 4 }],
    ["return leg", {
      returnLeg: { fromStopIndex: 0, toStopIndex: 1, distanceKm: 0, estimatedMinutes: 0 },
    }],
    ["legs", { legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 0, estimatedMinutes: 0 }] }],
    ["network provider", { provider: "fossgis-osrm" }],
    ["network profile", { profile: "foot" }],
    ["network mode", { mode: "network" }],
    ["measured flag", { estimated: false }],
  ])("rejects an empty placeholder with incompatible %s metadata", (_label, overrides) => {
    expect(isRouteGeometry(emptyPlaceholder(overrides))).toBe(false);
  });

  it.each([0, 1.5, 2.25])(
    "keeps the calibration fixture geometrically coherent for distance %s",
    (distanceKm) => {
      expect(isRouteGeometry(createRoutePlannerSnapshotInput(distanceKm).routeGeometry)).toBe(true);
    },
  );

  it("keeps coordinate bounds and non-finite values fail-closed", () => {
    expect(isCoordinate([-90, -180])).toBe(true);
    expect(isCoordinate([90, 180])).toBe(true);
    expect(isCoordinate([90.000001, 0])).toBe(false);
    expect(isCoordinate([0, Number.POSITIVE_INFINITY])).toBe(false);
  });
});
