import { describe, expect, it } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import {
  buildActualRouteGeometryFromDrawing,
  createActualRouteFromRecommendation,
  getActualRouteGroupCount,
  getPublicActualRouteSegments,
  isActualRoute,
  removeActualRouteLoop,
  replaceActualRouteLoop,
  updateActualRouteZone,
} from "./route-actual";

const geometry = createFallbackRouteGeometry([
  [48.85, 2.34],
  [48.851, 2.341],
  [48.85, 2.34],
]);

const recommendation = {
  generatedAt: "2026-09-14T10:00:00.000Z",
  groupCount: 2,
  routeGeometry: geometry,
  stops: [
    {
      id: "technical-1",
      label: "Stop technique",
      latitude: 48.851,
      longitude: 2.341,
      segmentKm: 0.2,
      estimatedMinutes: 4,
      priorityReason: "observed",
      score: 80,
    },
  ],
  groupRoutes: [
    {
      groupIndex: 1,
      volunteerCount: 2,
      candidateIds: ["technical-1"],
      targetCount: 1,
      reservedCandidateIds: [],
      stops: [],
      routeGeometry: geometry,
      travelDistanceKm: 0.2,
      travelMinutes: 4,
      travelBudgetMinutes: 60,
      withinBudget: true,
    },
    {
      groupIndex: 2,
      volunteerCount: 2,
      candidateIds: [],
      targetCount: 0,
      reservedCandidateIds: [],
      stops: [],
      routeGeometry: geometry,
      travelDistanceKm: 0.2,
      travelMinutes: 4,
      travelBudgetMinutes: 60,
      withinBudget: true,
    },
  ],
} as const;

describe("actual route contract", () => {
  it("initializes real loops from the planner without copying per-stop durations", () => {
    const actual = createActualRouteFromRecommendation(recommendation);

    expect(actual.routes).toHaveLength(2);
    expect(actual.routes[0]?.technicalStops).toEqual([]);
    expect(actual.routes[0]?.geometry.coordinates).toEqual(geometry.coordinates);
    expect(actual.routes[0]).not.toHaveProperty("stops.0.estimatedMinutes");
    expect(isActualRoute(actual)).toBe(true);
  });

  it("keeps technical stops in the trace but omits them from public segments", () => {
    const actual = createActualRouteFromRecommendation({
      ...recommendation,
      groupRoutes: [],
    });

    expect(actual.routes[0]?.technicalStops[0]?.id).toBe("technical-1");
    expect(getPublicActualRouteSegments(actual)).toEqual([
      { routeId: "planner-group-1", groupIndex: 1, coordinates: geometry.coordinates },
    ]);
  });

  it("supports editable zones, replacement and deletion of a loop", () => {
    const actual = createActualRouteFromRecommendation(recommendation);
    const withZones = updateActualRouteZone(actual, "midpoint", { label: "Quai intermédiaire" });
    const replaced = replaceActualRouteLoop(withZones, "planner-group-1", {
      ...geometry,
      coordinates: [[48.86, 2.35], [48.861, 2.351]],
    });
    const deleted = removeActualRouteLoop(replaced, "planner-group-2");

    expect(deleted.zones.midpoint.label).toBe("Quai intermédiaire");
    expect(deleted.routes).toHaveLength(1);
    expect(getActualRouteGroupCount(deleted)).toBe(1);
    expect(deleted.routes[0]?.geometry.coordinates[0]).toEqual([48.86, 2.35]);
  });

  it("converts an open user drawing into a closed actual loop without stop timings", () => {
    const geometryFromDrawing = buildActualRouteGeometryFromDrawing({
      kind: "polyline",
      coordinates: [
        [48.86, 2.35],
        [48.861, 2.351],
      ],
    });

    expect(geometryFromDrawing?.isLoop).toBe(true);
    expect(geometryFromDrawing?.coordinates).toEqual([
      [48.86, 2.35],
      [48.861, 2.351],
      [48.86, 2.35],
    ]);
    expect(geometryFromDrawing?.legs[0]).not.toHaveProperty("durationMinutes");
    expect(buildActualRouteGeometryFromDrawing({
      kind: "polygon",
      coordinates: [[48.86, 2.35], [48.861, 2.351]],
    })).toBeNull();
  });
});
