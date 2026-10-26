import { describe, expect, it } from "vitest";
import { haversineDistanceKm, polylineDistanceKm } from "./geodesic-distance";

describe("geodesic distance invariants", () => {
  it("is zero for an identical coordinate and symmetric for bounded coordinates", () => {
    const points: [number, number][] = [
      [0, 0],
      [48.8566, 2.3522],
      [-45, 120],
      [90, -180],
    ];

    for (const point of points) {
      expect(haversineDistanceKm(point, point)).toBe(0);
    }

    for (const left of points) {
      for (const right of points) {
        expect(haversineDistanceKm(left, right)).toBeCloseTo(
          haversineDistanceKm(right, left),
          10,
        );
        expect(haversineDistanceKm(left, right)).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(haversineDistanceKm(left, right))).toBe(true);
      }
    }
  });

  it("keeps latitude/longitude order and handles the antimeridian without a long-way jump", () => {
    const paris = [48.8566, 2.3522] as [number, number];
    const swapped = [2.3522, 48.8566] as [number, number];
    const nearAntimeridian = haversineDistanceKm(
      [0, 179.999] as [number, number],
      [0, -179.999] as [number, number],
    );

    expect(haversineDistanceKm(paris, swapped)).toBeGreaterThan(1_000);
    expect(nearAntimeridian).toBeLessThan(1);
  });

  it("preserves zero-length duplicate segments and sums only consecutive segments", () => {
    const origin = [48.85, 2.35] as [number, number];
    const stop = [48.851, 2.351] as [number, number];
    const route = [origin, origin, stop, stop, origin];

    expect(polylineDistanceKm(route)).toBeCloseTo(
      2 * haversineDistanceKm(origin, stop),
      10,
    );
  });
});
