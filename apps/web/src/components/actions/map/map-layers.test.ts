import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import {
  CLEAN_PLACE_COLOR,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import { presentActionRevisitPriority } from "@/lib/actions/revisit-priority";

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
    Polyline: ({
      children,
      pathOptions,
    }: {
      children?: React.ReactNode;
      pathOptions?: { weight?: number; opacity?: number; interactive?: boolean };
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": "map-polyline",
          "data-weight": pathOptions?.weight,
          "data-opacity": pathOptions?.opacity,
          "data-interactive": pathOptions?.interactive,
        },
        children,
      ),
    Popup: passthrough,
    Tooltip: passthrough,
    useMap: () => ({ fitBounds: vi.fn() }),
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
  ActionPopupContent: ({
    onViewGeometry,
  }: {
    onViewGeometry?: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-has-view-geometry": Boolean(onViewGeometry) },
      "Popup",
    ),
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

import {
  ACTION_TRACE_HIT_AREA_WEIGHT,
  fitActionGeometryBounds,
  isTrashSpotterItem,
  resolvePointColor,
  ShapeLayers,
  SignalementMarkers,
} from "./map-layers";

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

describe("Trash Spotter layer classification", () => {
  function buildCanonicalItem(
    type: "spot" | "clean_place",
    sourceStatus: "new" | "validated" | "cleaned",
  ): ActionMapItem {
    return toActionMapItem(
      buildActionDataContract({
        id: `${type}-${sourceStatus}`,
        type,
        status: sourceStatus === "new" ? "pending" : "approved",
        source: "trash_spotter_spots",
        sourceStatus,
        observedAt: "2026-08-20",
        locationLabel: "Quai de test",
        latitude: 48.8566,
        longitude: 2.3522,
        wasteCategories: ["plastic"],
      }),
    );
  }

  it("uses the shared actionable rule instead of source or record type alone", () => {
    expect(isTrashSpotterItem(buildCanonicalItem("spot", "validated"))).toBe(true);
    expect(isTrashSpotterItem(buildCanonicalItem("spot", "new"))).toBe(false);
    expect(isTrashSpotterItem(buildCanonicalItem("spot", "cleaned"))).toBe(false);
    expect(isTrashSpotterItem(buildCanonicalItem("clean_place", "validated"))).toBe(false);
  });
});

describe("ShapeLayers", () => {
  function buildShapeItem(
    type: "action" | "spot",
    wasteKg: number,
    kind: "polyline" | "polygon" = "polyline",
  ): ActionMapItem {
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
          kind,
          coordinates:
            kind === "polygon"
              ? [
                  [48.8566, 2.3522],
                  [48.8576, 2.3522],
                  [48.8576, 2.3532],
                ]
              : [
                  [48.8566, 2.3522],
                  [48.8576, 2.3532],
                ],
        },
      }),
    );
  }

  it("uses revisit priority colors for actions and reserves green for clean places", () => {
    const action = buildShapeItem("action", 80);
    const lowPollutionAction = buildShapeItem("action", 0);
    const spot = buildShapeItem("spot", 80);
    const cleanPlace = toActionMapItem(
      buildActionDataContract({
        id: "clean-place-shape",
        type: "clean_place",
        status: "approved",
        source: "spots",
        observedAt: "2026-06-01",
        locationLabel: "Quai propre",
        latitude: 48.8566,
        longitude: 2.3522,
      }),
    );
    const now = new Date("2026-08-25T00:00:00.000Z");
    const expectedActionColor = resolveDynamicColor(
      presentActionRevisitPriority(100, "2026-06-01", now).revisitPriority,
    );

    expect(resolvePointColor(action, null, now)).toBe(expectedActionColor);
    expect(resolvePointColor(lowPollutionAction, null, now)).not.toBe(
      resolvePointColor(action, null, now),
    );
    expect(resolvePointColor(action, null, now)).not.toBe(CLEAN_PLACE_COLOR);
    expect(resolvePointColor(spot, null, now)).not.toBe(CLEAN_PLACE_COLOR);
    expect(resolvePointColor(cleanPlace, null, now)).toBe(CLEAN_PLACE_COLOR);
  });

  it("uses the action tooltip title for polyline shapes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ShapeLayers, {
        items: [buildShapeItem("action", 80), buildShapeItem("spot", 80)],
      }),
    );

    expect(markup).toContain("Action · Longueur ~");
    expect(markup).toContain("Trace ");
    expect(markup).toContain('data-color="hsl(');
  });

  it("adds an invisible wider hit-area without changing the visible stroke", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ShapeLayers, {
        items: [buildShapeItem("action", 80)],
      }),
    );

    expect(markup).toContain(`data-weight="${ACTION_TRACE_HIT_AREA_WEIGHT}"`);
    expect(markup).toContain('data-opacity="0"');
    expect(markup).toContain('data-has-view-geometry="true"');
  });

  it("keeps the explicit framing action for action polygons without adding a hit-area to spots", () => {
    const actionPolygonMarkup = renderToStaticMarkup(
      React.createElement(ShapeLayers, {
        items: [buildShapeItem("action", 80, "polygon")],
      }),
    );
    const spotMarkup = renderToStaticMarkup(
      React.createElement(ShapeLayers, {
        items: [buildShapeItem("spot", 80)],
      }),
    );

    expect(actionPolygonMarkup).toContain('data-has-view-geometry="true"');
    expect(spotMarkup).not.toContain(`data-weight="${ACTION_TRACE_HIT_AREA_WEIGHT}"`);
  });

  it("fits bounds only when the explicit view action is invoked", () => {
    const fitBounds = vi.fn();
    const map = { fitBounds };
    const positions: [number, number][] = [
      [48.8566, 2.3522],
      [48.8576, 2.3532],
    ];

    expect(fitActionGeometryBounds(map, positions)).toBe(true);
    expect(fitBounds).toHaveBeenCalledWith(positions, {
      padding: [32, 32],
      maxZoom: 16,
      animate: true,
    });
    fitBounds.mockClear();
    expect(fitActionGeometryBounds(map, [])).toBe(false);
    expect(fitBounds).not.toHaveBeenCalled();
  });
});
