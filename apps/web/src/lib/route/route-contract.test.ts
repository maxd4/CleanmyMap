import { describe, expect, it } from "vitest";
import { applyRouteGeometryLegs, type RouteStop } from "./route-contract";

const stops: RouteStop[] = [
  {
    id: "a",
    label: "A",
    latitude: 48.85,
    longitude: 2.35,
    segmentKm: 0,
    estimatedMinutes: 30,
    priorityReason: "fresh",
    score: 80,
  },
  {
    id: "b",
    label: "B",
    latitude: 48.86,
    longitude: 2.36,
    segmentKm: 1.5,
    estimatedMinutes: 10,
    priorityReason: "fresh",
    score: 70,
  },
  {
    id: "c",
    label: "C",
    latitude: 48.87,
    longitude: 2.37,
    segmentKm: 2,
    estimatedMinutes: 12,
    priorityReason: "fresh",
    score: 60,
  },
];

describe("route response contract", () => {
  it("propagates provider legs without changing stop order or count", () => {
    const result = applyRouteGeometryLegs(stops, {
      coordinates: [],
      distanceKm: 2.4,
      durationMinutes: 15,
      provider: "osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 0.9, estimatedMinutes: 6 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1.5, estimatedMinutes: 9 },
      ],
    });

    expect(result.map((stop) => stop.id)).toEqual(["a", "b", "c"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(stops[0]);
    expect(result[1]).toMatchObject({ segmentKm: 0.9, estimatedMinutes: 6 });
    expect(result[2]).toMatchObject({ segmentKm: 1.5, estimatedMinutes: 9 });
  });

  it("keeps deterministic estimates in fallback mode", () => {
    const result = applyRouteGeometryLegs(stops, {
      coordinates: [],
      distanceKm: 3.5,
      durationMinutes: 52,
      provider: "none",
      profile: null,
      mode: "fallback",
      estimated: true,
      legs: [],
    });

    expect(result).toEqual(stops);
  });
});
