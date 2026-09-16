import { describe, expect, it, vi } from "vitest";
import {
  ACTION_ROUTE_GPX_FILENAME,
  buildActionRouteGpxDocument,
  buildActionRouteGpxInput,
} from "./action-route-gpx";
import type { OperationalRoute } from "@/lib/route/route-operational";

const finalCoordinates: [number, number][] = [
  [48.85, 2.35],
  [48.86, 2.36],
  [48.85, 2.35],
];

const operationalRoute: OperationalRoute = {
  version: "operational-route-v1",
  initializedAt: "2026-09-16T10:00:00.000Z",
  updatedAt: "2026-09-16T10:05:00.000Z",
  source: "planner",
  state: "edited",
  plannerGroupCount: 1,
  routes: [
    {
      routeId: "planner-group-1",
      groupIndex: 1,
      geometry: {
        isLoop: true,
        origin: finalCoordinates[0]!,
        returnLeg: null,
        coordinates: finalCoordinates,
        distanceKm: 1.5,
        durationMinutes: 30,
        legs: [],
        provider: "fossgis-osrm",
        profile: "foot",
        mode: "network",
        estimated: false,
      },
      plannerTechnicalStops: [
        { id: "stop-1", label: "Stop CleanMyMap", latitude: 48.86, longitude: 2.36 },
      ],
    },
  ],
  zones: {
    departure: { label: "Départ", coordinate: finalCoordinates[0]! },
    midpoint: { label: "Mi-parcours", coordinate: [48.855, 2.355] },
    arrival: { label: "Arrivée", coordinate: finalCoordinates.at(-1)! },
  },
};

describe("action-route-gpx export adapter", () => {
  it("does not expose an export without a usable final geometry", () => {
    expect(buildActionRouteGpxInput({})).toBeNull();
    expect(
      buildActionRouteGpxInput({
        drawing: { coordinates: [[48.85, 2.35]] },
        routeTopology: "point_to_point",
      }),
    ).toBeNull();
  });

  it("uses the operational route instead of a stale drawing and keeps its waypoints", () => {
    const xml = buildActionRouteGpxDocument({
      operationalRoute,
      drawing: { coordinates: [[1, 1], [2, 2]] },
      departureLabel: "Départ réel",
      arrivalLabel: "Arrivée réelle",
    });

    expect(xml).toContain('lat="48.85" lon="2.35"');
    expect(xml).toContain('lat="48.86" lon="2.36"');
    expect(xml).toContain("Stop CleanMyMap");
    expect(xml).toContain("Mi-parcours");
    expect(xml).not.toContain('lat="1" lon="1"');
    expect(xml).not.toContain('lat="2" lon="2"');
    expect(xml).toContain("<name>Itinéraire CleanMyMap</name>");
    expect(xml).not.toContain("routeTargetDistance");
  });

  it("keeps multiple final operational routes as separate GPX tracks", () => {
    const second = structuredClone(operationalRoute.routes[0]!);
    second.routeId = "planner-group-2";
    second.groupIndex = 2;
    second.geometry.coordinates = [[48.9, 2.4], [48.91, 2.41]];
    second.geometry.isLoop = false;
    second.geometry.origin = [48.9, 2.4];

    const xml = buildActionRouteGpxDocument({
      operationalRoute: {
        ...operationalRoute,
        plannerGroupCount: 2,
        routes: [operationalRoute.routes[0]!, second],
      },
    });

    expect(xml?.match(/<trk>/g)).toHaveLength(2);
    expect(xml).toContain('lat="48.9" lon="2.4"');
    expect(xml).toContain('lat="48.91" lon="2.41"');
    expect(xml).not.toContain('lon="2.35"></trkpt>\n        <trkpt lat="48.9"');
  });

  it("keeps fallback and GPX import sources identifiable without routing", () => {
    const fallbackXml = buildActionRouteGpxDocument({
      operationalRoute: {
        ...operationalRoute,
        routes: operationalRoute.routes.map((route) => ({
          ...route,
          geometry: { ...route.geometry, mode: "fallback", estimated: true, provider: "none" },
        })),
      },
    });
    const importedXml = buildActionRouteGpxDocument({
      drawing: { coordinates: [[48.85, 2.35], [48.87, 2.37]] },
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 2,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
      routeTopology: "point_to_point",
    });

    expect(fallbackXml).toContain("Tracé estimé CleanMyMap");
    expect(importedXml).toContain("Tracé GPX importé");
    expect(importedXml).toContain('lat="48.85" lon="2.35"');
    expect(importedXml).toContain('lat="48.87" lon="2.37"');
  });

  it("is deterministic and does not call the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const input = { operationalRoute };
    expect(buildActionRouteGpxDocument(input)).toBe(buildActionRouteGpxDocument(input));
    expect(ACTION_ROUTE_GPX_FILENAME).toBe("cleanmymap-itineraire.gpx");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
