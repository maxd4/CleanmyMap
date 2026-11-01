import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import { createOperationalRouteFromRecommendation } from "@/lib/route/route-operational";

vi.mock("react-leaflet", () => {
  const Surface = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Marker = ({ children }: { children?: ReactNode }) => <span>{children}</span>;
  return {
    Circle: Surface,
    CircleMarker: Marker,
    MapContainer: Surface,
    Polyline: Surface,
    TileLayer: Surface,
    Tooltip: Surface,
    useMap: () => ({ fitBounds: vi.fn() }),
  };
});

import { OperationalRouteMap } from "./operational-route-map";

describe("OperationalRouteMap guided planning", () => {
  it("renders the two planned sectors and ordered passages separately from observations", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const origin = { latitude: 48.8445, longitude: 2.3512, source: "map" as const };
    const routeGeometry = createFallbackRouteGeometry([
      [origin.latitude, origin.longitude],
      [48.8462, 2.3464],
      [origin.latitude, origin.longitude],
    ]);
    const operationalRoute = createOperationalRouteFromRecommendation({
      generatedAt: "2026-10-01T09:00:00.000Z",
      groupCount: 2,
      routeGeometry,
      stops: [],
      guidedBudget: mode.budget,
      groupRoutes: mode.groups.map((group, index) => ({
        groupIndex: index + 1,
        label: index === 0 ? "Panthéon" : "Jardin des Plantes",
        volunteerCount: 5,
        routeGeometry,
        stops: [],
        plannedSector: group.sector,
        plannedWaypoints: group.waypoints.map((waypoint, order) => ({ ...waypoint, order })),
        guidedBudget: mode.budget,
      })),
    });

    const markup = renderToStaticMarkup(<OperationalRouteMap operationalRoute={operationalRoute} />);

    expect(markup).toContain("Secteur planifié");
    expect(markup).toContain("passage planifié");
    expect(markup).toContain("aucune observation");
    expect(markup).not.toContain("Observation observée");
  });
});
