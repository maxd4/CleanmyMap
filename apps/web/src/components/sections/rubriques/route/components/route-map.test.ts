import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type { RouteGroupRoute } from "@/lib/route/route-response-contract";
import type { RouteRiskHeatmap } from "@/lib/route/route-risk-heatmap-contract";

vi.mock("react-leaflet", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);
  return {
    CircleMarker: passthrough,
    Circle: passthrough,
    MapContainer: passthrough,
    Marker: ({
      children,
      position,
      icon,
    }: {
      children?: React.ReactNode;
      position?: [number, number];
      icon?: { options?: { className?: string } };
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": icon?.options?.className?.includes("origin")
            ? "route-origin"
            : "route-stop",
          "data-position": position?.join(","),
        },
        children,
      ),
    Polyline: ({
      children,
      positions,
      pathOptions,
    }: {
      children?: React.ReactNode;
      positions?: [number, number][];
      pathOptions?: { color?: string; dashArray?: string };
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": "route-line",
          "data-points": positions?.length,
          "data-color": pathOptions?.color,
          "data-dash": pathOptions?.dashArray,
        },
        children,
      ),
    Popup: passthrough,
    TileLayer: passthrough,
    Tooltip: passthrough,
    useMap: () => ({ fitBounds: vi.fn() }),
    useMapEvents: (handlers: unknown) => {
      capturedMapHandlers = handlers as typeof capturedMapHandlers;
      return null;
    },
  };
});

vi.mock("leaflet", () => ({
  divIcon: vi.fn((options) => ({ options })),
}));

import { buildRouteMapCoordinates, RouteMap } from "./route-map";

let capturedMapHandlers: {
  click?: (event: { latlng: { lat: number; lng: number } }) => void;
} | null = null;

const stops: RouteStop[] = [
  {
    id: "spot-a",
    label: "A",
    latitude: 48.85,
    longitude: 2.35,
    segmentKm: 0,
    estimatedMinutes: 20,
    priorityReason: "fresh",
    score: 90,
  },
  {
    id: "spot-b",
    label: "B",
    latitude: 48.86,
    longitude: 2.36,
    segmentKm: 1,
    estimatedMinutes: 8,
    priorityReason: "fresh",
    score: 80,
  },
];

const networkGeometry: RouteGeometry = {
  isLoop: true,
  origin: [48.87, 2.37],
  returnLeg: { fromStopIndex: 2, toStopIndex: 3, distanceKm: 1.4, estimatedMinutes: 12 },
  coordinates: [
    [48.87, 2.37],
    [48.855, 2.355],
    [48.86, 2.36],
    [48.87, 2.37],
  ],
  distanceKm: 1.4,
  durationMinutes: 12,
  legs: [],
  provider: "osrm",
  profile: "foot",
  mode: "network",
  estimated: false,
};

const riskHeatmap = {
  schemaVersion: "route-risk-heatmap-v1",
  projectionKey: "paris-pantheon-jardin-des-plantes",
  projectionVersionId: "projection-1",
  networkVersionId: "network-1",
  generatedAt: "2026-11-04T10:00:00.000Z",
  sourceVersions: { riskModelVersion: "risk-v3", pressureRefreshedAt: "2026-11-04T09:00:00.000Z" },
  counts: { sourceEdges: 1, projectedSegments: 1, predictedSegments: 1, unavailableSegments: 0, zonesIntersected: 1 },
  segments: [{
    projectionSegmentId: "risk-1",
    coordinates: [[48.85, 2.35], [48.851, 2.351]],
    lengthM: 100,
    zoneId: "iris-1",
    intersectedZoneIds: ["iris-1"],
    effectiveResolution: "iris",
    riskStatus: "predicted",
    wasteRisk: 80,
    cigaretteButtRisk: 25,
    mixedRisk: 52,
    wasteConfidence: { level: "medium", score: 0.7 },
    cigaretteButtConfidence: { level: "low", score: 0.4 },
    sourceVersions: { riskModelVersion: "risk-v3", pressureRefreshedAt: "2026-11-04T09:00:00.000Z" },
    provenance: ["pressure_snapshot"],
    notes: [],
  }],
} as unknown as RouteRiskHeatmap;

function groupRoute(groupIndex: number, mode: RouteGeometry["mode"] = "network"): RouteGroupRoute {
  return {
    groupIndex,
    volunteerCount: 4,
    origin: { latitude: 48.87, longitude: 2.37, source: "browser" },
    candidateIds: [`group-${groupIndex}-spot`],
    estimatedDistanceKm: 1.4,
    estimatedDurationMinutes: 12,
    targetCount: 1,
    reservedCandidateIds: [],
    stops,
    routeGeometry: { ...networkGeometry, mode },
    travelDistanceKm: 1.4,
    travelMinutes: 12,
    travelBudgetMinutes: 60,
    withinBudget: true,
  };
}

