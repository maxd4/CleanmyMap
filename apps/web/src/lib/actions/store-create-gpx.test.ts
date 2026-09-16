import { describe, expect, it, vi } from "vitest";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/route/fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
}));

import type { ActionDrawing, CreateActionPayload } from "./types";
import {
  buildActionInsertPayload,
  buildCreateActionGeometry,
  resolveCreateActionDrawing,
} from "./store";

const gpxDrawing: ActionDrawing = {
  kind: "polyline" as const,
  coordinates: [
    [48.85, 2.35] as [number, number],
    [48.86, 2.36],
    [48.85, 2.35],
  ],
};

function buildGpxPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    associationName: "Action spontanée",
    actionDate: "2026-04-22",
    locationLabel: "Paris",
    departureLocationLabel: "Paris",
    routeTopology: "loop",
    routeTargetDistanceKm: 2,
    preparationData: {
      routeTopology: "loop",
      routeTargetDistanceKm: 2,
      routeTargetDistanceSource: "manual",
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 999,
        pointCount: 999,
        inferredTopology: "loop",
        fileName: "route.gpx",
      },
    },
    manualDrawing: {
      kind: gpxDrawing.kind,
      coordinates: gpxDrawing.coordinates.map(([latitude, longitude]) => [latitude, longitude] as [number, number]),
    },
    geometrySource: "gpx_import",
    wasteKg: null,
    cigaretteButts: null,
    volunteersCount: 1,
    durationMinutes: 60,
    ...overrides,
  };
}

describe("GPX create-action priority", () => {
  it("uses the imported trace and never calls the routing provider", async () => {
    const result = await resolveCreateActionDrawing(buildGpxPayload());

    expect(result).toMatchObject({
      drawing: gpxDrawing,
      geometrySource: "gpx_import",
      routeGeometry: null,
      origin: gpxDrawing.coordinates[0],
    });
    expect(routeProviderMock).not.toHaveBeenCalled();
  });

  it("keeps GPX provenance and recalculates observed distance independently of the target", () => {
    const payload = buildGpxPayload();
    const geometry = buildCreateActionGeometry(payload, gpxDrawing, "gpx_import");
    const row = buildActionInsertPayload({
      userId: "user-test",
      payload,
      persistedGeometry: geometry,
      finalDrawing: gpxDrawing,
      routeGeometry: null,
      status: "pending",
    });

    expect(geometry.geometrySource).toBe("gpx_import");
    expect(row.geometry_source).toBe("gpx_import");
    expect(row.preparation_data.routeTargetDistanceKm).toBe(2);
    expect(row.preparation_data.routeObservedDistanceKm).toBeGreaterThan(0);
    expect(row.preparation_data.routeObservedDistanceKm).not.toBe(2);
    expect(row.preparation_data.gpxImport).toMatchObject({
      source: "gpx_import",
      pointCount: 3,
      fileName: "route.gpx",
    });
    expect(row.preparation_data.gpxImport?.observedDistanceKm).toBe(
      row.preparation_data.routeObservedDistanceKm,
    );
  });
});
