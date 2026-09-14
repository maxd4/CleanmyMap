import { describe, expect, it } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import {
  createOperationalRouteFromRecommendation,
  getOperationalRouteLoopCount,
  getPublicOperationalRouteSegments,
  isOperationalRoute,
  normalizeActionPreparationData,
  normalizeOperationalRoute,
  removeOperationalRouteLoop,
  updateOperationalRouteZone,
} from "./route-operational";
import {
  MAX_OPERATIONAL_ROUTE_LOOPS,
  MAX_ROUTE_GEOMETRY_COORDINATES,
  MAX_ROUTE_GEOMETRY_LEGS,
  MAX_PLANNER_TECHNICAL_STOPS,
} from "./route-geometry-validation";

const geometry = createFallbackRouteGeometry([
  [48.85, 2.34],
  [48.851, 2.341],
  [48.85, 2.34],
]);

const recommendation = {
  generatedAt: "2026-09-14T10:00:00.000Z",
  groupCount: 2,
  routeGeometry: geometry,
  stops: [{
    id: "technical-1",
    label: "Stop technique",
    latitude: 48.851,
    longitude: 2.341,
    segmentKm: 0.2,
    estimatedMinutes: 4,
    priorityReason: "observed",
    score: 80,
  }],
  groupRoutes: [
    { groupIndex: 1, stops: [], routeGeometry: geometry },
    { groupIndex: 2, stops: [], routeGeometry: geometry },
  ],
} as const;

describe("operational route contract", () => {
  it("initializes operational loops with planner provenance only", () => {
    const operationalRoute = createOperationalRouteFromRecommendation(recommendation);

    expect(operationalRoute.version).toBe("operational-route-v1");
    expect(operationalRoute.state).toBe("planner_copy");
    expect(operationalRoute.plannerGroupCount).toBe(2);
    expect(operationalRoute.routes[0]?.plannerTechnicalStops).toEqual([]);
    expect(isOperationalRoute(operationalRoute)).toBe(true);
  });

  it("reads legacy actualRoute data and normalizes it without writing the old key", () => {
    const operationalRoute = createOperationalRouteFromRecommendation({
      ...recommendation,
      groupRoutes: [],
    });
    const legacy = {
      ...operationalRoute,
      version: "actual-route-v1" as const,
      updatedAt: undefined,
      state: undefined,
      routes: operationalRoute.routes.map((route) => ({
        ...route,
        technicalStops: route.plannerTechnicalStops,
        plannerTechnicalStops: undefined,
      })),
    };
    const normalized = normalizeActionPreparationData({ actualRoute: legacy });

    expect(normalized).not.toHaveProperty("actualRoute");
    expect(normalized.operationalRoute?.version).toBe("operational-route-v1");
    expect(normalized.operationalRoute?.routes[0]?.plannerTechnicalStops[0]?.id).toBe("technical-1");
    expect(normalizeOperationalRoute(legacy)?.state).toBe("planner_copy");
  });

  it("gives operationalRoute priority when both keys are present", () => {
    const operationalRoute = createOperationalRouteFromRecommendation(recommendation);
    const legacy = { ...operationalRoute, version: "actual-route-v1" as const };

    const normalized = normalizeActionPreparationData({
      operationalRoute,
      actualRoute: legacy,
    });

    expect(normalized.operationalRoute).toEqual(operationalRoute);
    expect(normalized).not.toHaveProperty("actualRoute");
  });

  it("edits zones and deletes loops while preserving plannerGroupCount", () => {
    const operationalRoute = createOperationalRouteFromRecommendation(recommendation);
    const edited = updateOperationalRouteZone(operationalRoute, "midpoint", {
      label: "Quai intermédiaire",
    });
    const oneLoop = removeOperationalRouteLoop(edited, "planner-group-2");
    const noLoops = removeOperationalRouteLoop(oneLoop, "planner-group-1");

    expect(edited.state).toBe("edited");
    expect(edited.updatedAt).not.toBe(edited.initializedAt);
    expect(oneLoop.routes).toHaveLength(1);
    expect(oneLoop.plannerGroupCount).toBe(2);
    expect(getOperationalRouteLoopCount(oneLoop)).toBe(1);
    expect(noLoops.routes).toEqual([]);
    expect(noLoops.plannerGroupCount).toBe(2);
    expect(getOperationalRouteLoopCount(noLoops)).toBeNull();
    expect(isOperationalRoute(noLoops)).toBe(true);
  });

  it("omits plannerTechnicalStops from public map segments", () => {
    const operationalRoute = createOperationalRouteFromRecommendation({
      ...recommendation,
      groupRoutes: [],
    });

    expect(getPublicOperationalRouteSegments(operationalRoute)).toEqual([
      { routeId: "planner-group-1", groupIndex: 1, coordinates: geometry.coordinates },
    ]);
  });

  it("rejects duplicate identifiers and malformed geometry", () => {
    const operationalRoute = createOperationalRouteFromRecommendation(recommendation);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: operationalRoute.routes.map((route) => ({ ...route, routeId: "same" })),
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: operationalRoute.routes.map((route) => ({ ...route, groupIndex: 1 })),
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{
        ...operationalRoute.routes[0]!,
        geometry: { ...geometry, coordinates: [[91, 0], [91, 0]] },
      }],
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{
        ...operationalRoute.routes[0]!,
        geometry: { ...geometry, legs: [{ ...geometry.legs[0]!, fromStopIndex: -1 }] },
      }],
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{
        ...operationalRoute.routes[0]!,
        geometry: { ...geometry, returnLeg: { ...geometry.legs[0]!, toStopIndex: 501 } },
      }],
    })).toBe(false);
  });

  it("enforces operational loop and technical-stop limits", () => {
    const operationalRoute = createOperationalRouteFromRecommendation(recommendation);
    const tooManyLoops = Array.from({ length: MAX_OPERATIONAL_ROUTE_LOOPS + 1 }, (_, index) => ({
      ...operationalRoute.routes[0]!,
      routeId: `route-${index}`,
      groupIndex: (index % 12) + 1,
    }));
    expect(isOperationalRoute({ ...operationalRoute, routes: tooManyLoops })).toBe(false);

    const tooManyStops = Array.from({ length: MAX_PLANNER_TECHNICAL_STOPS + 1 }, (_, index) => ({
      id: `stop-${index}`,
      label: "Stop",
      latitude: 48.85,
      longitude: 2.34,
    }));
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{ ...operationalRoute.routes[0]!, plannerTechnicalStops: tooManyStops }],
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{
        ...operationalRoute.routes[0]!,
        geometry: {
          ...geometry,
          coordinates: Array.from({ length: MAX_ROUTE_GEOMETRY_COORDINATES + 1 }, () => [48.85, 2.34] as [number, number]),
        },
      }],
    })).toBe(false);
    expect(isOperationalRoute({
      ...operationalRoute,
      routes: [{
        ...operationalRoute.routes[0]!,
        geometry: {
          ...geometry,
          legs: Array.from({ length: MAX_ROUTE_GEOMETRY_LEGS + 1 }, (_, index) => ({
            fromStopIndex: index,
            toStopIndex: index + 1,
            distanceKm: 0,
            estimatedMinutes: 0,
          })),
        },
      }],
    })).toBe(false);
  });
});
