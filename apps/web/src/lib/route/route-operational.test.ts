import { describe, expect, it } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import {
  MANUAL_MEETING_POINT_MAX_DISTANCE_METERS,
  createOperationalRouteFromRecommendation,
  createPlannerActionPreparationData,
  getOperationalRouteMeetingPoint,
  getOperationalRouteLoopCount,
  getPublicOperationalRouteSegments,
  isOperationalRoute,
  normalizeActionPreparationData,
  normalizeOperationalRoute,
  removeOperationalRouteLoop,
  projectMeetingPointFromGeometry,
  updateOperationalRouteZone,
} from "./route-operational";
import { haversineDistanceKm } from "@/lib/geo/geodesic-distance";
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
  it("projects an irregular loop at 50% of cumulative distance, not the central coordinate", () => {
    const irregularGeometry = {
      ...geometry,
      coordinates: [
        [48.85, 2.34],
        [48.851, 2.34],
        [48.86, 2.34],
        [48.861, 2.34],
      ] as [number, number][],
      durationMinutes: 100,
    };
    const projection = projectMeetingPointFromGeometry(irregularGeometry);

    expect(projection).not.toBeNull();
    expect(projection?.progress).toBe(0.5);
    expect(projection?.estimatedDurationMinutes).toBe(50);
    expect(projection?.coordinates[0]).toBeGreaterThan(48.851);
    expect(projection?.coordinates[0]).toBeLessThan(48.86);
    expect(projection?.provenance).toBe("final_geometry_midpoint");
  });

  it("keeps one midpoint owner for one route and no ambiguous shared point for independent groups", () => {
    const single = createOperationalRouteFromRecommendation({ ...recommendation, groupCount: 1, groupRoutes: [] });
    expect(single.zones.midpoint.coordinate).not.toBeNull();
    expect(single.zones.midpoint.provenance).toBe("final_geometry_midpoint");
    expect(getOperationalRouteMeetingPoint(single)?.coordinates).toEqual(single.zones.midpoint.coordinate);

    const multi = createOperationalRouteFromRecommendation(recommendation);
    expect(multi.zones.midpoint.coordinate).toBeNull();
    expect(getOperationalRouteMeetingPoint(multi)).toBeNull();
    expect(getOperationalRouteMeetingPoint(multi, multi.routes[0])?.provenance).toBe("final_geometry_midpoint");
  });

  it("falls back to the final geometry when a legacy route has no zones", () => {
    const legacyRoute = {
      routes: [{
        routeId: "legacy-route",
        groupIndex: 1,
        geometry,
        plannerTechnicalStops: [],
      }],
    } as unknown as Parameters<typeof getOperationalRouteMeetingPoint>[0];

    expect(getOperationalRouteMeetingPoint(legacyRoute)?.provenance).toBe("final_geometry_midpoint");
  });

  it("preserves a manually edited midpoint and invalidates derived metrics when it is off trace", () => {
    const single = createOperationalRouteFromRecommendation({ ...recommendation, groupCount: 1, groupRoutes: [] });
    const edited = updateOperationalRouteZone(single, "midpoint", {
      coordinate: [48.855, 2.4],
    });

    expect(edited.zones.midpoint.coordinate).toEqual([48.855, 2.4]);
    expect(edited.zones.midpoint.provenance).toBe("manual_midpoint");
    expect(getOperationalRouteMeetingPoint(edited)).toMatchObject({
      coordinates: [48.855, 2.4],
      cumulativeDistanceKm: null,
      progress: null,
      estimatedDurationMinutes: null,
      provenance: "manual_midpoint",
    });
  });

  it("projects manual midpoints on vertices and segments within the metric tolerance", () => {
    const manualGeometry = {
      ...geometry,
      coordinates: [
        [48.85, 2.34],
        [48.851, 2.341],
        [48.852, 2.342],
      ] as [number, number][],
      durationMinutes: 40,
    };
    const firstSegmentKm = haversineDistanceKm(manualGeometry.coordinates[0]!, manualGeometry.coordinates[1]!);
    const vertex = projectMeetingPointFromGeometry(manualGeometry, {
      coordinate: manualGeometry.coordinates[1],
      provenance: "manual_midpoint",
    });
    const segment = projectMeetingPointFromGeometry(manualGeometry, {
      coordinate: [48.8505, 2.3405],
      provenance: "manual_midpoint",
    });

    expect(vertex).toMatchObject({
      coordinates: manualGeometry.coordinates[1],
      provenance: "manual_midpoint",
    });
    expect(vertex?.cumulativeDistanceKm).toBeCloseTo(firstSegmentKm, 6);
    expect(vertex?.progress).toBeCloseTo(0.5, 5);
    expect(vertex?.estimatedDurationMinutes).toBeCloseTo(20, 3);
    expect(segment).toMatchObject({
      coordinates: [48.8505, 2.3405],
      provenance: "manual_midpoint",
    });
    expect(segment?.cumulativeDistanceKm).toBeCloseTo(firstSegmentKm / 2, 6);
    expect(segment?.progress).toBeCloseTo(0.25, 5);
    expect(segment?.estimatedDurationMinutes).toBeCloseTo(10, 3);
    expect(MANUAL_MEETING_POINT_MAX_DISTANCE_METERS).toBe(10);
  });

  it("preserves an off-trace manual coordinate while leaving all derived metrics unknown", () => {
    const manualGeometry = {
      ...geometry,
      coordinates: [[48.85, 2.34], [48.851, 2.341]] as [number, number][],
      durationMinutes: 40,
    };
    const projection = projectMeetingPointFromGeometry(manualGeometry, {
      coordinate: [48.8505, 2.3407],
      provenance: "manual_midpoint",
    });

    expect(projection).toMatchObject({
      coordinates: [48.8505, 2.3407],
      cumulativeDistanceKm: null,
      progress: null,
      estimatedDurationMinutes: null,
      provenance: "manual_midpoint",
    });
  });

  it("clears manual provenance when a midpoint is deleted and restores a derived projection", () => {
    const single = createOperationalRouteFromRecommendation({ ...recommendation, groupCount: 1, groupRoutes: [] });
    const manual = updateOperationalRouteZone(single, "midpoint", {
      coordinate: [48.8505, 2.3405],
    });
    const cleared = updateOperationalRouteZone(manual, "midpoint", { coordinate: null });
    const projection = getOperationalRouteMeetingPoint(cleared);

    expect(cleared.zones.midpoint.coordinate).toBeNull();
    expect(cleared.zones.midpoint.provenance).toBeUndefined();
    expect(projection?.provenance).toBe("final_geometry_midpoint");
    expect(projection?.coordinates).not.toEqual([48.8505, 2.3405]);
  });

  it("returns no projection for an unreliable trace", () => {
    expect(projectMeetingPointFromGeometry({ coordinates: [[91, 0], [91, 0]], durationMinutes: 20 })).toBeNull();
    expect(projectMeetingPointFromGeometry({ coordinates: [[48.85, 2.34], [48.85, 2.34]], durationMinutes: 20 })).toBeNull();
  });

  it("transfers only known planner preparation values without observations", () => {
    const preparation = createPlannerActionPreparationData(
      {
        origin: { latitude: 48.85, longitude: 2.34, source: "map" },
        volunteers: 8,
        actionMinutesEstimate: 45,
        operationalBudget: undefined,
      },
      {
        scheduledStartAt: "2026-09-20T09:30",
        scheduledEndAt: "2026-09-20T11:00",
      },
    );

    expect(preparation).toEqual({
      pointDeRendezVous: "Coordonnées du départ : 48.850000, 2.340000",
      actionDate: "2026-09-20",
      meetingTime: "09:30",
      departureTime: "09:30",
      estimatedDurationMinutes: 45,
      routeTargetDistanceKm: 0.75,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v1",
      volunteersExpected: 8,
    });
    expect(preparation).not.toHaveProperty("wasteKg");
    expect(preparation).not.toHaveProperty("cigaretteButts");
    expect(preparation).not.toHaveProperty("routeCalibrationContext");
  });

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

  it("reads legacy creatorRole without carrying it into normalized persistence data", () => {
    const normalized = normalizeActionPreparationData({
      creatorRole: "organisateur",
    });

    expect(normalized).not.toHaveProperty("creatorRole");
  });

  it("uses the server-managed active route for normalized reads", () => {
    const storedRoute = createOperationalRouteFromRecommendation(recommendation);
    const activeRoute = updateOperationalRouteZone(storedRoute, "midpoint", {
      label: "Itinéraire actif",
    });
    const normalized = normalizeActionPreparationData({
      operationalRoute: storedRoute,
      routeVersioning: {
        schemaVersion: "action-route-versioning-v1",
        active: { operationalRoute: activeRoute },
        history: [],
      },
    });

    expect(normalized.operationalRoute).toEqual(activeRoute);
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
    expect(operationalRoute.routes).toHaveLength(2);
    expect(operationalRoute.state).toBe("planner_copy");
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
