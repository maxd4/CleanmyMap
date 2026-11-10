import { describe, expect, it } from "vitest";
import { selectSpogomiRouteForDivision, spogomiRouteCoverage, type SpogomiRouteProjection } from "./route-types";

const route = (division_id: string | null): SpogomiRouteProjection => ({
  id: `route-${division_id ?? "shared"}`, event_id: "event-1", action_id: "action-1", division_id,
  source: "gpx_reference", file_name: "route.gpx", point_count: 2, reference_distance_km: 1,
  inferred_topology: "point_to_point", geometry_geojson: { type: "LineString", coordinates: [[48, 2], [48.1, 2.1]] },
  route_version: 1, last_change_reason: null, reference_media_id: null, updated_at: "now", created_at: "now",
});

describe("SPOGOMI planned route division contract", () => {
  it("uses the exact division route and falls back to a historical shared route", () => {
    const shared = route(null);
    const casual = route("casual");
    expect(selectSpogomiRouteForDivision([shared, casual], "casual")?.id).toBe("route-casual");
    expect(selectSpogomiRouteForDivision([shared], "world")?.id).toBe("route-shared");
    expect(selectSpogomiRouteForDivision([], "casual")).toBeNull();
  });

  it.each([
    ["casual", [route("casual")], ["casual"], "separate"],
    ["mixed", [route(null)], ["casual", "world"], "shared"],
    ["mixed", [route("casual"), route("world")], ["casual", "world"], "separate"],
    ["mixed", [route("casual")], ["casual", "world"], "missing"],
  ] as const)("classifies %s route coverage", (mode, routes, divisions, expected) => {
    expect(spogomiRouteCoverage(routes, mode, divisions)).toBe(expected);
  });
});
