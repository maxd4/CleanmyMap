import { describe, expect, it } from "vitest";
import {
  CURRENT_ROUTE_DISTANCE_POLICY,
  CURRENT_ROUTE_DISTANCE_POLICY_VERSION,
  resolveRouteTargetDistance,
  resolveRouteTargetDistanceFromPreparationData,
} from "./route-target-distance";

describe("route target distance policy", () => {
  it("resolves 60 minutes to 1 km with route-distance-v1", () => {
    expect(
      resolveRouteTargetDistance({ durationMinutes: 60 }),
    ).toEqual({
      distanceKm: 1,
      source: "derived",
      policyVersion: CURRENT_ROUTE_DISTANCE_POLICY_VERSION,
    });
  });

  it("resolves 90 minutes to 1.5 km with route-distance-v1", () => {
    expect(resolveRouteTargetDistance({ durationMinutes: 90 }).distanceKm).toBe(1.5);
  });

  it("uses the same resolver regardless of route topology", () => {
    const loop = resolveRouteTargetDistanceFromPreparationData({
      durationMinutes: 90,
      preparationData: { routeTargetDistanceSource: "derived" },
    });
    const pointToPoint = resolveRouteTargetDistanceFromPreparationData({
      durationMinutes: 90,
      preparationData: { routeTargetDistanceSource: "derived" },
    });

    expect(pointToPoint).toEqual(loop);
  });

  it("preserves a manual override", () => {
    expect(
      resolveRouteTargetDistance({
        durationMinutes: 90,
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
      }),
    ).toEqual({ distanceKm: 2.25, source: "manual" });
  });

  it("recalculates derived values with a future policy without changing manual values", () => {
    const nextPolicy = {
      ...CURRENT_ROUTE_DISTANCE_POLICY,
      version: "route-distance-v2",
      kilometersPerHour: 2,
    };

    expect(
      resolveRouteTargetDistance({ durationMinutes: 90, policy: nextPolicy }),
    ).toEqual({
      distanceKm: 3,
      source: "derived",
      policyVersion: "route-distance-v2",
    });
    expect(
      resolveRouteTargetDistance({
        durationMinutes: 90,
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
        policy: nextPolicy,
      }),
    ).toEqual({ distanceKm: 2.25, source: "manual" });
  });

  it("treats legacy values without provenance as derived", () => {
    expect(
      resolveRouteTargetDistanceFromPreparationData({
        durationMinutes: 90,
        preparationData: { routeTargetDistanceKm: 2.25 },
      }),
    ).toEqual({
      distanceKm: 1.5,
      source: "derived",
      policyVersion: CURRENT_ROUTE_DISTANCE_POLICY_VERSION,
    });
  });
});
