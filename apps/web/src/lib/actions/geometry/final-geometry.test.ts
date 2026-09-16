import { describe, expect, it } from "vitest";
import {
  hydrateActionEditorGeometry,
  resolveFinalActionGeometry,
} from "./final-geometry";
import type { OperationalRoute } from "@/lib/route/route-operational";

const gpxDrawing = {
  kind: "polyline" as const,
  coordinates: [[48.85, 2.35], [48.86, 2.36]] as [number, number][],
};

const manualDrawing = {
  kind: "polyline" as const,
  coordinates: [[48.8, 2.3], [48.81, 2.31]] as [number, number][],
};

const operationalRoute: OperationalRoute = {
  version: "operational-route-v1",
  initializedAt: "2026-09-16T10:00:00.000Z",
  updatedAt: "2026-09-16T10:05:00.000Z",
  source: "planner",
  state: "edited",
  plannerGroupCount: 1,
  routes: [{
    routeId: "planner-group-1",
    groupIndex: 1,
    geometry: {
      isLoop: true,
      origin: [48.7, 2.2],
      returnLeg: null,
      coordinates: [[48.7, 2.2], [48.71, 2.21]],
      distanceKm: 1,
      durationMinutes: 20,
      legs: [],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    },
    plannerTechnicalStops: [],
  }],
  zones: {
    departure: { label: "Départ", coordinate: [48.7, 2.2] },
    midpoint: { label: "Mi-parcours", coordinate: [48.705, 2.205] },
    arrival: { label: "Arrivée", coordinate: [48.7, 2.2] },
  },
};

describe("resolveFinalActionGeometry", () => {
  it("selects GPX over manual and operational geometry", () => {
    const result = resolveFinalActionGeometry({
      gpxDrawing,
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
      manualDrawing,
      operationalRoute,
    });

    expect(result).toMatchObject({ source: "gpx_import", operationalRoute: null });
    expect(result?.drawing).toEqual(gpxDrawing);
  });

  it("selects manual before the operational route", () => {
    const result = resolveFinalActionGeometry({ manualDrawing, operationalRoute });

    expect(result?.source).toBe("manual");
    expect(result?.drawing).toEqual(manualDrawing);
  });

  it("selects the operational route when no real drawing is active", () => {
    const result = resolveFinalActionGeometry({ operationalRoute });

    expect(result?.source).toBe("routed");
    expect(result?.operationalRoute).toEqual(operationalRoute);
    expect(result?.drawing.coordinates).toEqual(operationalRoute.routes[0]?.geometry.coordinates);
  });

  it("does not create an active GPX geometry from orphaned metadata", () => {
    const result = resolveFinalActionGeometry({
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
      operationalRoute,
    });

    expect(result?.source).toBe("routed");
  });

  it("keeps persisted routed geometry out of the manual candidate", () => {
    const result = resolveFinalActionGeometry({
      manualDrawing,
      manualDrawingSource: "routed",
    });

    expect(result?.source).toBe("routed");
    expect(result?.drawing).toEqual(manualDrawing);
  });

  it("prioritizes operational geometry over an older persisted route", () => {
    const result = resolveFinalActionGeometry({
      manualDrawing,
      manualDrawingSource: "routed",
      operationalRoute,
    });

    expect(result?.source).toBe("routed");
    expect(result?.operationalRoute).toEqual(operationalRoute);
    expect(result?.drawing).not.toEqual(manualDrawing);
  });

  it("hydrates manual, persisted and GPX records into distinct candidates", () => {
    const manual = hydrateActionEditorGeometry({
      drawing: manualDrawing,
      geometrySource: "manual",
    });
    expect(manual.manualDrawing).toEqual(manualDrawing);
    expect(manual.reconstructedDrawing).toBeNull();

    const persisted = hydrateActionEditorGeometry({
      drawing: manualDrawing,
      geometrySource: "reference",
    });
    expect(persisted.manualDrawing).toBeNull();
    expect(persisted.reconstructedDrawing).toEqual(manualDrawing);
    expect(persisted.finalGeometry?.source).toBe("reference");

    const gpx = hydrateActionEditorGeometry({
      drawing: gpxDrawing,
      geometrySource: "gpx_import",
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
      operationalRoute,
    });
    expect(gpx.finalGeometry?.source).toBe("gpx_import");
    expect(gpx.manualDrawingSource).toBe("gpx_import");
  });
});
