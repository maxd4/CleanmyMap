import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";

vi.mock("react-leaflet", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);

  return {
    CircleMarker: ({
      center,
      children,
    }: {
      center?: [number, number];
      children?: React.ReactNode;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "map-marker", "data-center": center?.join(",") },
        children,
      ),
    Marker: passthrough,
    Polygon: passthrough,
    Polyline: passthrough,
    Popup: passthrough,
    Tooltip: passthrough,
  };
});

vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "marker-cluster" }, children),
}));

vi.mock("leaflet", () => ({
  divIcon: vi.fn(() => ({})),
}));

vi.mock("./action-pollution-score-references-context", () => ({
  useActionPollutionScoreReferences: () => ({ references: null }),
}));

vi.mock("./action-popup-content", () => ({
  ActionPopupContent: () => React.createElement("div", null, "Popup"),
}));

vi.mock("./map-geometry-tooltip-content", () => ({
  GeometryTooltipContent: () => React.createElement("div", null, "Geometry"),
}));

import { SignalementMarkers } from "./map-layers";

function buildGeolocatedItem(): ActionMapItem {
  return {
    id: "map-item-1",
    action_date: "2026-06-01",
    location_label: "Quai de test",
    latitude: 48.8566,
    longitude: 2.3522,
    waste_kg: 1,
    cigarette_butts: 2,
    status: "approved",
    created_by_clerk_id: null,
  };
}

describe("SignalementMarkers", () => {
  it("renders a marker for a geolocated API map item", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SignalementMarkers, {
        items: [buildGeolocatedItem()],
      }),
    );

    expect(markup).toContain('data-testid="map-marker"');
    expect(markup).toContain('data-center="48.8566,2.3522"');
  });
});
