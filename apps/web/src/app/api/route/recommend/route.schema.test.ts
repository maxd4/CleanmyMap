import { describe, expect, it } from "vitest";
import type { RouteRecommendationRequest } from "@/lib/route/route-response-contract";
import {
  parseRouteRecommendationRequest,
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
      expect(parsed.data).toEqual(payload);
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
