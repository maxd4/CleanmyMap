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

  it("renders a distinct origin marker and reports map clicks as ephemeral origins", () => {
    const onSelectOrigin = vi.fn();
    const origin = { latitude: 48.87, longitude: 2.37, source: "map" as const };
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops: [],
        routeGeometry: {
          ...networkGeometry,
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

  it("shows FOSSGIS and OpenStreetMap attribution only for FOSSGIS network geometry", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        stops,
        routeGeometry: {
          ...networkGeometry,
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
});
