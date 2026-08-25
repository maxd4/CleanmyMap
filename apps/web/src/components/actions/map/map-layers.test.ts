import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";

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
  GeometryTooltipContent: ({
    title,
    color,
  }: {
    title: string;
    color: string;
  }) => React.createElement("div", { "data-title": title, "data-color": color }, title),
}));

import { ACTION_MAP_COLOR, resolvePointColor, ShapeLayers, SignalementMarkers } from "./map-layers";

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

describe("ShapeLayers", () => {
  function buildShapeItem(type: "action" | "spot", wasteKg: number): ActionMapItem {
    return toActionMapItem(
      buildActionDataContract({
        id: `${type}-shape`,
        type,
        status: "approved",
        source: type === "action" ? "actions" : "spots",
        observedAt: "2026-06-01",
        locationLabel: "Quai de test",
        latitude: 48.8566,
        longitude: 2.3522,
        wasteKg,
        cigaretteButts: 25,
        manualDrawing: {
          kind: "polyline",
          coordinates: [
            [48.8566, 2.3522],
            [48.8576, 2.3532],
          ],
        },
      }),
    );
  }

  it("keeps pollution colors for spots but uses sky for action traces", () => {
    const action = buildShapeItem("action", 80);
    const lowPollutionAction = buildShapeItem("action", 0);
    const spot = buildShapeItem("spot", 80);

    expect(resolvePointColor(action, null)).toBe(ACTION_MAP_COLOR);
    expect(resolvePointColor(lowPollutionAction, null)).toBe(ACTION_MAP_COLOR);
    expect(resolvePointColor(spot, null)).not.toBe(ACTION_MAP_COLOR);
  });

  it("uses the action tooltip title for polyline shapes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ShapeLayers, {
        items: [buildShapeItem("action", 80), buildShapeItem("spot", 80)],
      }),
    );

    expect(markup).toContain("Action · Longueur ~");
    expect(markup).toContain("Trace ");
    expect(markup).toContain(`data-color="${ACTION_MAP_COLOR}"`);
  });
});
