import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";

vi.mock("react-leaflet", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);
  return {
    CircleMarker: passthrough,
    MapContainer: passthrough,
    Marker: ({
      children,
      position,
    }: {
      children?: React.ReactNode;
      position?: [number, number];
    }) =>
      React.createElement(
        "div",
        { "data-testid": "route-stop", "data-position": position?.join(",") },
        children,
      ),
    Polyline: ({
      children,
      positions,
    }: {
      children?: React.ReactNode;
      positions?: [number, number][];
    }) =>
      React.createElement(
        "div",
        { "data-testid": "route-line", "data-points": positions?.length },
        children,
      ),
    Popup: passthrough,
    TileLayer: passthrough,
    Tooltip: passthrough,
    useMap: () => ({ fitBounds: vi.fn() }),
  };
});

vi.mock("leaflet", () => ({
  divIcon: vi.fn(() => ({})),
}));

import { buildRouteMapCoordinates, RouteMap } from "./route-map";

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
  coordinates: [
    [48.85, 2.35],
    [48.855, 2.355],
    [48.86, 2.36],
  ],
  distanceKm: 1.4,
  durationMinutes: 12,
  legs: [],
  provider: "osrm",
  profile: "foot",
  mode: "network",
  estimated: false,
};

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
    expect(markup).toContain("Réseau · OSRM · profil configuré: foot");
    expect(buildRouteMapCoordinates(stops, networkGeometry)).toHaveLength(5);
  });

  it("marks a fallback route explicitly and still renders the stop line", () => {
    const fallbackGeometry: RouteGeometry = {
      ...networkGeometry,
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
        fr: true,
      }),
    );

    expect(markup).toContain("Itinéraire estimé · réseau indisponible");
    expect(markup).toContain('data-testid="route-line"');
  });
});
