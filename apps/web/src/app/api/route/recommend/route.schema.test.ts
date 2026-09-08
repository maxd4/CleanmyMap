import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  RouteRecommendationOrigin,
  RouteRecommendationRequest,
} from "@/lib/route/route-response-contract";
import {
  parseRouteRecommendationRequest,
  type RouteRecommendationOptions,
  resolvePriorityVsTravel,
  routeRecommendationRequestSchema,
} from "./route.schema";

describe("route recommendation HTTP request schema", () => {
  it("accepts the shared HTTP request fields and keeps the legacy alias", () => {
    const payload = {
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      travelBudgetMinutes: 42,
      maxStops: 4,
      priorityVsTravel: 23,
    } satisfies RouteRecommendationRequest;

    const parsed = routeRecommendationRequestSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        ...payload,
        planningMode: { type: "free" },
        riskFocus: "all",
        pickupPreference: "balanced",
        volunteers: 1,
        groupCount: 1,
      });
      expectTypeOf(parsed.data.travelBudgetMinutes).toEqualTypeOf<number>();
      expectTypeOf(parsed.data.maxStops).toEqualTypeOf<number>();
    }

    const legacyAlias = parseRouteRecommendationRequest({
      priorityVsDistance: 31,
      maxStops: 1,
    });
    expect(legacyAlias.success).toBe(true);
    if (legacyAlias.success) {
      expect(resolvePriorityVsTravel(legacyAlias.data)).toBe(31);
    }
  });

  it("normalizes defaulted fields while preserving optional input fields", () => {
    const parsed = parseRouteRecommendationRequest({});

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.travelBudgetMinutes).toBe(60);
      expect(parsed.data.maxStops).toBe(6);
      expect(parsed.data.origin).toBeUndefined();
      expect(parsed.data.priorityVsTravel).toBeUndefined();
      expect(parsed.data.priorityVsDistance).toBeUndefined();
      expect(parsed.data.volunteers).toBe(1);
      expect(parsed.data.groupCount).toBe(1);
      expect(parsed.data.pickupPreference).toBe("balanced");
    }

    expectTypeOf<RouteRecommendationOptions["travelBudgetMinutes"]>().toEqualTypeOf<number>();
    expectTypeOf<RouteRecommendationOptions["maxStops"]>().toEqualTypeOf<number>();
    expectTypeOf<RouteRecommendationOptions["origin"]>().toEqualTypeOf<
      RouteRecommendationOrigin | undefined
    >();
    expectTypeOf<RouteRecommendationOptions["priorityVsTravel"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<RouteRecommendationOptions["priorityVsDistance"]>().toEqualTypeOf<
      number | undefined
    >();
  });

  it("uses explicit values instead of defaults", () => {
    const parsed = routeRecommendationRequestSchema.parse({
      travelBudgetMinutes: 42,
      maxStops: 3,
    });

    expect(parsed.travelBudgetMinutes).toBe(42);
    expect(parsed.maxStops).toBe(3);
  });

  it("accepts waste and cigarette-butts preferences", () => {
    expect(parseRouteRecommendationRequest({ pickupPreference: "waste" }).data?.pickupPreference).toBe("waste");
    expect(parseRouteRecommendationRequest({ pickupPreference: "cigarette_butts" }).data?.pickupPreference).toBe("cigarette_butts");
  });

  it("rejects an invalid pickup preference", () => {
    expect(parseRouteRecommendationRequest({ pickupPreference: "profile" }).success).toBe(false);
  });

  it("accepts a bounded multi-group contract", () => {
    const parsed = parseRouteRecommendationRequest({ volunteers: 11, groupCount: 3 });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.volunteers).toBe(11);
      expect(parsed.data.groupCount).toBe(3);
    }
  });

  it("rejects group counts larger than the volunteer count and unsafe bounds", () => {
    expect(parseRouteRecommendationRequest({ volunteers: 2, groupCount: 3 }).success).toBe(false);
    expect(parseRouteRecommendationRequest({ volunteers: 0, groupCount: 1 }).success).toBe(false);
    expect(parseRouteRecommendationRequest({ volunteers: 101, groupCount: 1 }).success).toBe(false);
  });

  it("rejects invalid HTTP values while stripping non-contract fields", () => {
    const invalid = parseRouteRecommendationRequest({
      id: 7,
      options: { priorityVsTravel: 20 },
      maxStops: 0,
    });
    expect(invalid.success).toBe(false);

    const stripped = routeRecommendationRequestSchema.parse({
      id: 7,
      options: { priorityVsTravel: 20 },
      maxStops: 2,
    });
    expect(stripped).not.toHaveProperty("id");
    expect(stripped).not.toHaveProperty("options");
  });

  it("rejects an origin outside the shared HTTP origin contract", () => {
    expect(
      parseRouteRecommendationRequest({
        origin: { latitude: 48.85, longitude: 2.35, source: "approximate_saved_area" },
      }).success,
    ).toBe(false);
  });
});
