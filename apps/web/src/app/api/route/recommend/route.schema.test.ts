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
import {
  createDefaultRouteTerritorialGuidedMode,
  ROUTE_TERRITORIAL_GUIDED_VERSION,
} from "@/lib/route/route-planning-mode";

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

  it("accepts an equal territorial-guided plan and preserves waypoint order", () => {
    const parsed = parseRouteRecommendationRequest({
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      volunteers: 10,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: 48.8566, longitude: 2.3522 }, radiusKm: 1 },
            waypoints: [
              { id: "north-1", label: "Nord 1", latitude: 48.857, longitude: 2.3522 },
              { id: "north-2", label: "Nord 2", latitude: 48.8566, longitude: 2.36 },
            ],
          },
          {
            sector: { center: { latitude: 48.8566, longitude: 2.3522 }, radiusKm: 1 },
            waypoints: [
              { id: "south-1", label: "Sud 1", latitude: 48.856, longitude: 2.3522 },
            ],
          },
        ],
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.planningMode.type).toBe("territorial-guided");
      if (parsed.data.planningMode.type === "territorial-guided") {
        expect(parsed.data.planningMode.groups[0]?.waypoints.map(({ id }) => id)).toEqual([
          "north-1",
          "north-2",
        ]);
      }
    }
  });

  it.each([
    [1, 1],
    [3, 2],
    [7, 3],
    [10, 2],
  ] as const)("accepts the default guided payload for %i volunteers and %i groups", (volunteers, groupCount) => {
    const planningMode = createDefaultRouteTerritorialGuidedMode(volunteers, groupCount);
    const parsed = parseRouteRecommendationRequest({
      volunteers,
      groupCount,
      planningMode,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.planningMode.type === "territorial-guided") {
      expect(parsed.data.planningMode.groups.map(({ volunteerCount }) => volunteerCount)).toEqual(
        planningMode.groups.map(({ volunteerCount }) => volunteerCount),
      );
    }
  });

  it.each([
    ["invalid coordinate", { latitude: 91, longitude: 2.35 }],
    ["zero radius", { latitude: 48.85, longitude: 2.35, radiusKm: 0 }],
  ])("rejects a guided plan with %s", (_label, value) => {
    const payload = {
      volunteers: 10,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: {
              center: { latitude: 48.85, longitude: 2.35 },
              radiusKm: "radiusKm" in value ? value.radiusKm : 1,
            },
            waypoints: [{ id: "point-1", label: "Point", latitude: value.latitude, longitude: value.longitude }],
          },
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
            waypoints: [{ id: "point-2", label: "Point 2", latitude: 48.85, longitude: 2.351 }],
          },
        ],
      },
    };
    expect(parseRouteRecommendationRequest(payload).success).toBe(false);
  });

  it("rejects a guided budget whose declared parts do not fill the slot", () => {
    const parsed = parseRouteRecommendationRequest({
      volunteers: 10,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 44,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
            waypoints: [{ id: "one", label: "One", latitude: 48.85, longitude: 2.35 }],
          },
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
            waypoints: [{ id: "two", label: "Two", latitude: 48.85, longitude: 2.35 }],
          },
        ],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects guided waypoints outside their sector or an unequal split", () => {
    const outside = parseRouteRecommendationRequest({
      volunteers: 10,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 0.1 },
            waypoints: [{ id: "outside", label: "Outside", latitude: 48.86, longitude: 2.35 }],
          },
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 0.1 },
            waypoints: [{ id: "inside", label: "Inside", latitude: 48.85, longitude: 2.35 }],
          },
        ],
      },
    });
    expect(outside.success).toBe(false);

    const unequal = parseRouteRecommendationRequest({
      volunteers: 11,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
            waypoints: [{ id: "one", label: "One", latitude: 48.85, longitude: 2.35 }],
          },
          {
            sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
            waypoints: [{ id: "two", label: "Two", latitude: 48.85, longitude: 2.35 }],
          },
        ],
      },
    });
    expect(unequal.success).toBe(false);
  });

  it("accepts an optional local weather window without making it a route constraint", () => {
    const parsed = parseRouteRecommendationRequest({
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scheduledStartAt).toBe("2026-09-15T10:00");
      expect(parsed.data.scheduledEndAt).toBe("2026-09-15T12:00");
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