describe("RouteMap", () => {
  it("renders one numbered stop marker and one line for the selected route", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops,
        routeGeometry: networkGeometry,
        fr: true,
      }),
    );

    expect(markup.match(/data-testid="route-stop"/g)).toHaveLength(2);
    expect(markup).toContain('data-testid="route-line"');
    expect(networkGeometry.coordinates[0]).toEqual(networkGeometry.coordinates.at(-1));
    expect(markup).toContain("Réseau · OSRM · profil configuré: foot");
    expect(buildRouteMapCoordinates(stops, networkGeometry)).toHaveLength(6);
  });

  it("renders a distinct origin marker and reports map clicks as ephemeral origins", () => {
    const onSelectOrigin = vi.fn();
    const origin = { latitude: 48.87, longitude: 2.37, source: "map" as const };
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: {
          ...networkGeometry,
          isLoop: true,
          coordinates: [],
          mode: "fallback",
          provider: "none",
          profile: null,
        },
        origin,
        onSelectOrigin,
        fr: true,
      }),
    );

    expect(markup).toContain('data-testid="route-origin"');
    expect(buildRouteMapCoordinates([], networkGeometry, origin)).toEqual([
      [48.87, 2.37],
      ...networkGeometry.coordinates,
    ]);
    capturedMapHandlers?.click?.({ latlng: { lat: 48.88, lng: 2.38 } });
    expect(onSelectOrigin).toHaveBeenCalledWith({
      latitude: 48.88,
      longitude: 2.38,
      source: "map",
    });
  });

  it("marks a fallback route explicitly and still renders the stop line", () => {
    const fallbackGeometry: RouteGeometry = {
      ...networkGeometry,
      isLoop: true,
      coordinates: [],
      provider: "none",
      profile: null,
      mode: "fallback",
      estimated: true,
    };
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops,
        routeGeometry: fallbackGeometry,
        origin: { latitude: 48.87, longitude: 2.37, source: "browser" as const },
        fr: true,
      }),
    );

    expect(markup).toContain("Itinéraire estimé · réseau indisponible");
    expect(markup).toContain('data-testid="route-line"');
  });

  it("shows FOSSGIS and OpenStreetMap attribution only for FOSSGIS network geometry", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops,
        routeGeometry: {
          ...networkGeometry,
          isLoop: true,
          provider: "fossgis-osrm",
        },
        fr: true,
      }),
    );

    expect(markup).toContain("Routage piéton FOSSGIS");
    expect(markup).toContain("https://www.openstreetmap.org");
    expect(markup).toContain("https://www.openstreetmap.org/fixthemap");
    expect(markup).toContain("Corriger la carte");

    const genericMarkup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops,
        routeGeometry: networkGeometry,
        fr: true,
      }),
    );
    expect(genericMarkup).not.toContain("Corriger la carte");
  });

  it("keeps group colors and non-color line patterns deterministic", () => {
    const groupRoutes = [groupRoute(1), groupRoute(2), groupRoute(3)];
    const colorsMarkup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        groupRoutes,
        representationMode: "colors",
        fr: true,
      }),
    );
    const patternsMarkup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        groupRoutes,
        representationMode: "patterns",
        fr: true,
      }),
    );

    expect(colorsMarkup).toContain('data-color="#34d399"');
    expect(colorsMarkup).toContain('data-color="#60a5fa"');
    expect(colorsMarkup).toContain('data-color="#fbbf24"');
    expect(patternsMarkup).toContain('data-dash="12 8"');
    expect(patternsMarkup).toContain('data-dash="3 7"');
  });

  it("keeps fallback routes visibly distinct in pattern mode", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        groupRoutes: [groupRoute(1, "fallback"), groupRoute(2, "fallback")],
        representationMode: "patterns",
        fr: true,
      }),
    );

    expect(markup).toContain('data-dash="10 10"');
    expect(markup).toContain('data-dash="12 8"');
  });

  it("can isolate one group without changing its route geometry", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        groupRoutes: [groupRoute(1), groupRoute(2), groupRoute(3)],
        selectedGroupIndex: 2,
        representationMode: "colors",
        fr: true,
      }),
    );

    expect(markup.match(/data-testid="route-line"/g)).toHaveLength(1);
    expect(markup).toContain('data-color="#60a5fa"');
    expect(markup).not.toContain('data-color="#34d399"');
    expect(markup).not.toContain('data-color="#fbbf24"');
  });

  it("renders guided sectors and ordered waypoints separately from observations", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        groupRoutes: [{
          ...groupRoute(1),
          label: "Rive gauche",
          plannedSector: { center: { latitude: 48.8566, longitude: 2.3522 }, radiusKm: 1 },
          plannedWaypoints: [{ id: "planned-1", label: "Passage école", latitude: 48.857, longitude: 2.353, order: 0 }],
        }],
        selectedGroupIndex: 1,
        fr: true,
      }),
    );

    expect(markup).toContain("Passage planifié · aucune observation");
    expect(markup).toContain("Passage école");
    expect(markup).toContain('data-testid="route-line"');
  });

  it("renders the canonical theoretical risk layer with category filters and freshness", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: networkGeometry,
        riskHeatmap,
        riskHeatmapCategory: "waste",
        fr: true,
      }),
    );

    expect(markup).toContain('data-route-risk-heatmap');
    expect(markup).toContain("Couche de risque théorique");
    expect(markup).toContain("Déchets");
    expect(markup).toContain("Mégots");
    expect(markup).toContain("Mixte");
    expect(markup).toContain("risk-v3");
    expect(markup).toContain("2026-11-04T09:00:00.000Z");
    expect(markup).toContain("Risque théorique du segment");
  });
});
